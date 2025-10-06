const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("output");
const canvasCtx = canvasElement.getContext("2d");
const recordBtn = document.getElementById("recordBtn");
const statusEl = document.getElementById("status");

const { drawConnectors, drawLandmarks } = window.drawingUtils || window;

let collecting = false;
let frameData = [];
const MAX_FRAMES = 10;

// ---------------------------
// 🔹 MediaPipe Hands Setup
// ---------------------------
const hands = new Hands({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});

// ---------------------------
// 🔹 Process Each Frame
// ---------------------------
hands.onResults((results) => {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];

    // วาด landmark
    drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
      color: "#00FF00",
      lineWidth: 3,
    });
    drawLandmarks(canvasCtx, landmarks, {
      color: "#FF0000",
      lineWidth: 1,
      radius: 3,
    });

    // เก็บข้อมูลถ้ากำลังบันทึก
    if (collecting) {
      const flat = landmarks.flatMap((p) => [p.x, p.y, p.z]);
      frameData.push(flat);

      statusEl.textContent = `📸 Collecting... ${frameData.length}/${MAX_FRAMES}`;

      if (frameData.length >= MAX_FRAMES) {
        collecting = false;
        saveCSV(frameData);
        frameData = [];
        recordBtn.disabled = false;
        statusEl.textContent = "✅ บันทึกเสร็จสิ้น! กำลังอัปโหลด...";
      }
    } else {
      statusEl.textContent = "🟢 Hand detected - Ready to record";
    }
  } else {
    statusEl.textContent = "🔴 No hand detected";
  }

  canvasCtx.restore();
});

// ---------------------------
// 🔹 Save CSV + Upload to Server
// ---------------------------
function saveCSV(data) {
  const headers = Array.from({ length: 63 }, (_, i) => `p${i + 1}`).join(",");
  const csv = [headers, ...data.map((row) => row.join(","))].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const filename = `hand_landmarks_${Date.now()}.csv`;

  // 📤 Upload ไปยัง server
  const formData = new FormData();
  formData.append("csvfile", blob, filename);

fetch("https://<your-python-backend-url>.onrender.com/predict", {
  method: "POST",
  body: formData,
})
    .then((res) => res.json())
    .then((data) => {
      console.log("✅ Upload success:", data);
      statusEl.textContent = "✅ บันทึกและอัปโหลดเสร็จสิ้น!";
    })
    .catch((err) => {
      console.error("❌ Upload error:", err);
      statusEl.textContent = "❌ อัปโหลดล้มเหลว!";
    });
}

// ---------------------------
// 🔹 Camera Setup
// ---------------------------
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480,
});
camera.start();

// ---------------------------
// 🔹 Button Handler
// ---------------------------
recordBtn.addEventListener("click", () => {
  collecting = true;
  frameData = [];
  recordBtn.disabled = true;
  statusEl.textContent = "⏳ กำลังบันทึก...";
});
