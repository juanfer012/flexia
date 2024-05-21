<?php
session_start();  // Inicia la sesión al comienzo del script

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "flexia";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $stmt = $conn->prepare("SELECT id, password FROM usuarios WHERE username=?");  // Obtiene el ID del usuario
    $stmt->bind_param("s", $_POST['username']);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows == 1) {
        $row = $result->fetch_assoc();

        if (password_verify($_POST['password'], $row['password'])) {
            $_SESSION['loggedin'] = true;
            $_SESSION['username'] = $_POST['username'];
            $_SESSION['id'] = $row['id'];  // Almacena el ID del usuario en la sesión
            // Redirige a la página protegida:
            header("Location: pagina_protegida.php"); // Reemplaza con tu página real
            exit();
        } else {
            $error = "Nombre de usuario o contraseña incorrectos.";
        }
    } else {
        $error = "Nombre de usuario o contraseña incorrectos.";
    }

    $stmt->close();
}

$conn->close();
?>