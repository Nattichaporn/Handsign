import * as tf from "@tensorflow/tfjs-node";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

// ✅ นี่คือการ import ที่ถูกต้องที่สุดตามที่ Log แนะนำ
import pkg from 'papaparse';
const { parse } = pkg;

let cachedModel = null;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function predictFromCSV(csvPath) {
  try {
    const csvFile = fs.readFileSync(csvPath, "utf8");

    // เรียกใช้ฟังก์ชัน parse ที่เราเตรียมไว้
    const parsed = parse(csvFile, { header: true, dynamicTyping: true });

    // กรองข้อมูลแถวที่อาจจะว่างเปล่าออกไป
    const data = parsed.data.filter(row => Object.values(row).some(val => val !== null && val !== ''));
    if (data.length === 0) {
      console.warn("⚠️ CSV file is empty or contains no valid data.");
      return []; // คืนค่าว่างกลับไปถ้าไม่มีข้อมูล
    }

    const X = data.map(row => Object.values(row));
    const tensor = tf.tensor2d(X);

    if (!cachedModel) {
      console.log("🧠 Loading model for the first time...");
      const modelPath = path.resolve(__dirname, 'model/model.json');
      cachedModel = await tf.loadLayersModel(`file://${modelPath}`);
      console.log("✅ Model loaded successfully!");
    }

    const preds = cachedModel.predict(tensor);
    const result = preds.arraySync();

    // ลบไฟล์ CSV ทิ้งหลังใช้งานเสร็จ
    fs.unlinkSync(csvPath);
    console.log(`🗑️ Deleted temporary file: ${csvPath}`);

    return result;

  } catch (error) {
    console.error("❌ An error occurred in predictFromCSV:", error);
    // พยายามลบไฟล์ถ้ายังอยู่
    if (fs.existsSync(csvPath)) {
      fs.unlinkSync(csvPath);
    }
    throw error; // ส่ง error กลับไปให้ server จัดการต่อ
  }
}