import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.js";
import { fileUpload } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, fullname } = await req.body;
  if (
    [username, email, password, fullname].some((field) => field?.trim() === "")
  ) {
    throw new ApiError("All fields are required", 400);
  }
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (existingUser) {
    throw new ApiError("User already exists", 409);
  }
  console.log(req.files); // multer gives us req.files --- files that are actuallly uploaded
  console.log(req.files);
  const avatarLocalPath = await req.files?.avatar[0]?.path;
  //const coverImageLocalPath = await req.files?.coverImage[0]?.path; // here we are trying to access path when coveImage is not existing at all
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = await req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError("Avatar file is required", 400);
  }
  //uploading to cloudinary
  const avatar = await fileUpload(avatarLocalPath);
  const coverImage = await fileUpload(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError("Avatar file is required", 400);
  }
  /*can also await user.save()
     const user b=  new User({blah blah blah})
     await user.save() 
   */
  const user = await User.create({
    username,
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError("Something went wrong while registering user", 500);
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const genAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); //because there is noo need to validate according to my algo if the user is reaching this point it means the user is validated

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError("Soemthing went wrong when generating tokens", 500);
  }
};
const loginUser = asyncHandler(async (req, res) => {
  //check the mail and password and compare them
  // if mail or username and password matches then login success,
  // if login is success then generate acess token and refresh token
  //send the tokens as cookies

  const { username, email, password } = await req.body;
  console.log(username, email);
  if (!username && !email) {
    throw new ApiError("Email or username required", 401);
  }
  const user = await User.findOne({ $or: [{ email }, { username }] });
  if (!user) {
    throw new ApiError("User unauthorized", 401);
  }
  const verPassword = await user.comparePassword(password);
  if (!verPassword) {
    throw new ApiError("Password is wrong", 401);
  }
  // THERE IS NO ACCESS TOKEN FIELD
  // const accessToken = await user.generateAccessToken();
  // const refreshToken = await user.generateRefreshToken();
  // const completeUser = User.findByIdAndUpdate(user._id, {
  //   accessToken,
  //   refreshToken,
  // });
  //prettier-ignore
  const { accessToken, refreshToken } = await genAccessTokenAndRefreshToken(user._id);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: user,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});
const logOutUser = asyncHandler(async (req, res) => {
  //clear cookies and  remove refresh token
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        // refreshToken: undefined,
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // refreshing accessToken using already existing refreshToken and then hitting a nwe api endpoint
  try {
    const incomingRefreshToken =
      (await req.cookies.refreshToken) || (await req.body.refreshToken);
    if (!incomingRefreshToken) {
      throw new ApiResponse("Unauthorized request", 401);
    }
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiResponse("Invalid refresh token", 401);
    }
    //checking the incoming refresh token and refresh token to give user the access
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError("Refresh token may be expired or invalid", 401);
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, refreshToken: newrefreshToken } =
      await genAccessTokenAndRefreshToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, newrefreshToken },
          "new acccess and refresh tokens generated successfully"
        )
      );
  } catch (error) {
    throw new ApiError("Invalid refresh token" || error?.message, 401);
  }
});
export { registerUser, loginUser, logOutUser, refreshAccessToken };
