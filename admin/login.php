<?php
session_start();
require_once '../php/db.php';

// Check if already logged in as admin
if (isset($_SESSION['admin_id'])) {
    header("Location: dashboard.php");
    exit();
}

$response = [
    'success' => false,
    'message' => '',
    'redirect' => ''
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    // Validation
    if (empty($username) || empty($password)) {
        $response['message'] = 'Please fill in all fields.';
    } else {
        // Check admin credentials
        $stmt = $conn->prepare("SELECT id, username, password FROM admin_users WHERE username = ?");
        $stmt->execute([$username]);
        $admin = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($admin && password_verify($password, str_replace('$2b$', '$2y$', $admin['password']))) {
            $_SESSION['admin_id'] = $admin['id'];
            $_SESSION['admin_username'] = $admin['username'];

            $response['success'] = true;
            $response['message'] = 'Admin login successful!';
            $response['redirect'] = 'dashboard.php';
        } else {
            $response['message'] = 'Invalid username or password.';
        }
    }
} else {
    $response['message'] = 'Invalid request method.';
}

// Return JSON response for AJAX or redirect for form submission
if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest') {
    header('Content-Type: application/json');
    echo json_encode($response);
} else {
    if ($response['success']) {
        header("Location: " . $response['redirect']);
        exit();
    } else {
        header("Location: login.html?error=" . urlencode($response['message']));
        exit();
    }
}
?>