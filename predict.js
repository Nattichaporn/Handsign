import * as tf from "@tensorflow/tfjs-node";
import fs from "fs";
import Papa from "papaparse";
import { fileURLToPath } from "url";
import path from "path";

let cachedModel = null;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function predictFromCSV(csvPath) {
  const csvFile = fs.readFileSync(csvPath, "utf8");
  const parsed = Papa.parse(csvFile, { header: true, dynamicTyping: true });
  const data = parsed.data.filter((r) => Object.keys(r).length > 1);
  const X = data.map((row) => Object.values(row));
  const tensor = tf.tensor2d(X);
  console.log("📦 ขนาดอินพุต:", tensor.shape);

  if (!cachedModel) {
      console.log("🧠 กำลังโหลดโมเดลจากไฟล์...");
      const modelPath = path.resolve(__dirname, 'model/model.json');
      // ✅ บรรทัดสำคัญที่แก้ไขแล้ว
      cachedModel = await tf.loadLayersModel(`file://${modelPath}`); 
      console.log("✅ โหลดโมเดลสำเร็จ!");
  }

  const preds = cachedModel.predict(tensor);
  const result = preds.arraySync();
  console.log("✅ ผลลัพธ์ตัวอย่าง:", result[result.length - 1]);
  return result;
}