<?php
session_start();

// Clear all admin session variables
$_SESSION = [];

// Destroy the session
session_destroy();

// Clear session cookie if it exists
if (isset($_COOKIE[session_name()])) {
    setcookie(session_name(), '', time() - 3600, '/');
}

// Redirect to admin login page
header("Location: login.html");
exit();
?>