import { Router } from "express";
import { verifyJWT } from "../middlewares/auth";
import {
  createTweet,
  deleteTweet,
  getUserTweets,
  updateTweet,
} from "../controllers/tweet.controller";
const tweetRouter = Router();
tweetRouter.use(verifyJWT);

tweetRouter.post("/create", createTweet);
tweetRouter.get("/user-tweets", getUserTweets);
tweetRouter.patch("/update/:tweetId", updateTweet);
tweetRouter.delete("/delete/:tweetId", deleteTweet);
export { tweetRouter };
