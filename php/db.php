<?php
// Database configuration for Refundly Pay (PostgreSQL)
// Secure database connection with error handling

$host = getenv('DB_HOST') ?: 'localhost';
$dbname = getenv('DB_NAME') ?: 'refund_company';
$username = getenv('DB_USER') ?: 'postgres';
$password = getenv('DB_PASSWORD') ?: '';
$port = getenv('DB_PORT') ?: '5432';

try {
    $conn = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $username, $password);

    // Set error mode to exceptions
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Set charset to UTF8
    $conn->exec("SET NAMES 'UTF8'");

} catch (PDOException $e) {
    // Log error and show user-friendly message
    error_log("Database Error: " . $e->getMessage());
    die("Sorry, we're experiencing technical difficulties. Please try again later.");
}

// Helper function to escape strings
function escape_string($string) {
    global $conn;
    return $conn->quote($string);
}

// Helper function to get user session
function get_current_user() {
    if (!isset($_SESSION['user_id'])) {
        return false;
    }

    global $conn;
    $stmt = $conn->prepare("SELECT id, name, email FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    return $result ?: false;
}

// Helper function to check if user is logged in
function is_logged_in() {
    return isset($_SESSION['user_id']) && get_current_user() !== false;
}
?>