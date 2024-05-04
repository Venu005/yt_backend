import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.js";
import { fileUpload } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { deleteOldImage } from "../utils/deleteImage.js";
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

const changeCurrentPassword = asyncHandler(async (req, res) => {
  // get data from tokens and check if refresh token exists
  // get ids from tokens and change password
  const { oldPassword, newPassword } = await req.body;
  // if changing password then he/she is logged in so from verifyJWt  we can get user  req.user = user;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.comparePassword(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError("Invalid old password", 400);
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, "Password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { username, fullname } = await req.body;
  //MY WAY
  // const user = await User.findById(req.user?._id);
  // if (!user) {
  //   throw ApiError("User not found", 401);
  // }
  // user.username = username;
  // user.fullname = fullname;
  // await User.save({ validateBeforeSave: false });

  // can also use findByIdAndUpdate
  //OTHER APPROACH
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        username,
        fullname,
      },
    },
    {
      new: true, //  returns the updated version
    }
  ).select("-password");

  return res
    .status(200)
    .json(200, user, "Username and fullname updated successfully");
});

//TODO: to update files we should be using two middle wares multer and auth
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatar = req.user?.avatar;
  const deletedImage = await deleteOldImage(avatar.public_id);
  if (!deletedImage) {
    return new ApiError("Failed to delete the old image", 500);
  }
  //TODO: if error in avatar path updtaion change to await req.file?.path
  const newavatarLocalPath = await req.files?.avatar[0]?.path;
  if (!newavatarLocalPath) {
    return new ApiError("Avatar file is missing", 400);
  }
  const newAvatar = await fileUpload(newavatarLocalPath);
  if (!newAvatar.url) {
    return new ApiError("Avatar failed to upload to cloudinary", 400);
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: newAvatar.url, // update the url alone cause its in model
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const oldCoverImage = req.user?.coverImage;
  const deletedImage = await deleteOldImage(oldCoverImage.public_id);
  if (!deletedImage) {
    return new ApiError("Error in deleting the image", 400);
  }
  const coverImageLocalPath = await req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError("CoverImage missing", 400);
  }
  const coverImage = await fileUpload(coverImageLocalPath);
  if (!coverImage.url) {
    return new ApiError(
      "Cover image failed ehile uploading to cloudinary",
      400
    );
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "CoverImage updated successfully"));
});
export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
