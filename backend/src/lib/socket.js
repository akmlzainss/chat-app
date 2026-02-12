import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: [process.env.FRONTEND_URL || "http://localhost:5173", "http://127.0.0.1:5173"],
        credentials: true,
    },
});

export function getReceiverSocketId(userId) {
    return userSocketMap[userId];
}

// online user
const userSocketMap = {};

io.on("connection", (socket) => {
    console.log("A User connected", socket.id);

    const userId = socket.handshake.query.userId;
    if(userId) userSocketMap[userId] = socket.id;

    io.emit("getOnlineUsers", Object.keys(userSocketMap)); 

    socket.on("typing", ({ to }) => {
        const receiverSocketId = getReceiverSocketId(to);
        if (receiverSocketId) io.to(receiverSocketId).emit("userTyping", { from: userId });
    });

    socket.on("stopTyping", ({ to }) => {
        const receiverSocketId = getReceiverSocketId(to);
        if (receiverSocketId) io.to(receiverSocketId).emit("userStopTyping", { from: userId });
    });

    socket.on("messageRead", async ({ messageIds, from }) => {
        try {
            await Message.updateMany({ _id: { $in: messageIds } }, { $set: { status: "read" } });
            const senderSocketId = getReceiverSocketId(from);
            if (senderSocketId) io.to(senderSocketId).emit("messageRead", { messageIds });
        } catch (err) {
            console.error("Error marking messages as read:", err.message);
        }
    });

    socket.on("disconnect", () => {
        console.log("A User disconnected", socket.id);
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap)); 
    })
})

export { io, app, server };
