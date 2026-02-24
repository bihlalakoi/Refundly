// Admin Panel JavaScript
// Handles admin-specific functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize admin features
    initializeAdmin();
});

function initializeAdmin() {
    // Add any admin-specific initializations here

    // Confirm dangerous actions
    const dangerousButtons = document.querySelectorAll('[data-confirm]');
    dangerousButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const message = this.getAttribute('data-confirm');
            if (!confirm(message)) {
                e.preventDefault();
            }
        });
    });

    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => {
                alert.style.display = 'none';
            }, 300);
        }, 5000);
    });

    // Filter form enhancements
    const filterForm = document.querySelector('.filters-form');
    if (filterForm) {
        const inputs = filterForm.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', function() {
                // Auto-submit form on filter change (optional)
                // filterForm.submit();
            });
        });
    }
}

// Utility functions for admin panel
function formatCurrency(amount) {
    return '£' + parseFloat(amount).toFixed(2);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<span>${message}</span>`;

    const container = document.querySelector('.admin-main') || document.body;
    container.insertBefore(alertDiv, container.firstChild);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => {
            alertDiv.remove();
        }, 300);
    }, 5000);
}

// Export functionality
function exportToCSV(data, filename) {
    const csvContent = data.map(row =>
        row.map(field => `"${field}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}