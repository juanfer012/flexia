import {
    PoseLandmarker,
    FilesetResolver,
    DrawingUtils
  } from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";
  

  let poseLandmarker = undefined;
  let runningMode = "IMAGE";
  let enableWebcamButton;
  let webcamRunning = false;
  let countdownElement;
  let countdownTimer;
  let feedbackElement;
  let countdownInProgress = false;
  let detectionActive = false;
  const squatCountElement = document.getElementById("squatCount");
  
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
  };
  createPoseLandmarker().then(() => {
    console.log("Modelo cargado correctamente.");
    feedbackElement.textContent = "Modelo cargado correctamente.";
  }).catch(error => {
    console.log("Error al cargar el modelo:", error);
    feedbackElement.textContent = "Error al inciar la deteccion de poses"
  })
  
  const video = document.getElementById("webcam");
  const canvasElement = document.getElementById("output_canvas");
  const canvasCtx = canvasElement.getContext("2d");
  const drawingUtils = new DrawingUtils(canvasCtx);
  countdownElement = document.getElementById("countdown");
  feedbackElement = document.getElementById("feedback");
  
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
      if(video.srcObject){
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
      }
      detectionActive = false;
      webcamRunning = false;
      enableWebcamButton.innerText = "HABILITAR CAMARA";
      clearInterval(countdownTimer);
      countdownElement.textContent = "";
      countdownElement.classList.add("hidden");
      feedbackElement.textContent = "";
      countdownInProgress = false;
    } else {
      detectionActive = true;
      webcamRunning = true;
      enableWebcamButton.innerText = "DESABILITAR CAMARA";

      if(!countdownInProgress){
        countdownInProgress = true;
        startCountdown(15); // Empezar cuenta regresiva de 30 segundos
      }
      
  
      const constraints = {
        video: true
      };
  
      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
      })
      .catch(error => {
        console.error("Error al acceder a la camara:", error);
        feedbackElement.textContent = "Error al acceder a la camara."
      })
    }
  }
  
  let lastVideoTime = -1;
  let squatCounter = 0;
  let currentState = 's1';
  let stateCount = { s1: 0, s2: 0, s3: 0 }; // Contadores de estabilidad del estado
  const stabilityFrames = 5; // Número de frames para la estabilidad del estado
  
  function calculateAngle(point1, point2, vertical) {
    const deltaX = point2.x - point1.x;
    const deltaY = point2.y - point1.y;
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    return vertical ? Math.abs(angle) : angle;
  }
  
  async function predictWebcam() {
    if (runningMode === "IMAGE") {
      runningMode = "VIDEO";
      await poseLandmarker.setOptions({ runningMode: "VIDEO" });
    }
  
    const startTimeMs = performance.now();
  
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;

      if(detectionActive){
      poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  
        if (result.landmarks.length > 0) {
          const landmarks = result.landmarks[0];
  
          const shoulder = landmarks[11]; // Punto del hombro derecho
          const hip = landmarks[23]; // Punto de la cadera derecha
          const knee = landmarks[25]; // Punto de la rodilla derecha
          const ankle = landmarks[27]; // Punto del tobillo derecho
  
          const hipKneeAngle = calculateAngle(hip, knee, false);
          const shoulderHipVerticalAngle = calculateAngle(shoulder, hip, true);
          const kneeAnkleVerticalAngle = calculateAngle(knee, ankle, true);
  
          // Retroalimentación basada en ángulos
          if (shoulderHipVerticalAngle < 20) {
            feedbackElement.textContent = "Inclínate hacia adelante";
          } else if (shoulderHipVerticalAngle > 45) {
            feedbackElement.textContent = "Doble hacia atrás";
          } else if (hipKneeAngle > 50 && hipKneeAngle < 80 && currentState === 's2') {
            feedbackElement.textContent = "Baja las caderas";
          } else if (kneeAnkleVerticalAngle > 30) {
            feedbackElement.textContent = "Rodilla cayendo sobre los dedos de los pies";
          } else if (hipKneeAngle > 95) {
            feedbackElement.textContent = "Sentadillas profundas";
          } else {
            feedbackElement.textContent = "";
          }
  
          // Estado y conteo de sentadillas
          if (hipKneeAngle <= 32) {
            if (currentState !== 's1') {
              stateCount.s1++;
              if (stateCount.s1 >= stabilityFrames) {
                currentState = 's1';
                stateCount = { s1: 0, s2: 0, s3: 0 };
              }
            }
          } else if (hipKneeAngle > 35 && hipKneeAngle <= 65) {
            if (currentState !== 's2') {
              stateCount.s2++;
              if (stateCount.s2 >= stabilityFrames) {
                currentState = 's2';
                stateCount = { s1: 0, s2: 0, s3: 0 };
              }
            }
          } else if (hipKneeAngle > 75 && hipKneeAngle <= 95) {
            if (currentState !== 's3') {
              stateCount.s3++;
              if (stateCount.s3 >= stabilityFrames) {
                currentState = 's3';
                stateCount = { s1: 0, s2: 0, s3: 0 };
                squatCounter++;
                squatCountElement.textContent = `Sentadillas contadas: ${squatCounter}`;
                console.log(`Sentadillas contadas: ${squatCounter}`);
              }
            }
          }
  
          drawingUtils.drawLandmarks(landmarks, {
            radius: (data) => DrawingUtils.lerp(data.from.z, -0.15, 0.1, 5, 1),
          });
          drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);
        }
  
        canvasCtx.restore();
      });
    }
    }
  
    if (webcamRunning) {
      window.requestAnimationFrame(predictWebcam);
    }
  }
  
  function startCountdown(seconds) {
    countdownElement.classList.remove("hidden");
    let counter = seconds;
  
    countdownTimer = setInterval(() => {
      countdownElement.textContent = counter;
      counter--;
  
      if (counter < 0) {
        clearInterval(countdownTimer);

        countdownElement.style.transition = "opacity 1s ease-out";
        countdownElement.style.opacity = 0;

        setTimeout(() => {
          countdownElement.classList.add("hidden");
          countdownElement.style.opacity = 0;
          countdownElement.style.transition = "";
          countdownInProgress = false;
          detectionActive = true;
          window.requestAnimationFrame(predictWebcam);
        }, 5000);
        webcamRunning = true;
        enableWebcamButton.innerText = "DISABLE PREDICTIONS";
        window.requestAnimationFrame(predictWebcam);
      }
    }, 1000);
  }

  function adjustCanvasSize() {
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    canvasElement.width = videoWidth;
    canvasElement.height = videoHeight;
}

// Llamar a adjustCanvasSize cuando el video se cargue
video.addEventListener("loadedmetadata", adjustCanvasSize);