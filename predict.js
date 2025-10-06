// ในไฟล์ predict.js

import * as tf from "@tensorflow/tfjs-node"; // ⬅️ **สำคัญ:** ตรวจสอบว่ามี -node ต่อท้าย
import fs from "fs";
import Papa from "papaparse";
import { fileURLToPath } from "url"; // ⬅️ เพิ่ม 2 บรรทัดนี้
import path from "path";

let cachedModel = null;
const __filename = fileURLToPath(import.meta.url); // ⬅️ เพิ่มบรรทัดนี้
const __dirname = path.dirname(__filename); // ⬅️ เพิ่มบรรทัดนี้

export async function predictFromCSV(csvPath) {
  // ... (โค้ดส่วนอ่าน CSV ไม่ต้องแก้ไข) ...
  const csvFile = fs.readFileSync(csvPath, "utf8");
  const parsed = Papa.parse(csvFile, { header: true, dynamicTyping: true });
  const data = parsed.data.filter((r) => Object.keys(r).length > 1);
  const X = data.map((row) => Object.values(row));
  const tensor = tf.tensor2d(X);
  console.log("📦 ขนาดอินพุต:", tensor.shape);

  // ✅ โหลดโมเดลจากไฟล์โดยตรง (ใช้โค้ดส่วนนี้แทนของเก่า)
  if (!cachedModel) {
      console.log("🧠 กำลังโหลดโมเดลจากไฟล์...");
      const modelPath = path.resolve(__dirname, 'model/model.json');
      cachedModel = await tf.loadLayersModel(`file://${modelPath}`);
      console.log("✅ โหลดโมเดลสำเร็จ!");
  }

  // ... (โค้ดส่วนที่เหลือเหมือนเดิม) ...
  const preds = cachedModel.predict(tensor);
  const result = preds.arraySync();
  console.log("✅ ผลลัพธ์ตัวอย่าง:", result[result.length - 1]);
  return result;
}