import express from "express";
import multer from "multer";
import {
  createTransaction,
  listTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactions,
  previewImport,
  bulkDeleteTransactions,
  bulkUpdateTransactions,
  restoreTransaction,
  bulkRestoreTransactions,
  listTrash,
  permanentlyDeleteTransaction,
} from "../controllers/transactionController.js";
import { protect } from "../middleware/authMiddleware.js";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.originalname.toLowerCase().endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .csv files are accepted"));
    }
  },
});
const router = express.Router();
router.use(protect);
router.post("/import/preview", upload.single("file"), previewImport);
router.post("/import", upload.single("file"), importTransactions);
router.post("/bulk-delete", bulkDeleteTransactions);
router.post("/bulk-update", bulkUpdateTransactions);
router.post("/bulk-restore", bulkRestoreTransactions);
router.get("/trash", listTrash);
router.route("/").get(listTransactions).post(createTransaction);
router
  .route("/:id")
  .get(getTransaction)
  .put(updateTransaction)
  .delete(deleteTransaction);
router.post("/:id/restore", restoreTransaction);
router.delete("/:id/permanent", permanentlyDeleteTransaction);
export default router;
