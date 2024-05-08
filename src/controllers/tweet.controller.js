import { Tweet } from "../models/tweet.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = await req.body;
  const user = req.user;
  if (!content) {
    throw new ApiError("Content is missing", 400);
  }
  if (!user) {
    throw new ApiError("User not authenticated", 401);
  }
  const tweet = await Tweet.create({
    owner: user.username,
    content,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError("User not authenticated", 401);
  }
  const tweets = await Tweet.find({ owner: user.username });

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "User tweets fetched"));
});
const updateTweet = asyncHandler(async (req, res) => {
  const { content } = await req.body;
  const user = req.user;
  if (!user) {
    throw new ApiError("User not authenticated", 401);
  }
  if (!content) {
    throw new ApiError("Content is missing", 400);
  }
  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError("Tweet ID is missing", 400);
  }
  const tweet = Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError("User not authenticated", 401);
  }
  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError("Tweet ID is missing", 400);
  }
  const tbdTweet = await Tweet.findByIdAndDelete(tweetId, { new: true });

  return res
    .status(200)
    .json(new ApiResponse(200, tbdTweet, "Tweet deleted successfully"));
});
export { createTweet, getUserTweets, updateTweet, deleteTweet };
