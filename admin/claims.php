<?php
session_start();
require_once '../php/db.php';

// Check admin authentication
if (!isset($_SESSION['admin_id'])) {
    header("Location: login.html");
    exit();
}

$admin_id = $_SESSION['admin_id'];

// Handle status updates
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['claim_id']) && isset($_POST['status'])) {
    $claim_id = (int)$_POST['claim_id'];
    $new_status = $_POST['status'];
    $notes = trim($_POST['notes'] ?? '');

    // Update claim status
    $update_stmt = $conn->prepare(
        "UPDATE claims SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    );
    $update_stmt->execute([$new_status, $claim_id]);

    // Log status change
    $history_stmt = $conn->prepare(
        "INSERT INTO claim_history (claim_id, new_status, changed_by, notes)
         VALUES (?, ?, ?, ?)"
    );
    $history_stmt->execute([$claim_id, $new_status, $admin_id, $notes]);

    header("Location: claims.php?updated=1");
    exit();
}

// Build query based on filters
$where_conditions = [];
$params = [];
$param_types = '';

$status_filter = $_GET['status'] ?? '';
$type_filter = $_GET['type'] ?? '';
$search = $_GET['search'] ?? '';

if (!empty($status_filter)) {
    $where_conditions[] = "c.status = ?";
    $params[] = $status_filter;
    $param_types .= 's';
}

if (!empty($type_filter)) {
    $where_conditions[] = "c.claim_type = ?";
    $params[] = $type_filter;
    $param_types .= 's';
}

if (!empty($search)) {
    $where_conditions[] = "(u.name LIKE ? OR u.email LIKE ? OR c.reference_number LIKE ? OR c.id = ?)";
    $search_param = "%$search%";
    $params[] = $search_param;
    $params[] = $search_param;
    $params[] = $search_param;
    $params[] = $search;
    $param_types .= 'ssss';
}

$where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';

// Get claims with pagination
$page = max(1, (int)($_GET['page'] ?? 1));
$per_page = 20;
$offset = ($page - 1) * $per_page;

$count_query = "SELECT COUNT(*) as total FROM claims c JOIN users u ON c.user_id = u.id $where_clause";
$count_stmt = $conn->prepare($count_query);
$count_stmt->execute($params);
$total_claims = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];
$total_pages = ceil($total_claims / $per_page);

$query = "SELECT c.*, u.name as user_name, u.email as user_email
          FROM claims c
          JOIN users u ON c.user_id = u.id
          $where_clause
          ORDER BY c.created_at DESC
          LIMIT ? OFFSET ?";

