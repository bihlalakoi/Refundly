<?php
// RefundHelp Setup Script
// Run this once to initialize the database

echo "RefundHelp Database Setup\n";
echo "=========================\n\n";

try {
    // Database configuration - UPDATE THESE VALUES
    $host = 'db.ttutkcalibgtwdfvtpkm.supabase.co';
    $dbname = 'postgres';
    $username = 'postgres';
    $password = 'Trynsee123$';
    $port = '5432';

    echo "Connecting to database...\n";

    // Try PostgreSQL first
    try {
        $conn = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $username, $password);
        $db_type = 'PostgreSQL';
        echo "✓ Connected to PostgreSQL database\n";
    } catch (PDOException $e) {
        // Try MySQL as fallback
        try {
            $conn = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
            $db_type = 'MySQL';
            echo "✓ Connected to MySQL database\n";
        } catch (PDOException $e2) {
            die("✗ Could not connect to database. Please check your credentials and ensure the database exists.\nError: " . $e2->getMessage() . "\n");
        }
    }

    // Set error mode
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Test tables
    $tables_exist = true;
    $required_tables = ['users', 'claims', 'admin_users', 'claim_history'];

    foreach ($required_tables as $table) {
        try {
            if ($db_type === 'PostgreSQL') {
                $stmt = $conn->query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '$table')");
            } else {
                $stmt = $conn->query("SHOW TABLES LIKE '$table'");
            }
            $exists = $stmt->fetchColumn();

            if (!$exists) {
                $tables_exist = false;
                echo "✗ Table '$table' does not exist\n";
            }
        } catch (Exception $e) {
            $tables_exist = false;
            echo "✗ Error checking table '$table': " . $e->getMessage() . "\n";
        }
    }

    if ($tables_exist) {
        echo "✓ All database tables exist\n";

        // Test admin user
        $stmt = $conn->prepare("SELECT COUNT(*) FROM admin_users");
        $stmt->execute();
        $admin_count = $stmt->fetchColumn();

        if ($admin_count > 0) {
            echo "✓ Admin user exists\n";
        } else {
            echo "⚠ No admin users found. You may need to create one manually.\n";
        }

        // Test sample data
        $stmt = $conn->prepare("SELECT COUNT(*) FROM users");
        $stmt->execute();
        $user_count = $stmt->fetchColumn();

        if ($user_count > 0) {
            echo "✓ Sample user data exists\n";
        } else {
            echo "ℹ No user data found. You can register users through the website.\n";
        }

    } else {
        echo "\n⚠ Database tables are missing. Please run the appropriate schema file:\n";
        echo "   PostgreSQL: psql -U $username -d $dbname -f database_schema_postgres.sql\n";
        echo "   MySQL: mysql -u $username -p $dbname < database_schema.sql\n";
    }

    echo "\nSetup check complete!\n";

    if ($tables_exist) {
        echo "\n🎉 Your RefundHelp website should be ready to use!\n";
        echo "   - Public site: Open index.html in your browser\n";
        echo "   - Admin panel: Go to admin/login.html\n";
        echo "   - Admin login: username: admin, password: admin123\n";
    }

} catch (Exception $e) {
    echo "✗ Setup failed: " . $e->getMessage() . "\n";
    echo "\nPlease check:\n";
    echo "1. Database credentials in this file\n";
    echo "2. Database server is running\n";
    echo "3. Database '$dbname' exists\n";
    echo "4. User '$username' has access to the database\n";
}
?>