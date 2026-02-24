<?php
session_start();
require_once 'php/db.php';

// Check if user is logged in
if (!is_logged_in()) {
    header("Location: login.html?error=" . urlencode("Please login to access your dashboard."));
    exit();
}

$user = get_current_user();
$user_id = $user['id'];

// Get user's claims
$claims = [];
$stmt = $conn->prepare(
    "SELECT id, claim_type, reference_number, amount, status, created_at, updated_at
     FROM claims
     WHERE user_id = ?
     ORDER BY created_at DESC"
);
$stmt->execute([$user_id]);
$claims = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get claim statistics
$stats = [
    'total' => count($claims),
    'submitted' => 0,
    'in_review' => 0,
    'approved' => 0,
    'rejected' => 0,
    'refunded' => 0,
    'total_amount' => 0
];

foreach ($claims as $claim) {
    $stats['total_amount'] += $claim['amount'];

    switch ($claim['status']) {
        case 'Submitted':
            $stats['submitted']++;
            break;
        case 'In Review':
            $stats['in_review']++;
            break;
        case 'Approved':
            $stats['approved']++;
            break;
        case 'Rejected':
            $stats['rejected']++;
            break;
        case 'Refunded':
            $stats['refunded']++;
            break;
    }
}


?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - RefundHelp</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header class="main-header">
        <div class="container">
            <div class="logo">
                <h1>RefundHelp</h1>
            </div>
            <nav class="main-nav">
                <ul>
                    <li><a href="index.html">Home</a></li>
                    <li><a href="dashboard.php" class="active">Dashboard</a></li>
                    <li><a href="submit-claim.html">New Claim</a></li>
                    <li><a href="support.html">Support</a></li>
                    <li><a href="php/logout.php">Logout</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main>
        <section class="dashboard-section">
            <div class="container">
                <div class="dashboard-header">
                    <h2>Welcome back, <?php echo htmlspecialchars($user['name']); ?>!</h2>
                    <p>Track your refund claims and manage your account</p>
                </div>

                <?php if (isset($_GET['success'])): ?>
                    <div class="alert alert-success">
                        <?php echo htmlspecialchars($_GET['success']); ?>
                    </div>
                <?php endif; ?>

                <!-- Statistics Cards -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <div class="stat-number"><?php echo $stats['total']; ?></div>
                            <div class="stat-label">Total Claims</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">⏳</div>
                        <div class="stat-content">
                            <div class="stat-number"><?php echo $stats['in_review']; ?></div>
                            <div class="stat-label">In Review</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">✅</div>
                        <div class="stat-content">
                            <div class="stat-number"><?php echo $stats['approved']; ?></div>
                            <div class="stat-label">Approved</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-number">£<?php echo number_format($stats['total_amount'], 2); ?></div>
                            <div class="stat-label">Total Value</div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="quick-actions">
                    <h3>Quick Actions</h3>
                    <div class="action-buttons">
                        <a href="submit-claim.html" class="btn btn-primary">Submit New Claim</a>
                        <a href="profile.php" class="btn btn-secondary">Update Profile</a>
                        <a href="support.html" class="btn btn-outline">Contact Support</a>
                    </div>
                </div>

                <!-- Claims Table -->
                <div class="claims-section">
                    <div class="section-header">
                        <h3>Your Claims</h3>
                        <a href="submit-claim.html" class="btn btn-outline">New Claim</a>
                    </div>

                    <?php if (empty($claims)): ?>
                        <div class="empty-state">
                            <div class="empty-icon">📋</div>
                            <h4>No claims yet</h4>
                            <p>You haven't submitted any claims yet. Ready to get your money back?</p>
                            <a href="submit-claim.html" class="btn btn-primary">Submit Your First Claim</a>
                        </div>
                    <?php else: ?>
                        <div class="claims-table-container">
                            <table class="claims-table">
                                <thead>
                                    <tr>
                                        <th>Claim ID</th>
                                        <th>Type</th>
                                        <th>Reference</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($claims as $claim): ?>
                                        <tr>
                                            <td>#<?php echo $claim['id']; ?></td>
                                            <td><?php echo htmlspecialchars($claim['claim_type']); ?></td>
                                            <td><?php echo htmlspecialchars($claim['reference_number'] ?: 'N/A'); ?></td>
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
                                </tbody>
                            </table>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </section>
    </main>

    <footer class="main-footer">
        <div class="container">
            <div class="footer-bottom">
                <p>&copy; 2026 RefundHelp. All rights reserved.</p>
            </div>
        </div>
    </footer>

    <script src="js/main.js"></script>
</body>
</html>