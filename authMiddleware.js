import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
    const authHeader = req.header("Authorization");
    if (!authHeader) return res.status(401).json({ message: "Access denied" });

    const token = authHeader.split(" ")[1]; // 🔥 მოაშორე "Bearer"
    if (!token) return res.status(401).json({ message: "No token provided" });

    try {
        const verified = jwt.verify(token, process.env.SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(400).json({  error: error.message });
        console.log(error.name, error.message);

        if (error.name === 'JsonWebTokenError') {
            res.status(400).json({error: 'token is invalid'})
            console.log('invalid token');
            
        }
        
    }
};


export default authMiddleware;
