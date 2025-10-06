import * as tf from "@tensorflow/tfjs-node";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

// ✅ การ import ที่ถูกต้องที่สุดตามที่ Log แนะนำ
import pkg from 'papaparse';
const { parse } = pkg;

let cachedModel = null;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function predictFromCSV(csvPath) {
  try {
    const csvFile = fs.readFileSync(csvPath, "utf8");
    const parsed = parse(csvFile, { header: true, dynamicTyping: true });
    const data = parsed.data.filter(row => Object.values(row).some(val => val !== null && val !== ''));
    
    if (data.length === 0) {
      console.warn("⚠️ CSV file is empty.");
      fs.unlinkSync(csvPath); // ลบไฟล์ทิ้งแม้จะว่างเปล่า
      return [];
    }

    const X = data.map(row => Object.values(row));
    const tensor = tf.tensor2d(X);

    if (!cachedModel) {
      console.log("🧠 Loading model...");
      const modelPath = path.resolve(__dirname, 'model/model.json');
      cachedModel = await tf.loadLayersModel(`file://${modelPath}`);
      console.log("✅ Model loaded successfully!");
    }

    const preds = cachedModel.predict(tensor);
    const result = preds.arraySync();
    
    fs.unlinkSync(csvPath); // ลบไฟล์ CSV หลังใช้งาน
    return result;

  } catch (error) {
    console.error("❌ Error in predictFromCSV:", error);
    if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
    throw error;
  }
}