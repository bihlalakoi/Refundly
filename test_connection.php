<?php
// Test Supabase Database Connection
require_once 'php/db.php';

echo "<h1>RefundHelp - Database Connection Test</h1>";
echo "<style>body{font-family:Arial,sans-serif;margin:40px;} .success{color:green;} .error{color:red;} .info{color:blue;}</style>";

try {
    // Test connection
    $stmt = $conn->query("SELECT version()");
    $version = $stmt->fetchColumn();

    echo "<div class='success'>✅ Database Connection: SUCCESS</div>";
    echo "<div class='info'>📊 PostgreSQL Version: " . $version . "</div>";

    // Check if tables exist
    $tables = ['users', 'claims', 'admin_users', 'claim_history'];
    echo "<h2>📋 Table Status:</h2>";

    foreach ($tables as $table) {
        try {
            $stmt = $conn->query("SELECT COUNT(*) FROM $table");
            $count = $stmt->fetchColumn();
            echo "<div class='success'>✅ Table '$table': EXISTS ($count records)</div>";
        } catch (Exception $e) {
            echo "<div class='error'>❌ Table '$table': MISSING - " . $e->getMessage() . "</div>";
        }
    }

    // Test admin user
    try {
        $stmt = $conn->prepare("SELECT COUNT(*) FROM admin_users WHERE username = ?");
        $stmt->execute(['admin']);
        $admin_exists = $stmt->fetchColumn();

        if ($admin_exists > 0) {
            echo "<div class='success'>✅ Admin user: EXISTS</div>";
            echo "<div class='info'>🔑 Admin login: username='admin', password='admin123'</div>";
        } else {
            echo "<div class='error'>❌ Admin user: MISSING</div>";
        }
    } catch (Exception $e) {
        echo "<div class='error'>❌ Admin check failed: " . $e->getMessage() . "</div>";
    }

    echo "<h2>🎯 Next Steps:</h2>";
    echo "<ol>";
    echo "<li><a href='index.html'>🏠 Visit Home Page</a></li>";
    echo "<li><a href='register.html'>📝 Register a Test User</a></li>";
    echo "<li><a href='admin/login.html'>🔐 Login to Admin Panel</a></li>";
    echo "<li><a href='submit-claim.html'>📋 Submit a Test Claim</a></li>";
    echo "</ol>";

} catch (PDOException $e) {
    echo "<div class='error'>❌ Database Connection: FAILED</div>";
    echo "<div class='error'>Error: " . $e->getMessage() . "</div>";

    echo "<h2>🔧 Troubleshooting:</h2>";
    echo "<ul>";
    echo "<li>Check your Supabase credentials in <code>php/db.php</code></li>";
    echo "<li>Ensure your Supabase project is active</li>";
    echo "<li>Verify database password and connection details</li>";
    echo "<li>Run the PostgreSQL schema on your Supabase database</li>";
    echo "</ul>";
}
?>