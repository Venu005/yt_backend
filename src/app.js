import express from "express";
export const app = express();
import cors from "cors";
import cookieParser from "cookie-parser";
app.use(cors()); //has options too
app.use(
  express.json({
    limit: "16kb",
  })
);
app.use(
  express.urlencoded({
    extended: true, //nested objects
    limit: "16kb",
  })
);

app.use(express.static("public")); // static files from public folder
app.use(cookieParser());

import { userRouter } from "./routes/user.routes.js";
app.use("/api/v1/users", userRouter);
import { tweetRouter } from "./routes/tweet.routes.js";
app.use("/api/v1/tweets", tweetRouter);
import { commentRouter } from "./routes/comment.routes.js";
app.use("/api/v1/comments", commentRouter);
import { likeRouter } from "./routes/like.routes.js";
app.use("/api/v1/likes", likeRouter);


