import sharp from 'sharp';
import cloudinary from '../utils/cloudinary.js';
import User from '../models/user.model.js';
import Post from '../models/post.model.js';
import streamifier from 'streamifier';
import { Comment } from '../models/comment.model.js';
import { getReceiverSocketId, getIo } from '../socket/socket.js';
export const addNewPost = async (req, res) => {
    try {
        const { caption } = req.body;
        const image = req.file;
        const authorId = req.id;

        if (!image) {
            return res.status(400).json({
                message: 'Image is required',
                success: false
            });
        }

        // Validate image type
        if (!image.mimetype.startsWith('image/')) {
            return res.status(400).json({
                message: 'Only image files are allowed',
                success: false
            });
        }

        // Optimize image
        const optimizedImageBuffer = await sharp(image.buffer)
            .resize({ width: 800, height: 800, fit: 'inside' })
            .toFormat('jpeg', { quality: 80 })
            .toBuffer();

        // Upload to Cloudinary using streams (more efficient)
        const cloudResponse = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { resource_type: 'image' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            streamifier.createReadStream(optimizedImageBuffer).pipe(uploadStream);
        });

        // Create post
        const post = await Post.create({
            caption,
            image: cloudResponse.secure_url,
            author: authorId
        });

        // Update user's posts
        await User.findByIdAndUpdate(authorId, {
            $push: { posts: post._id } // Ensure this matches your schema
        });

        await post.populate({ path: 'author', select: '-password' });

        return res.status(201).json({
            message: 'New Post Added Successfuly',
            post,
            success: true,
        });

    } catch (error) {
        console.error('Error creating post:', error);
        return res.status(500).json({
            message: 'Failed to create post',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            success: false
        });
    }
}
export const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate({ path: 'author', select: 'username profilePicture' })
            .populate({
                path: 'comment',
                options: { sort: { createdAt: -1 } },
                populate: {
                    path: 'author',
                    select: 'username profilePicture'
                }
            });

        return res.status(200).json({
            message: "Posts fetched successfully",
            success: true,
            posts,
        });
    } catch (error) {
        console.error("Error fetching posts:", error.message);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};

export const getUserPosts = async (req, res) => {
    try {
        const authorId = req.user?.id || req.id;

        const posts = await Post.find({ author: authorId })
            .sort({ createdAt: -1 })
            .populate({
                path: 'author',
                select: 'username profilePicture',
            })
            .populate({
                path: 'comment',
                options: { sort: { createdAt: -1 } },
                populate: {
                    path: 'author',
                    select: 'username profilePicture'
                }
            });

        return res.status(200).json({
            success: true,
            posts,
        });

    } catch (error) {
        console.error("Error fetching user posts:", error.message);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};

export const likePost = async (req, res) => {
    try {
        const userId = req.id;
        const postId = req.params.id;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found", success: false });
        }

        await post.updateOne({ $addToSet: { likes: userId } }); // Prevent duplicates
        await post.save();

        const user = await User.findById(userId).select("username profilePicture");
        const postOwnerId = post.author.toString();

        if (postOwnerId !== userId) {
            const notification = {
                type: 'like',
                userId,
                userDetails: user,
                postId,
                message: 'Your post was liked',
            };

            const postOwnerSocketId = getReceiverSocketId(postOwnerId);
            const io = getIo();
            if (postOwnerSocketId && io) {
                io.to(postOwnerSocketId).emit("notification", notification);
            }
        }

        return res.status(200).json({ message: "Post liked successfully", success: true });
    } catch (error) {
        console.error("Error liking post:", error.message);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const disLikePost = async (req, res) => {
    try {
        const userId = req.id;
        const postId = req.params.id;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found", success: false });
        }

        await post.updateOne({ $pull: { likes: userId } }); // Remove the like if exists
        await post.save();

        const user = await User.findById(userId).select("username profilePicture");
        const postOwnerId = post.author.toString();

        if (postOwnerId !== userId) {
            const notification = {
                type: 'dislike',
                userId,
                userDetails: user,
                postId,
                message: 'User disliked your post',
            };

            const postOwnerSocketId = getReceiverSocketId(postOwnerId);
            const io = getIo();
            if (postOwnerSocketId && io) {
                io.to(postOwnerSocketId).emit("notification", notification);
            }
        }

        return res.status(200).json({ message: "Post disliked successfully", success: true });
    } catch (error) {
        console.error("Error disliking post:", error.message);
        return res.status(500).json({ message: "Internal server error", success: false });
    }
};

export const addComment = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.id;
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                message: "Comment text is required",
                success: false
            });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post not found",
                success: false
            });
        }

        const comment = await Comment.create({
            text,
            author: userId,
            post: postId
        });

        await comment.populate('author', 'username profilePicture');

        post.comment.push(comment._id);
        await post.save();

        return res.status(201).json({
            message: "Comment added",
            success: true,
            comment
        });

    } catch (error) {
        console.error("Error adding comment:", error.message);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        });
    }
};

export const getCommentPost = async (req, res) => {
    try {
        const postId = req.params.id;

        const comments = await Comment.find({ post: postId })
            .sort({ createdAt: -1 })
            .populate('author', 'username profilePicture');

        if (comments.length === 0) {
            return res.status(404).json({ message: "No comments found for this post", success: false });
        }

        return res.status(200).json({ success: true, comments });

    } catch (error) {
        console.error("Error fetching comments:", error.message);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};

export const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const authorId = req.id;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found", success: false });
        }

        if (post.author.toString() !== authorId) {
            return res.status(403).json({
                message: "You are not authorized to delete this post",
                success: false,
            });
        }

        await Post.findByIdAndDelete(postId);

        const user = await User.findById(authorId);
        user.posts = (user.posts || []).filter((p) => p.toString() !== postId);
        await user.save();

        await Comment.deleteMany({ post: postId });

        return res.status(200).json({
            message: "Post deleted successfully",
            success: true,
        });
    } catch (error) {
        console.error("Error deleting post:", error.message);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};

export const bookmarkPost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.id;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post not found",
                success: false,
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false,
            });
        }

        if (user.bookmarks.includes(postId)) {
            await User.updateOne({ _id: userId }, { $pull: { bookmarks: postId } });
            return res.status(200).json({
                type: "unsave",
                message: "Post removed from bookmarks",
                success: true,
            });
        } else {
            await User.updateOne({ _id: userId }, { $addToSet: { bookmarks: postId } });
            return res.status(200).json({
                type: "save",
                message: "Post bookmarked successfully",
                success: true,
            });
        }
    } catch (error) {
        console.error("Error bookmarking post:", error.message);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};
