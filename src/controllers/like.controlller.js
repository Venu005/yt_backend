import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.js";
import { Like } from "../models/like.js";
import { Tweet } from "../models/tweet.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError("Invalid video ID", 400);
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError("Video not found", 404);
  }
  const user = req.user;
  if (!user) {
    throw new ApiError("User not authenticated", 401);
  }
  const like = await Like.findById({ video: videoId, likedBy: user?._id });
  if (!like) {
    const newLike = await Like.create({
      video: videoId,
      likedBy: user._id,
    });
    if (!newLike) {
      throw new ApiError("Failed to like video", 500);
    }
    return res
      .status(200)
      .json(new ApiResponse(200, newLike, "Video liked successfully"));
  }
  const deletedLike = await Like.findByIdAndDelete(like._id);
  if (!deletedLike) {
    throw new ApiError("Failed to unlike video", 500);
  }
  return res
    .status(200)
    .json(new ApiResponse(200, deletedLike, "Video unliked successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!commentId) {
    throw new ApiError("Invalid comment ID", 400);
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError("Comment not found", 404);
  }
  const user = req.user;
  if (!user) {
    throw new ApiError("User not authenticated", 401);
  }
  const liked = await Like.findOne({ comment: commentId, likedBy: user?._id });
  if (!liked) {
    const newLike = await Like.create({
      comment: commentId,
      likedBy: user._id,
    });
    if (!newLike) {
      throw new ApiError("Failed to like comment", 500);
    }
    return res
      .status(200)
      .json(new ApiResponse(200, newLike, "Comment liked successfully"));
  }
  const deleteLike = await Like.findByIdAndDelete(liked._id);
  if (!deleteLike) {
    throw new ApiError("Failed to unlike comment", 500);
  }
  return res
    .status(200)
    .json(new ApiResponse(200, deleteLike, "Comment unliked successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError("Invalid tweet ID", 400);
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError("Tweet not found", 404);
  }
  const user = req.user;
  if (!user) {
    throw new ApiError("User not authenticated", 401);
  }
  const liked = await Like.findOne({ tweet: tweetId, likedBy: user?._id });
  if (!liked) {
    const newLIked = await Like.create({
      tweet: tweetId,
      likedBy: user._id, // fixed error here owner to likedBy
    });
    if (!newLIked) {
      throw new ApiError("Failed to like tweet", 500);
    }
    return res
      .status(200)
      .json(new ApiResponse(200, newLIked, "Tweet liked successfully"));
  }
  const dislike = await Like.findByIdAndDelete(liked._id); //change from findByIdAndDelete
  if (!dislike) {
    throw new ApiError("Failed to unlike tweet", 500);
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet unliked successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    throw new ApiError("User not authenticated", 401);
  }
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
          {
            $project: {
              title: 1,
              description: 1,
              owner: 1,
              createdAt: 1,
              videoUrl: 1,
              thumbnails: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        video: "$video",
      },
    },
  ]);
  if (!likedVideos || likedVideos.length === 0) {
    throw new ApiError("Failed to fetch liked videos", 500);
  }
  return res
    .status(200)
    .json(new ApiResponse(200, likedVideos, "Liked videos fetched"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
