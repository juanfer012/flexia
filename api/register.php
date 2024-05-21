<?php
session_start();  // Inicia la sesión al comienzo

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "flexia";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Verifica si el nombre de usuario ya existe
    $stmt = $conn->prepare("SELECT id FROM usuarios WHERE username = ?");
    $stmt->bind_param("s", $_POST['username']);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $error = "El nombre de usuario ya está en uso.";
    } else {
        // Verifica si el correo electrónico ya existe
        $stmt = $conn->prepare("SELECT id FROM usuarios WHERE email = ?");
        $stmt->bind_param("s", $_POST['email']);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $error = "El correo electrónico ya está en uso.";
        } else {
            // Procede con el registro si no hay conflictos
            $stmt = $conn->prepare("INSERT INTO usuarios (username, password, email) VALUES (?, ?, ?)");
            $stmt->bind_param("sss", $username, $password, $email);

            $username = $_POST['username'];
            $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
            $email = $_POST['email'];
            $stmt->execute();

            // Inicia sesión automáticamente después del registro exitoso
            $_SESSION['loggedin'] = true;
            $_SESSION['username'] = $username;
            $_SESSION['id'] = $conn->insert_id; // Obtén el ID del usuario recién insertado

            // Redirige a la página protegida:
            header("Location: ./openpose/api/index.php"); // Reemplaza con tu página real
            exit();
        }
    }
}

$conn->close();
?>