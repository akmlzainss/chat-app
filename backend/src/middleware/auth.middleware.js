import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import coockiePrser from "cookie-parser";

export const protectRoute = async (req, res, next) => {
    try {
        const token = req.cookies.jwt

        if (!token) {
            return res.status(401).json({message: "Unauthorized, no token"});
        }


    } catch (error) {
        dwa
    }
}