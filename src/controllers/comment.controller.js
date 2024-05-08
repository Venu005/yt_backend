import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comments.js";
import { Video } from "../models/video.js";
import mongoose from "mongoose";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: add likes too
  const { videoId } = await req.params;
  if (!videoId) {
    throw new ApiError("Video ID is missing", 400);
  }
  const { page = 1, limit = 10 } = req.query;
  const video = await Video.findById({ _id: videoId });
  if (!video) {
    throw new ApiError("Video not found", 401);
  }
  const comments = await Comment.aggregate([
    {
      $match: {
        video: mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
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
        content: 1,
        createdAt: 1,
        owner: {
          username: 1,
          avatar: 1,
        },
      },
    },
  ]);
  const aggregateComments = Comment.aggregatePaginate(comments, {
    page,
    limit,
  });
  if (!aggregateComments || aggregateComments.length === 0) {
    throw new ApiError("No comments found", 404);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, aggregateComments, "Comments fetched"));
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError("Video ID is missing", 400);
  }
  const { content } = req.body;
  if (!content) {
    throw new ApiError("Content is missing", 400);
  }
  const video = await Video.findById({ _id: videoId });
  if (!video) {
    throw new ApiError("Video not found", 404);
  }
  const user = req.user;
  if (!user) {
    throw new ApiError("User not authenticated", 401);
  }
  const comments = await Comment.create({
    content,
    video: videoId, // stroing video id na
    owner: user,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comment created successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { videoId, commentId } = req.params;
  if (!videoId) {
    throw new ApiError("Video ID is missing", 400);
  }
  const { content } = req.body;
  if (!content) {
    throw new ApiError("Content is missing", 400);
  }

  const video = await Video.findById({ _id: videoId });
  if (!video) {
    throw new ApiError("Video not found", 404);
  }

  const user = req.user;
  if (!user) {
    throw new ApiError("User not authenticated", 401);
  }
  const comment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  );
  if (!comment) {
    throw new ApiError("Error in updating a comment", 500);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { videoId, commentId } = req.params;
  if (!videoId) {
    throw new ApiError("Video ID is missing", 400);
  }
  if (!commentId) {
    throw new ApiError("Comment ID is missing", 400);
  }
  const video = await Video.findById({ _id: videoId });
  if (!video) {
    throw new ApiError("Video not found", 404);
  }
  const user = req.user;
  if (!user) {
    throw new ApiError("User not authenticated", 401);
  }
  const tbdComment = await Comment.findByIdAndDelete(commentId, {
    new: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, tbdComment, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
