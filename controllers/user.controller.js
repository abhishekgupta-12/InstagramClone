import User from "../models/user.model.js";
import Post from '../models/post.model.js';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauril.js";
import cloudinary from "cloudinary";

export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Something is wrong, please check your input",
                success: false,
            });
        }

        // Check if username already exists
        const existingUsername = await User.findOne({ username });
        if (existingUsername) {
            return res.status(409).json({
                message: "Username already taken, try another",
                success: false,
            });
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(409).json({
                message: "Email already registered, try another",
                success: false,
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
        });

        await newUser.save();

        return res.status(201).json({
            message: "Account created successfully",
            success: true,
        });

    } catch (error) {
        // Handle duplicate key error (extra safety)
        if (error.code === 11000) {
            const duplicatedField = Object.keys(error.keyPattern)[0];
            return res.status(409).json({
                message: `${duplicatedField} already exists, please try another`,
                success: false,
            });
        }

        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Something is wrong, please check",
                success: false,
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                message: "User not found, please register",
                success: false,
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).json({
                message: "Invalid credentials, please try again",
                success: false,
            });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

        // Fetch only valid posts
        const populatePost = await Post.find({ _id: { $in: user.posts } });

        const userData = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            posts: populatePost,
        };

        return res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        }).json({
            message: `Welcome back ${user.username}`,
            success: true,
            user: userData,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};


export const logout = async (req, res) => {
    try {
        return res.cookie("token", "", { maxAge: 0, httpOnly: true, sameSite: 'strict' }).json({
            message: "Logged out successfully",
            success: true,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).populate({path:'posts',createdAt:-1}).populate('bookmarks')

        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false
            });
        }

        return res.status(200).json({
            user,
            success: true,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};
export const editProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { bio, gender } = req.body;
        const profilePicture = req.file;
        let cloudResponse;

        if (profilePicture) {
            const fileUri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileUri); // fixed here
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false,
            });
        }

        if (bio) user.bio = bio;
        if (gender) user.gender = gender;
        if (cloudResponse) user.profilePicture = cloudResponse.secure_url;

        await user.save();

        return res.status(200).json({
            message: "Profile updated successfully",
            success: true,
            user,
        });
    } catch (error) {
        console.error("editProfile error:", error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};

export const getSuggestedUsers = async (req, res) => {
    try {
        const suggestedUsers = await User.find({ _id: { $ne: req.id } })
            .select("-password -__v")
            .limit(10);

        return res.status(200).json({
            message: "Suggested users fetched successfully",
            success: true,
            users: suggestedUsers,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};

export const followOrUnfollow = async (req, res) => {
    try {
        const userId = req.id;
        const targetUserId = req.params.id;

        if (userId === targetUserId) {
            return res.status(400).json({
                message: "You cannot follow or unfollow yourself",
                success: false,
            });
        }

        const user = await User.findById(userId);
        const targetUser = await User.findById(targetUserId);

        if (!user || !targetUser) {
            return res.status(404).json({
                message: "User not found",
                success: false,
            });
        }

        const isFollowing = user.following.includes(targetUserId);

        if (isFollowing) {
            await Promise.all([
                User.updateOne({ _id: userId }, { $pull: { following: targetUserId } }),
                User.updateOne({ _id: targetUserId }, { $pull: { followers: userId } }),
            ]);
            return res.status(200).json({
                message: "Unfollowed successfully",
                success: true,
            });
        } else {
            await Promise.all([
                User.updateOne({ _id: userId }, { $push: { following: targetUserId } }),
                User.updateOne({ _id: targetUserId }, { $push: { followers: userId } }),
            ]);
            return res.status(200).json({
                message: "Followed successfully",
                success: true,
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
};