$stmt = $conn->prepare($query);
$stmt->execute(array_merge($params, [$per_page, $offset]));
$claims = $stmt->fetchAll(PDO::FETCH_ASSOC);
$conn->close();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claims Management - Refundly Pay Admin</title>
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
                    <li><a href="dashboard.php"><span class="nav-icon">📊</span> Dashboard</a></li>
                    <li><a href="claims.php" class="active"><span class="nav-icon">📋</span> Claims</a></li>
                    <li><a href="users.php"><span class="nav-icon">👥</span> Users</a></li>
                    <li><a href="reports.php"><span class="nav-icon">📈</span> Reports</a></li>
                    <li><a href="settings.php"><span class="nav-icon">⚙️</span> Settings</a></li>
                </ul>
            </nav>

            <div class="admin-sidebar-footer">
                <p>Logged in as: <?php echo htmlspecialchars($_SESSION['admin_username']); ?></p>
                <a href="logout.php" class="btn btn-outline btn-small">Logout</a>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="admin-main">
            <header class="admin-header">
                <h1>Claims Management</h1>
                <div class="admin-header-actions">
                    <a href="export-claims.php" class="btn btn-outline">Export CSV</a>
                </div>
            </header>

            <?php if (isset($_GET['updated'])): ?>
                <div class="alert alert-success">
                    Claim status updated successfully!
                </div>
            <?php endif; ?>

            <!-- Filters -->
            <section class="admin-section">
                <form method="GET" class="filters-form">
                    <div class="filters-grid">
                        <div class="filter-group">
                            <label for="status">Status</label>
                            <select name="status" id="status">
                                <option value="">All Statuses</option>
                                <option value="Submitted" <?php echo $status_filter === 'Submitted' ? 'selected' : ''; ?>>Submitted</option>
                                <option value="In Review" <?php echo $status_filter === 'In Review' ? 'selected' : ''; ?>>In Review</option>
                                <option value="Approved" <?php echo $status_filter === 'Approved' ? 'selected' : ''; ?>>Approved</option>
                                <option value="Rejected" <?php echo $status_filter === 'Rejected' ? 'selected' : ''; ?>>Rejected</option>
                                <option value="Refunded" <?php echo $status_filter === 'Refunded' ? 'selected' : ''; ?>>Refunded</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label for="type">Claim Type</label>
                            <select name="type" id="type">
                                <option value="">All Types</option>
                                <option value="Flight" <?php echo $type_filter === 'Flight' ? 'selected' : ''; ?>>Flight</option>
                                <option value="Subscription" <?php echo $type_filter === 'Subscription' ? 'selected' : ''; ?>>Subscription</option>
                                <option value="Purchase" <?php echo $type_filter === 'Purchase' ? 'selected' : ''; ?>>Purchase</option>
                                <option value="Bank Fee" <?php echo $type_filter === 'Bank Fee' ? 'selected' : ''; ?>>Bank Fee</option>
                                <option value="Other" <?php echo $type_filter === 'Other' ? 'selected' : ''; ?>>Other</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label for="search">Search</label>
                            <input type="text" name="search" id="search" value="<?php echo htmlspecialchars($search); ?>"
                                   placeholder="Name, email, reference, or claim ID">
                        </div>

                        <div class="filter-actions">
                            <button type="submit" class="btn btn-primary">Filter</button>
                            <a href="claims.php" class="btn btn-outline">Clear</a>
                        </div>
                    </div>
                </form>
            </section>

            <!-- Claims Table -->
            <section class="admin-section">
                <div class="section-header">
                    <h2>Claims (<?php echo number_format($total_claims); ?> total)</h2>
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
                                <th>Reference</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($claims)): ?>
                                <tr>
                                    <td colspan="8" class="empty-row">No claims found matching your criteria</td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($claims as $claim): ?>
                                    <tr>
                                        <td>#<?php echo $claim['id']; ?></td>
                                        <td>
                                            <div class="user-info">
                                                <div class="user-name"><?php echo htmlspecialchars($claim['user_name']); ?></div>
                                                <div class="user-email"><?php echo htmlspecialchars($claim['user_email']); ?></div>
                                            </div>
                                        </td>
                                        <td><?php echo htmlspecialchars($claim['claim_type']); ?></td>
                                        <td>£<?php echo number_format($claim['amount'], 2); ?></td>
                                        <td>
                                            <span class="status-badge status-<?php echo strtolower(str_replace(' ', '-', $claim['status'])); ?>">
                                                <?php echo $claim['status']; ?>
                                            </span>
                                        </td>
                                        <td><?php echo htmlspecialchars($claim['reference_number'] ?: 'N/A'); ?></td>
                                        <td><?php echo date('d/m/Y', strtotime($claim['created_at'])); ?></td>
                                        <td>
                                            <div class="action-buttons">
                                                <a href="claim-details.php?id=<?php echo $claim['id']; ?>" class="btn btn-small">View</a>
                                                <button class="btn btn-small btn-outline" onclick="openStatusModal(<?php echo $claim['id']; ?>, '<?php echo addslashes($claim['status']); ?>')">Update</button>
                                            </div>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <?php if ($total_pages > 1): ?>
                    <div class="pagination">
                        <?php if ($page > 1): ?>
                            <a href="?page=<?php echo $page - 1; ?>&status=<?php echo urlencode($status_filter); ?>&type=<?php echo urlencode($type_filter); ?>&search=<?php echo urlencode($search); ?>" class="btn btn-outline">Previous</a>
                        <?php endif; ?>

                        <span class="page-info">Page <?php echo $page; ?> of <?php echo $total_pages; ?></span>

                        <?php if ($page < $total_pages): ?>
                            <a href="?page=<?php echo $page + 1; ?>&status=<?php echo urlencode($status_filter); ?>&type=<?php echo urlencode($type_filter); ?>&search=<?php echo urlencode($search); ?>" class="btn btn-outline">Next</a>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
            </section>
        </main>
    </div>

    <!-- Status Update Modal -->
    <div id="statusModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Update Claim Status</h3>
                <button class="modal-close" onclick="closeStatusModal()">&times;</button>
            </div>
            <form method="POST" id="statusForm">
                <input type="hidden" name="claim_id" id="modalClaimId">
                <div class="form-group">
                    <label for="status">New Status</label>
                    <select name="status" id="modalStatus" required>
                        <option value="Submitted">Submitted</option>
                        <option value="In Review">In Review</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Refunded">Refunded</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="notes">Notes (Optional)</label>
                    <textarea name="notes" id="modalNotes" rows="3" placeholder="Add any notes about this status change..."></textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-outline" onclick="closeStatusModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Status</button>
                </div>
            </form>
        </div>
    </div>

    <script src="../js/main.js"></script>
    <script src="js/admin.js"></script>
    <script>
        function openStatusModal(claimId, currentStatus) {
            document.getElementById('modalClaimId').value = claimId;
            document.getElementById('modalStatus').value = currentStatus;
            document.getElementById('modalNotes').value = '';
            document.getElementById('statusModal').style.display = 'block';
        }

        function closeStatusModal() {
            document.getElementById('statusModal').style.display = 'none';
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('statusModal');
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        }
    </script>
</body>
</html>