import jwt from "jsonwebtoken";
const isAuthenticated = (req, res, next) => {
    try {
        const token =req.cookies.token;

        if(!token){
            return res.status(401).json({
                message: "User Not Authenticated",
                success: false,
            });
        }
        const decoded= jwt.verify(token, process.env.JWT_SECRET);
        if(!decoded){
            return res.status(401).json({
                message: "Invalid Token",
                success: false,
            });
        }
       req.id=decoded.userId;
       next();
    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(401).json({
            message: "Unauthorized access",
            success: false,
        });
    }
}

export default isAuthenticated;