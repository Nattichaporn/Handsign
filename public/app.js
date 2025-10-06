// --- องค์ประกอบหน้าเว็บ ---
const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("output");
const canvasCtx = canvasElement.getContext("2d");
const statusEl = document.getElementById("status");
const predictedLetterEl = document.getElementById("predicted-letter");
const currentWordEl = document.getElementById("current-word");

// --- ตัวแปรสำหรับจัดการสถานะ ---
let currentWord = "";
let lastPrediction = "?";
let lastCaptureTime = 0;
const CAPTURE_COOLDOWN = 1000; // 1 วินาที

// **สำคัญ:** แก้ไข URL นี้ให้เป็น URL ของ Backend บน Render.com ของคุณ
const API_ENDPOINT = "https://handsign-33az.onrender.com/upload"; 

// **สำคัญ:** รายชื่อตัวอักษรที่โมเดลของคุณทายได้ (ต้องเรียงลำดับให้ถูกต้อง)
const ALPHABET_MAP = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];


// --- MediaPipe Hands Setup (อัปเดตให้รองรับ 2 มือ) ---
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`,
});

hands.setOptions({
  maxNumHands: 2, // ⬅️ เปลี่ยนเป็น 2 มือ
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
    let signHand = null;
    let controlHand = null;

    // แยกมือซ้าย-ขวา
    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
      const classification = results.multiHandedness[i];
      const landmarks = results.multiHandLandmarks[i];
      
      // วาดเส้นบนมือ
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#FFFFFF', lineWidth: 5 });
      drawLandmarks(canvasCtx, landmarks, { color: '#00FF00', lineWidth: 2 });
      
      // สมมติ: มือซ้ายทำท่า, มือขวาควบคุม
      if (classification.label === 'Left') {
        signHand = landmarks;
      } else if (classification.label === 'Right') {
        controlHand = landmarks;
      }
    }

    // ถ้ามีมือสำหรับทำท่า (มือซ้าย)
    if (signHand) {
      predictInRealtime(signHand);
    }
    
    // ถ้ามีมือสำหรับควบคุม (มือขวา) และเป็นท่ากำมือ
    if (controlHand && isFist(controlHand)) {
      captureLetter();
    }

  } else {
    statusEl.textContent = "No hand detected";
  }

  canvasCtx.restore();
});


// --- ฟังก์ชันใหม่: ส่งข้อมูลไปทายผลแบบ Real-time ---
let isPredicting = false;
async function predictInRealtime(landmarks) {
  if (isPredicting) return; // ป้องกันการส่งข้อมูลซ้ำซ้อน
  isPredicting = true;
  statusEl.textContent = "🧠 Analyzing...";

  // แปลง Landmarks เป็นแถวเดียวของ CSV
  const flatLandmarks = landmarks.flatMap(lm => [lm.x, lm.y, lm.z]);
  const headers = Array.from({ length: 63 }, (_, i) => `p${i + 1}`).join(",");
  const csvRow = flatLandmarks.join(",");
  const csvContent = `${headers}\n${csvRow}`;
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const formData = new FormData();
  formData.append("csvfile", blob, "realtime.csv");

  try {
    const response = await fetch(API_ENDPOINT, { method: "POST", body: formData });
    const result = await response.json();
    
    // หาค่าความน่าจะเป็นที่สูงสุด
    const predictionScores = result[0];
    const maxScoreIndex = predictionScores.indexOf(Math.max(...predictionScores));
    
    // แปลงเป็นตัวอักษร
    lastPrediction = ALPHABET_MAP[maxScoreIndex] || "?";
    predictedLetterEl.textContent = lastPrediction;
    statusEl.textContent = "🟢 Ready";

  } catch (error) {
    console.error("Prediction Error:", error);
    statusEl.textContent = "❌ Prediction Failed";
  } finally {
    // กำหนดดีเลย์เล็กน้อยก่อนการทายผลครั้งถัดไป
    setTimeout(() => { isPredicting = false; }, 200);
  }
}

// --- ฟังก์ชันใหม่: ตรวจจับท่า "กำมือ" (แบบง่าย) ---
function isFist(landmarks) {
    // หลักการ: วัดระยะห่างระหว่างปลายนิ้วกับฝ่ามือ
    const palmBase = landmarks[0]; 
    const fingerTips = [landmarks[8], landmarks[12], landmarks[16], landmarks[20]]; // ปลายนิ้วชี้, กลาง, นาง, ก้อย
    
    let totalDistance = 0;
    for (const tip of fingerTips) {
        const distance = Math.sqrt(
            Math.pow(tip.x - palmBase.x, 2) +
            Math.pow(tip.y - palmBase.y, 2) +
            Math.pow(tip.z - palmBase.z, 2)
        );
        totalDistance += distance;
    }
    
    // ค่าเฉลี่ยระยะห่าง (ปรับค่า 0.15 ได้ตามความเหมาะสม)
    return (totalDistance / fingerTips.length) < 0.15;
}


// --- ฟังก์ชันใหม่: ยืนยันตัวอักษรและReset ---
function captureLetter() {
  const now = Date.now();
  if (now - lastCaptureTime > CAPTURE_COOLDOWN) {
      if (lastPrediction !== "?") {
        currentWord += lastPrediction;
        currentWordEl.textContent = currentWord;
      }
      // ถ้าต้องการให้การกำมือเป็นการ Reset ด้วย ให้เพิ่มโค้ดนี้:
      // currentWord = ""; // ล้างคำทั้งหมด
      
      lastCaptureTime = now; // ป้องกันการกดรัวๆ
      statusEl.textContent = `✅ Captured: ${lastPrediction}`;
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