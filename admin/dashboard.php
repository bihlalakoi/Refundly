<?php
session_start();
require_once '../php/db.php';

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    header("Location: login.html");
    exit();
}

$admin_username = $_SESSION['admin_username'];

// Get dashboard statistics
$stats = [
    'total_claims' => 0,
    'pending_claims' => 0,
    'approved_claims' => 0,
    'rejected_claims' => 0,
    'refunded_claims' => 0,
    'total_users' => 0,
    'total_value' => 0
];

// Get claims statistics
$claims_query = "SELECT
    COUNT(*) as total,
    SUM(CASE WHEN status = 'Submitted' THEN 1 ELSE 0 END) as submitted,
    SUM(CASE WHEN status = 'In Review' THEN 1 ELSE 0 END) as in_review,
    SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
    SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
    SUM(CASE WHEN status = 'Refunded' THEN 1 ELSE 0 END) as refunded,
    COALESCE(SUM(amount), 0) as total_value
    FROM claims";

$claims_result = $conn->query($claims_query);
if ($claims_result) {
    $claims_data = $claims_result->fetch(PDO::FETCH_ASSOC);
    $stats['total_claims'] = $claims_data['total'];
    $stats['pending_claims'] = $claims_data['submitted'] + $claims_data['in_review'];
    $stats['approved_claims'] = $claims_data['approved'];
    $stats['rejected_claims'] = $claims_data['rejected'];
    $stats['refunded_claims'] = $claims_data['refunded'];
    $stats['total_value'] = $claims_data['total_value'] ?: 0;
}

// Get users count
$users_query = "SELECT COUNT(*) as total FROM users";
$users_result = $conn->query($users_query);
if ($users_result) {
    $stats['total_users'] = $users_result->fetch(PDO::FETCH_ASSOC)['total'];
}

// Get recent claims
$recent_claims = [];
$recent_query = "SELECT c.id, c.claim_type, c.amount, c.status, c.created_at,
                        u.name as user_name, u.email
                 FROM claims c
                 JOIN users u ON c.user_id = u.id
                 ORDER BY c.created_at DESC LIMIT 10";

$recent_result = $conn->query($recent_query);
$recent_claims = $recent_result->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Refundly Pay</title>
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="css/admin.css">
</head>
<body>
    <div class="admin-layout">
        <!-- Sidebar -->
        <aside class="admin-sidebar">
            <div class="admin-sidebar-header">
                <h2>Refundly Pay</h2>
                <span class="admin-badge">Admin Panel</span>
            </div>

            <nav class="admin-nav">
                <ul>
                    <li><a href="dashboard.php" class="active"><span class="nav-icon">📊</span> Dashboard</a></li>
                    <li><a href="claims.php"><span class="nav-icon">📋</span> Claims</a></li>
                    <li><a href="users.php"><span class="nav-icon">👥</span> Users</a></li>
                    <li><a href="reports.php"><span class="nav-icon">📈</span> Reports</a></li>
                    <li><a href="settings.php"><span class="nav-icon">⚙️</span> Settings</a></li>
                </ul>
            </nav>

            <div class="admin-sidebar-footer">
                <p>Logged in as: <?php echo htmlspecialchars($admin_username); ?></p>
                <a href="logout.php" class="btn btn-outline btn-small">Logout</a>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="admin-main">
            <header class="admin-header">
                <h1>Dashboard Overview</h1>
                <div class="admin-header-actions">
                    <a href="../index.html" class="btn btn-outline" target="_blank">View Public Site</a>
                </div>
            </header>

            <!-- Statistics Cards -->
            <section class="admin-stats">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">📋</div>
                        <div class="stat-content">
                            <div class="stat-number"><?php echo number_format($stats['total_claims']); ?></div>
                            <div class="stat-label">Total Claims</div>
                        </div>
                    </div>

                    <div class="stat-card stat-warning">
                        <div class="stat-icon">⏳</div>
                        <div class="stat-content">
                            <div class="stat-number"><?php echo number_format($stats['pending_claims']); ?></div>
                            <div class="stat-label">Pending Review</div>
                        </div>
                    </div>

                    <div class="stat-card stat-success">
                        <div class="stat-icon">✅</div>
                        <div class="stat-content">
                            <div class="stat-number"><?php echo number_format($stats['approved_claims']); ?></div>
                            <div class="stat-label">Approved</div>
                        </div>
                    </div>

                    <div class="stat-card stat-info">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-number">£<?php echo number_format($stats['total_value'], 2); ?></div>
                            <div class="stat-label">Total Value</div>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">👥</div>
                        <div class="stat-content">
                            <div class="stat-number"><?php echo number_format($stats['total_users']); ?></div>
                            <div class="stat-label">Registered Users</div>
                        </div>
                    </div>

                    <div class="stat-card stat-primary">
                        <div class="stat-icon">🎯</div>
                        <div class="stat-content">
                            <div class="stat-number"><?php echo $stats['total_claims'] > 0 ? round(($stats['refunded_claims'] / $stats['total_claims']) * 100) : 0; ?>%</div>
                            <div class="stat-label">Success Rate</div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Recent Activity -->
            <section class="admin-section">
                <div class="section-header">
                    <h2>Recent Claims</h2>
                    <a href="claims.php" class="btn btn-outline">View All Claims</a>
                </div>

                <div class="admin-table-container">
                    <table class="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>User</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($recent_claims)): ?>
                                <tr>
                                    <td colspan="7" class="empty-row">No claims found</td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($recent_claims as $claim): ?>
                                    <tr>
                                        <td>#<?php echo $claim['id']; ?></td>
                                        <td><?php echo htmlspecialchars($claim['user_name']); ?></td>
                                        <td><?php echo htmlspecialchars($claim['claim_type']); ?></td>
                                        <td>£<?php echo number_format($claim['amount'], 2); ?></td>
                                        <td>
                                            <span class="status-badge status-<?php echo strtolower(str_replace(' ', '-', $claim['status'])); ?>">
                                                <?php echo $claim['status']; ?>
                                            </span>
                                        </td>
                                        <td><?php echo date('d/m/Y', strtotime($claim['created_at'])); ?></td>
                                        <td>
                                            <a href="claim-details.php?id=<?php echo $claim['id']; ?>" class="btn btn-small">View</a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- Quick Actions -->
            <section class="admin-section">
                <h2>Quick Actions</h2>
                <div class="quick-actions-grid">
                    <a href="claims.php?status=Submitted" class="action-card">
                        <div class="action-icon">📋</div>
                        <div class="action-content">
                            <h3>Review New Claims</h3>
                            <p>Process submitted claims awaiting review</p>
                        </div>
                    </a>

                    <a href="users.php" class="action-card">
                        <div class="action-icon">👥</div>
                        <div class="action-content">
                            <h3>Manage Users</h3>
                            <p>View and manage user accounts</p>
                        </div>
                    </a>

                    <a href="reports.php" class="action-card">
                        <div class="action-icon">📈</div>
                        <div class="action-content">
                            <h3>Generate Reports</h3>
                            <p>Create detailed business reports</p>
                        </div>
                    </a>

                    <a href="settings.php" class="action-card">
                        <div class="action-icon">⚙️</div>
                        <div class="action-content">
                            <h3>System Settings</h3>
                            <p>Configure system preferences</p>
                        </div>
                    </a>
                </div>
            </section>
        </main>
    </div>

    <script src="../js/main.js"></script>
    <script src="js/admin.js"></script>
</body>
</html>