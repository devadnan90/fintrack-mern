import express from "express";
import { reportClientError } from "../controllers/clientErrorController.js";
const router = express.Router();
router.post("/", reportClientError);
export default router;
