<?php
session_start();

if(!isset($_SESSION['loggedin']) || $_SESSION['loggedin'] !== true){
  header("Location: ../index.html");
  exit();
}else{
  header("Location: ./openpose/index.html");
}

