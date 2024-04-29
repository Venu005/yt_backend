// check if the user is there or not helpful for login

import { User } from "../models/user.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      (await req.cookies?.accessToken) ||
      req.header("Authorization")?.replace("Bearer ", ""); // you can also get cookies from req.header("Authorization")
    if (!token) {
      throw new ApiError("Unauthorized request", 401);
    }
    const decodedToken = await jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError("User access token invalid", 401);
    }
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(error?.message || "Invalid access token", 401);
  }
});
