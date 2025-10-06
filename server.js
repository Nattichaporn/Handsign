import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { predictFromCSV } from "./predict.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(__dirname)); // ให้เข้าถึงไฟล์ทั้งหมดจาก root ได้ (เช่น index.html)
app.use(express.json());

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Endpoint สำหรับทำนายผล (สำคัญมาก ต้องเป็น /predict)
app.post("/predict", upload.single("csvfile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file was uploaded." });
  }
  
  try {
    const prediction = await predictFromCSV(req.file.path);
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: "Failed to process prediction." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});