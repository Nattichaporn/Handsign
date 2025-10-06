import * as tf from "@tensorflow/tfjs-node";
import fs from "fs";
// ✅ นี่คือส่วนที่แก้ไขให้ถูกต้องตามที่ Log แนะนำ
import pkg from 'papaparse';
const { parse } = pkg;
// -----------------------------------------
import { fileURLToPath } from "url";
import path from "path";

let cachedModel = null;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function predictFromCSV(csvPath) {
  try {
    const csvFile = fs.readFileSync(csvPath, "utf8");
    
    // เรียกใช้ parse() ที่เรา import มาอย่างถูกต้อง
    const parsed = parse(csvFile, { header: true, dynamicTyping: true });
    
    const data = parsed.data.filter((r) => Object.keys(r).length > 1 && Object.values(r).some(v => v !== null && v !== ''));
    if (data.length === 0) {
      console.log("⚠️ CSV contains no valid data rows after filtering.");
      return [];
    }
    
    const X = data.map((row) => Object.values(row));
    const tensor = tf.tensor2d(X);

    if (!cachedModel) {
        console.log("🧠 Loading model from file...");
        const modelPath = path.resolve(__dirname, 'model/model.json');
        cachedModel = await tf.loadLayersModel(`file://${modelPath}`);
        console.log("✅ Model loaded successfully!");
    }

    const preds = cachedModel.predict(tensor);
    const result = preds.arraySync();
    
    // ลบไฟล์ CSV ทิ้งหลังจากใช้งานเสร็จ
    fs.unlinkSync(csvPath);
    
    return result;

  } catch (error) {
    console.error("❌ Error inside predictFromCSV:", error);
    // หากมีข้อผิดพลาด ให้พยายามลบไฟล์ CSV ที่อัปโหลดมาด้วย
    if (fs.existsSync(csvPath)) {
      fs.unlinkSync(csvPath);
    }
    throw error; // ส่ง error ต่อไปให้ server.js จัดการ
  }
}