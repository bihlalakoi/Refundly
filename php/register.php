<?php
session_start();
require_once 'db.php';

$response = [
    'success' => false,
    'message' => '',
    'redirect' => ''
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';
    $phone = trim($_POST['phone'] ?? '');

    // Validation
    $errors = [];

    if (empty($name)) {
        $errors[] = 'Please enter your name.';
    }

    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Please enter a valid email address.';
    }

    if (strlen($password) < 6) {
        $errors[] = 'Password must be at least 6 characters long.';
    }

    if ($password !== $confirm_password) {
        $errors[] = 'Passwords do not match.';
    }

    // Check if email already exists
    if (empty($errors)) {
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $existing_user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing_user) {
            $errors[] = 'An account with this email already exists.';
        }
    }

    if (empty($errors)) {
        // Hash password
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        // Insert new user
        $stmt = $conn->prepare(
            "INSERT INTO users (name, email, password, phone)
             VALUES (?, ?, ?, ?)"
        );

        if ($stmt->execute([$name, $email, $hashed_password, $phone])) {
            // Get the new user ID and log them in
            $user_id = $conn->lastInsertId();
            $_SESSION['user_id'] = $user_id;
            $_SESSION['user_name'] = $name;

            $response['success'] = true;
            $response['message'] = 'Account created successfully! Welcome to RefundHelp.';
            $response['redirect'] = '../dashboard.php';
        } else {
            $response['message'] = 'Failed to create account. Please try again.';
        }
    } else {
        $response['message'] = implode(' ', $errors);
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
        header("Location: ../register.html?error=" . urlencode($response['message']));
        exit();
    }
}
?>