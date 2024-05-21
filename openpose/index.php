<?php
session_start();

if(!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true){
  header("Location: ../index.html");
  exit();
}
?>

<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Contador de Sentadillas</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <div id="container">
      <h1>Deteccion</h1>
      <div id="videoView">
        <video id="webcam" autoplay playsinline></video>
        <canvas id="output_canvas"></canvas>
        <div id="countdown" class="hidden"></div>
      </div>
      <div id="controls">
        <button id="webcamButton">Habilitar Cámara</button>
        <div id="feedback"></div>
        <div>
          <label for="repGoal">Objetivo de Repeticiones:</label>
          <input type="number" id="repGoal" value="10" />
        </div>
        <div id="squatCount">Sentadillas completadas: 0</div>
      </div>
    </div>
    <script type="module" src="main2.js"></script>
  </body>
</html>
