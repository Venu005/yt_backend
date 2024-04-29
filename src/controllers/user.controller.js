import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.js";
import { fileUpload } from "../utils/cloudinary.js";
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, fullname } = await req.body;
  if (
    [username, email, password, fullname].some((field) => field?.trim() === "")
  ) {
    throw new ApiError("All fields are required", 400);
  }
  const existingUser = await existingUser.findOne({
    $or: [{ email }, { username }],
  });
  if (existingUser) {
    throw new ApiError("User already exists", 409);
  }
  console.log(req.files); // multer gives us req.files --- files that are actuallly uploaded
  const avatarLocalPath = await req.files?.avatar[0]?.path;
  const coverImageLocalPath = await req.files?.coverImage[0]?.path;
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

export { registerUser };
