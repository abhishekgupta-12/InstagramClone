import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauril.js";
export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Something is wrong, please check your input",
                success: false,
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                message: "User already exists, try with another email",
                success: false,
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

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

        user = {
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePicture: user.profilePicture,
            bio: user.bio,
            followers: user.followers,
            following: user.following,
            post: user.post,
        }
        const token = jwt.sign(
            { userId: user._id },
            process.env.SECRET_KEY,
            { expiresIn: '1d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
        }).json({
            message: `Welcome back ${user.username}`,
            success: true,
            user,
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
        return res.cookie("token", "", { maxAge: 0, httpOnly: true, sameSite: 'strict' }).jeson({
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
}

export const getProfile = async (req, res) => {
    try {
        const userId = req.params.id;;
        let user = await User.findById(userId);
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
}

export const editProfile = async (req, res) => {
    try {
        const userId = req.id;
        const { bio, gender } = req.body;
        const profilePicture = req.file;
        let cloudResponse;

        if (profilePicture) {
            const fileUri = getDataUri(profilePicture);
            cloudResponse = await cloudinary.uploader.upload(fileUri);
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
                success: false,
            });
        }

        if(bio) user.bio = bio;
        if(gender)user.gender=gender;
        if(profilePicture)user.profilePicture = cloudResponse.secure_url;

        await user.save();
        return res.status(200).json({
            message: "Profile updated successfully",
            success: true,
            user,
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false,
        });
    }
}

const getSuggestedUsers = async (req,res) => {
    try {
        const suggestedUser=await User.find({ _id: { $ne: req.id } }).select("-password -__v").limit(10);
        if(!suggestedUser || suggestedUser.length === 0) {
            return res.status(404).json({
                message: "No suggested users found",
                success: false,
            });
        }
        return res.status(200).json({
            message: "Suggested users fetched successfully",
            success: true,
            suggestedUser,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
           // message: "Internal server error",
            success: false,
            user:suggestedUser,
        });
        
    }
}


const followOrUnfollow = async (req, res) => {
   try {
        const userId = req.id;//it is the id of the user who is logged in i am abhishek my account is login i want to follow or unfollow someone pople like simran
        const targetUserId = req.params.id;//it is the id of the user to be followed or unfollowed  thi is simran is we open and we want to follow or unfollow her account
       if(userId === targetUserId) {
            return res.status(400).json({
                message: "You cannot follow or unfollow yourself",
                success: false,
            });
        }
        const user = await User.findById(userId);
        const targetUser = await User.findById(targetUserId);

        if(!user || !targetUser){
            return res.status(404).json({
                message: "User not found",
                success: false,
            });
        }

        //ham chek karemb following and unfollowing logic

        const isFollowing = user.following.includes(targetUserId);
        if(isFollowing){
            // Unfollow logic
            await Promise.all([
                User.UpdateOne({id:userId},{ $pull: { following: targetUserId } }),
                User.UpdateOne({id:targetUserId},{ $pull: { followers: userId } })
            ])
            return res.status(200).json({
                message: "Unfollowed successfully",
                success: true,
            });
        }
        else {
            await Promise.all([
                User.UpdateOne({id:userId},{ $push: { following: targetUserId } }),
                User.UpdateOne({id:targetUserId},{ $push: { followers: userId } })
            ])
             return res.status(200).json({
                message: "followed successfully", 
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
}