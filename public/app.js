// --- องค์ประกอบหน้าเว็บ ---
const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("output");
const canvasCtx = canvasElement.getContext("2d");
const statusEl = document.getElementById("status");
const predictedLetterEl = document.getElementById("predicted-letter");
const sentenceEl = document.getElementById("sentence"); // ⬅️ เพิ่มตัวแปรนี้

// --- ตัวแปรสำหรับจัดการสถานะ ---
let isPredicting = false;
let currentSentence = ""; // ⬅️ เพิ่มตัวแปรสำหรับเก็บประโยค
let lastAddedLetter = ""; // ⬅️ เพิ่มตัวแปรสำหรับจำตัวอักษรล่าสุด

// 🚨 **สำคัญ:** แก้ไข URL นี้ให้เป็น URL ของ Backend บน Render.com ของคุณ
const API_ENDPOINT = "https://handsign-33az.onrender.com/upload";

// 🚨 **สำคัญ:** รายชื่อตัวอักษรที่โมเดลของคุณทายได้
const ALPHABET_MAP = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I','J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

// ... (ส่วน MediaPipe Hands Setup เหมือนเดิม) ...
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`,
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});

// ... (ส่วน hands.onResults เหมือนเดิม) ...
hands.onResults((results) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#FFFFFF', lineWidth: 5 });
        drawLandmarks(canvasCtx, landmarks, { color: '#00FF00', lineWidth: 2 });
        predictInRealtime(landmarks);
    } else {
        statusEl.textContent = "ไม่พบมือในกล้อง";
        predictedLetterEl.textContent = "?";
    }
    canvasCtx.restore();
});


// --- ฟังก์ชัน predictInRealtime (อัปเดตแล้ว) ---
async function predictInRealtime(landmarks) {
  if (isPredicting) return; 
  isPredicting = true;
  statusEl.textContent = "🧠 กำลังวิเคราะห์...";

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
    
    const predictionScores = result[0];
    const maxScoreIndex = predictionScores.indexOf(Math.max(...predictionScores));
    const predictedLetter = ALPHABET_MAP[maxScoreIndex] || "?";
    
    predictedLetterEl.textContent = predictedLetter;
    
    // ✨ **ส่วนที่เพิ่มเข้ามา: ต่อตัวอักษรเป็นประโยค**
    if (predictedLetter !== "?" && predictedLetter !== lastAddedLetter) {
        currentSentence += predictedLetter;
        sentenceEl.textContent = currentSentence;
        lastAddedLetter = predictedLetter; // อัปเดตตัวอักษรล่าสุดที่เพิ่มไป
    }
    
    statusEl.textContent = "🟢 กำลังตรวจจับ...";

  } catch (error) {
    console.error("Prediction Error:", error);
    statusEl.textContent = "❌ เกิดข้อผิดพลาดในการวิเคราะห์";
  } finally {
    setTimeout(() => { isPredicting = false; }, 500); // ⬅️ เพิ่มดีเลย์เป็น 0.5 วินาที
  }
}

// ... (ส่วน Camera Setup เหมือนเดิม) ...
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480,
});
camera.start();