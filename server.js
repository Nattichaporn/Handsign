import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { predictFromCSV } from "./predict.js"; // ฟังก์ชันพรีดิกโมเดล

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// ✅ เสิร์ฟโฟลเดอร์ model ให้เข้าถึงโมเดลผ่าน HTTP ได้
app.use("/model", express.static(path.join(__dirname, "model")));

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ตั้งค่า multer สำหรับอัปโหลด CSV
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({ storage });

// ...
// 📥 Endpoint รับ CSV ที่อัปโหลด
app.post("/predict", upload.single("csvfile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = path.join(uploadDir, req.file.filename);
    console.log("📁 Received CSV:", filePath);

    // ✅ เรียกพรีดิกจากไฟล์ CSV
    const prediction = await predictFromCSV(filePath);

    res.json({
      success: true,
      file: req.file.filename,
      result: prediction
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
