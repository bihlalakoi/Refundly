<?php
session_start();
require_once 'db.php';

// Initialize response array
$response = [
    'success' => false,
    'message' => '',
    'redirect' => ''
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    // Validation
    if (empty($email) || empty($password)) {
        $response['message'] = 'Please fill in all fields.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $response['message'] = 'Please enter a valid email address.';
    } else {
        // Check user credentials
        $stmt = $conn->prepare("SELECT id, name, email, password FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            if (password_verify($password, $user['password'])) {
                // Successful login
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_name'] = $user['name'];

                $response['success'] = true;
                $response['message'] = 'Login successful!';
                $response['redirect'] = '../dashboard.php';
            } else {
                $response['message'] = 'Invalid email or password.';
            }
        } else {
            $response['message'] = 'Invalid email or password.';
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
        // Redirect back to login with error
        header("Location: ../login.html?error=" . urlencode($response['message']));
        exit();
    }
}
?>