// --- องค์ประกอบหน้าเว็บ ---
const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("output");
const canvasCtx = canvasElement.getContext("2d");
const statusEl = document.getElementById("status");
const predictedLetterEl = document.getElementById("predicted-letter");

// --- ตัวแปรสำหรับจัดการสถานะ ---
let isPredicting = false; // ป้องกันการส่งข้อมูลซ้ำซ้อนเร็วเกินไป

// 🚨 **สำคัญ:** แก้ไข URL นี้ให้เป็น URL ของ Backend บน Render.com ของคุณ
const API_ENDPOINT = "https://handsign-33az.onrender.com/upload"; 

// 🚨 **สำคัญ:** รายชื่อตัวอักษรที่โมเดลของคุณทายได้ (ต้องเรียงลำดับให้ถูกต้อง!)
// ตัวอย่าง: ถ้าโมเดลทายเลข 0 หมายถึง A, เลข 1 หมายถึง B
const ALPHABET_MAP = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];


// --- MediaPipe Hands Setup ---
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});

// --- ฟังก์ชันหลัก: ประมวลผลทุกเฟรมจากกล้อง ---
hands.onResults((results) => {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  // ถ้าตรวจพบมือ
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    
    // วาดเส้นบนมือ
    drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#FFFFFF', lineWidth: 5 });
    drawLandmarks(canvasCtx, landmarks, { color: '#00FF00', lineWidth: 2 });
    
    // 🧠 ส่งข้อมูลไปทายผลแบบ Real-time
    predictInRealtime(landmarks);

  } else {
    statusEl.textContent = "ไม่พบมือในกล้อง";
    predictedLetterEl.textContent = "?";
  }

  canvasCtx.restore();
});


// --- ฟังก์ชันใหม่: ส่งข้อมูลไปทายผลแบบ Real-time ---
async function predictInRealtime(landmarks) {
  // ถ้ากำลังทายผลอยู่ ให้ข้ามไปก่อน เพื่อไม่ให้ส่งข้อมูลถี่เกินไป
  if (isPredicting) return; 
  
  isPredicting = true;
  statusEl.textContent = "🧠 กำลังวิเคราะห์...";

  // แปลง Landmarks เป็นแถวเดียวของ CSV
  // (เหมือนตอนเก็บข้อมูล แต่ทำแค่เฟรมเดียว)
  const flatLandmarks = landmarks.flatMap(lm => [lm.x, lm.y, lm.z]);
  const headers = Array.from({ length: 63 }, (_, i) => `p${i + 1}`).join(",");
  const csvRow = flatLandmarks.join(",");
  const csvContent = `${headers}\n${csvRow}`;
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const formData = new FormData();
  formData.append("csvfile", blob, "realtime.csv");

  try {
    const response = await fetch(API_ENDPOINT, { method: "POST", body: formData });
    if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
    }
    const result = await response.json();
    
    // หาค่าความน่าจะเป็นที่สูงสุดจากผลลัพธ์
    const predictionScores = result[0];
    const maxScoreIndex = predictionScores.indexOf(Math.max(...predictionScores));
    
    // แปลงเป็นตัวอักษรจาก MAP ที่เรากำหนดไว้
    const predictedLetter = ALPHABET_MAP[maxScoreIndex] || "?";
    predictedLetterEl.textContent = predictedLetter;
    statusEl.textContent = "🟢 กำลังตรวจจับ...";

  } catch (error) {
    console.error("Prediction Error:", error);
    statusEl.textContent = "❌ เกิดข้อผิดพลาดในการวิเคราะห์";
  } finally {
    // กำหนดดีเลย์เล็กน้อยก่อนการทายผลครั้งถัดไป เพื่อลดภาระเซิร์ฟเวอร์
    setTimeout(() => { isPredicting = false; }, 300); // 0.3 วินาที
  }
}

// --- Camera Setup (เหมือนเดิม) ---
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480,
});
camera.start();