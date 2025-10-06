import * as tf from "@tensorflow/tfjs-node";
import fs from "fs";
import pkg from 'papaparse'; // ⬅️ บรรทัดที่ 1: Import ตัว Library หลักเข้ามาก่อน
const { parse } = pkg;       // ⬅️ บรรทัดที่ 2: ดึงฟังก์ชัน parse ออกมาจาก Library นั้น 
import { fileURLToPath } from "url";
import path from "path";

let cachedModel = null;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function predictFromCSV(csvPath) {
  const csvFile = fs.readFileSync(csvPath, "utf8");
  const parsed = parse(csvFile, { header: true, dynamicTyping: true }); // ⬅️ เรียกใช้ parse() ตรงๆ
  const data = parsed.data.filter((r) => Object.keys(r).length > 1);
  const X = data.map((row) => Object.values(row));
  const tensor = tf.tensor2d(X);

  if (!cachedModel) {
      console.log("🧠 Loading model from file...");
      const modelPath = path.resolve(__dirname, 'model/model.json');
      // ✅ **บรรทัดสำคัญ:** ต้องเป็น file://${modelPath}
      cachedModel = await tf.loadLayersModel(`file://${modelPath}`);
      console.log("✅ Model loaded successfully!");
  }

  const preds = cachedModel.predict(tensor);
  const result = preds.arraySync();
  return result;
}