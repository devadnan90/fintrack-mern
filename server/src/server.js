import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import connectDB from "./config/db.js";
import { startScheduler } from "./utils/scheduler.js";
const PORT = process.env.PORT || 5000;
async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(
        `FinTrack API listening on port ${PORT} (${process.env.NODE_ENV || "development"})`,
      );
    });
    startScheduler();
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}
start();
