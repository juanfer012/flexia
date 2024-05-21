import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";

const demosSection = document.getElementById("liveView");

let poseLandmarker = undefined;
let runningMode = "IMAGE";
let enableWebcamButton;
let webcamRunning = false;
let countdownElement;
let countdownTimer;

const createPoseLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
      delegate: "GPU"
    },
    runningMode: runningMode,
    numPoses: 1
  });
  demosSection.classList.remove("invisible");
};
createPoseLandmarker();

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const drawingUtils = new DrawingUtils(canvasCtx);
countdownElement = document.getElementById("countdown");

const hasGetUserMedia = () => {
  return !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
};

if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

function enableCam(event) {
  if (!poseLandmarker) {
    console.log("Wait! poseLandmarker not loaded yet.");
    return;
  }

  if (webcamRunning) {
    webcamRunning = false;
    enableWebcamButton.innerText = "ENABLE PREDICTIONS";
    clearInterval(countdownTimer);
    countdownElement.classList.add("hidden");
  } else {
    webcamRunning = true;
    enableWebcamButton.innerText = "DISABLE PREDICTIONS";
    startCountdown(30); // Empezar cuenta regresiva de 30 segundos

    const constraints = {
      video: true
    };

    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      video.srcObject = stream;
      video.addEventListener("loadeddata", predictWebcam);
    });
  }
}

let lastVideoTime = -1;
let squatCounter = 0;
let currentState = 's1';
let stateCount = { s1: 0, s2: 0, s3: 0 }; // Contadores de estabilidad del estado
const stabilityFrames = 5; // Número de frames para la estabilidad del estado

function calculateAngle(point1, point2) {
  const deltaX = point2.x - point1.x;
  const deltaY = point2.y - point1.y;
  const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
  return Math.abs(angle); // Devolvemos el valor absoluto del ángulo
}

async function predictWebcam() {
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await poseLandmarker.setOptions({ runningMode: "VIDEO" });
  }

  const startTimeMs = performance.now();

  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;

    poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      if (result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];

        const hip = landmarks[11]; // Punto de la cadera derecha
        const knee = landmarks[13]; // Punto de la rodilla derecha

        const verticalPoint = { x: hip.x, y: 1 }; // Punto vertical sobre la cadera

        const angle = calculateAngle(hip, knee);

        if (angle <= 32) {
          if (currentState !== 's1') {
            stateCount.s1++;
            if (stateCount.s1 >= stabilityFrames) {
              currentState = 's1';
              stateCount = { s1: 0, s2: 0, s3: 0 };
            }
          }
        } else if (angle > 35 && angle <= 65) {
          if (currentState !== 's2') {
            stateCount.s2++;
            if (stateCount.s2 >= stabilityFrames) {
              currentState = 's2';
              stateCount = { s1: 0, s2: 0, s3: 0 };
            }
          }
        } else if (angle > 75 && angle <= 95) {
          if (currentState !== 's3') {
            stateCount.s3++;
            if (stateCount.s3 >= stabilityFrames) {
              if (currentState === 's2') {
                squatCounter++;
                console.log(`Squat count: ${squatCounter}`);
              }
              currentState = 's3';
              stateCount = { s1: 0, s2: 0, s3: 0 };
            }
          }
        }

        drawingUtils.drawLandmarks(landmarks, {
          radius: function(data) {
            return DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1);
          }
        });
        drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);
      }

      canvasCtx.restore();
    });
  }

  if (webcamRunning) {
    window.requestAnimationFrame(predictWebcam);
  }
}

function startCountdown(seconds) {
  let counter = seconds;
  countdownElement.textContent = counter;
  countdownElement.classList.remove("hidden");

  countdownTimer = setInterval(() => {
    counter--;
    countdownElement.textContent = counter;

    if(counter <= 0){
      clearInterval(countdownTimer);
      countdownElement.classList.add("hidden");
      enableWebcamButton.innerText = "DESACTIVAR CAMARA";

      webcamRunning = true;
      window.requestAnimationFrame(predictWebcam);
    }
  }, 1000);
}

