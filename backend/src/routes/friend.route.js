import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { listFriends, discoverUsers, sendRequest, acceptRequest, rejectRequest, removeFriend } from "../controllers/friend.controller.js";

const router = express.Router();

router.get("/list", protectRoute, listFriends);
router.get("/discover", protectRoute, discoverUsers);
router.post("/request/:id", protectRoute, sendRequest);
router.post("/accept/:id", protectRoute, acceptRequest);
router.post("/reject/:id", protectRoute, rejectRequest);
router.post("/remove/:id", protectRoute, removeFriend);

export default router;