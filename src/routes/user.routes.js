import { Router } from "express";
import {
  logOutUser,
  loginUser,
  refreshAccessToken,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.js";
import { verifyJWT } from "../middlewares/auth.js";

const userRouter = Router();

userRouter.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 3,
    },
  ]),
  registerUser
);
userRouter.route("/login").post(loginUser);
userRouter.route("/logout").post(verifyJWT, logOutUser);
userRouter.route("/refresh-token").post(refreshAccessToken)

export { userRouter };
