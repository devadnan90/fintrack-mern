import express from "express";
import {
  listHouseholds,
  createHousehold,
  deleteHousehold,
  leaveHousehold,
  removeMember,
  inviteMember,
  listMyInvites,
  acceptInvite,
} from "../controllers/householdController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(protect);
router.get("/invites/mine", listMyInvites);
router.post("/accept", acceptInvite);
router.get("/", listHouseholds);
router.post("/", createHousehold);
router.delete("/:id", deleteHousehold);
router.post("/:id/leave", leaveHousehold);
router.delete("/:id/members/:userId", removeMember);
router.post("/:id/invites", inviteMember);
export default router;
