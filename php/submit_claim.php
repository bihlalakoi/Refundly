<?php
session_start();
require_once 'db.php';

// Check if user is logged in
if (!is_logged_in()) {
    header("Location: ../login.html?error=" . urlencode("Please login to submit a claim."));
    exit();
}

$response = [
    'success' => false,
    'message' => '',
    'claim_id' => null
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user_id = $_SESSION['user_id'];
    $claim_type = trim($_POST['claim_type'] ?? '');
    $reference_number = trim($_POST['reference'] ?? '');
    $amount = floatval($_POST['amount'] ?? 0);
    $description = trim($_POST['description'] ?? '');

    // Validation
    $errors = [];

    if (empty($claim_type)) {
        $errors[] = 'Please select a claim type.';
    }

    if ($amount <= 0) {
        $errors[] = 'Please enter a valid amount greater than 0.';
    }

    // Handle file upload
    $proof_file = '';
    if (isset($_FILES['proof']) && $_FILES['proof']['error'] === UPLOAD_ERR_OK) {
        $allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        $max_size = 5 * 1024 * 1024; // 5MB

        $file_type = $_FILES['proof']['type'];
        $file_size = $_FILES['proof']['size'];

        if (!in_array($file_type, $allowed_types)) {
            $errors[] = 'Invalid file type. Only JPG, PNG, GIF, and PDF files are allowed.';
        } elseif ($file_size > $max_size) {
            $errors[] = 'File size too large. Maximum size is 5MB.';
        } else {
            // Generate unique filename
            $file_extension = pathinfo($_FILES['proof']['name'], PATHINFO_EXTENSION);
            $proof_file = uniqid('proof_', true) . '.' . $file_extension;

            // Move file to uploads directory
            $upload_path = '../uploads/' . $proof_file;
            if (!move_uploaded_file($_FILES['proof']['tmp_name'], $upload_path)) {
                $errors[] = 'Failed to upload file. Please try again.';
            }
        }
    } else {
        $errors[] = 'Please upload proof of your claim.';
    }

    if (empty($errors)) {
        // Insert claim into database
        $stmt = $conn->prepare(
            "INSERT INTO claims (user_id, claim_type, reference_number, amount, proof_file, description, status)
             VALUES (?, ?, ?, ?, ?, ?, 'Submitted')"
        );

        if ($stmt->execute([$user_id, $claim_type, $reference_number, $amount, $proof_file, $description])) {
            $claim_id = $conn->lastInsertId();
            $response['success'] = true;
            $response['message'] = 'Your claim has been submitted successfully! Claim ID: #' . $claim_id;
            $response['claim_id'] = $claim_id;
        } else {
            $response['message'] = 'Failed to submit claim. Please try again.';
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
        header("Location: ../dashboard.php?success=" . urlencode($response['message']));
    } else {
        header("Location: ../submit-claim.html?error=" . urlencode($response['message']));
    }
    exit();
}
?>