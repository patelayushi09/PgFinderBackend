const jwt = require("jsonwebtoken");
require("dotenv").config();

const authenticateToken = (requiredRole) => {
    return (req, res, next) => {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ error: true, message: "Token not found" });
        }

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ error: true, message: "Invalid token" });
            }
            //console.log("Decoded User:", user); // Debugging line
            // console.log("Expected Role:", requiredRole);// Debugging line

            if (user.role !== requiredRole) {
                return res.status(403).json({ error: true, message: "Unauthorized" });
            }

            req.user = user; // Attach user  to request
            next();
        });
    };
};

module.exports = {
    authenticateToken,
};
