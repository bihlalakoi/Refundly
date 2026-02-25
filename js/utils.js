// Global UI Components and Utilities

// Loading Overlay
const LoadingOverlay = {
    show() {
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="loading-spinner"></div>';
            document.body.appendChild(overlay);
        }
        setTimeout(() => overlay.classList.add('active'), 10);
    },
    hide() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }
};

// Toast Notifications
const Toast = {
    container: null,

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },

    show(message, type = 'info', duration = 5000) {
        this.init();

        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        this.container.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => {
                toast.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    },

    success(message, duration) {
        return this.show(message, 'success', duration);
    },

    error(message, duration) {
        return this.show(message, 'error', duration);
    },

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    },

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
};

// Form Validation
const FormValidator = {
    patterns: {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^[\d\s\+\-\(\)]+$/,
        url: /^https?:\/\/.+/
    },

    validate(input) {
        const value = input.value.trim();
        const type = input.type;
        const required = input.hasAttribute('required');

        if (required && !value) {
            return { valid: false, message: 'This field is required' };
        }

        if (value && type === 'email' && !this.patterns.email.test(value)) {
            return { valid: false, message: 'Please enter a valid email address' };
        }

        if (value && type === 'tel' && !this.patterns.phone.test(value)) {
            return { valid: false, message: 'Please enter a valid phone number' };
        }

        if (value && type === 'url' && !this.patterns.url.test(value)) {
            return { valid: false, message: 'Please enter a valid URL' };
        }

        const minLength = input.getAttribute('minlength');
        if (value && minLength && value.length < parseInt(minLength)) {
            return { valid: false, message: `Minimum ${minLength} characters required` };
        }

        return { valid: true, message: '' };
    },

    showError(input, message) {
        input.classList.add('invalid');
        input.classList.remove('valid');

        let errorEl = input.parentElement.querySelector('.field-error');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'field-error';
            input.parentElement.appendChild(errorEl);
        }

        errorEl.textContent = message;
        errorEl.classList.add('active');
    },

    clearError(input) {
        input.classList.remove('invalid');
        input.classList.add('valid');

        const errorEl = input.parentElement.querySelector('.field-error');
        if (errorEl) {
            errorEl.classList.remove('active');
        }
    },

    validateForm(form) {
        let isValid = true;
        const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');

        inputs.forEach(input => {
            const result = this.validate(input);
            if (!result.valid) {
                this.showError(input, result.message);
                isValid = false;
            } else {
                this.clearError(input);
            }
        });

        return isValid;
    },

    attachRealTimeValidation(form) {
        const inputs = form.querySelectorAll('input, textarea, select');

        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                const result = this.validate(input);
                if (!result.valid && input.value) {
                    this.showError(input, result.message);
                } else if (result.valid) {
                    this.clearError(input);
                }
            });

            input.addEventListener('input', () => {
                if (input.classList.contains('invalid')) {
                    const result = this.validate(input);
                    if (result.valid) {
                        this.clearError(input);
                    }
                }
            });
        });
    }
};

// Smooth Scroll
function smoothScroll(target, duration = 1000) {
    const targetElement = typeof target === 'string' ? document.querySelector(target) : target;
    if (!targetElement) return;

    const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition - 80; // Account for header
    const startTime = performance.now();

    function animation(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        window.scrollTo(0, startPosition + distance * ease);

        if (progress < 1) {
            requestAnimationFrame(animation);
        }
    }

    requestAnimationFrame(animation);
}

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

let csrfTokenCache = null;

async function getCsrfToken(forceRefresh = false) {
    if (!forceRefresh && csrfTokenCache) return csrfTokenCache;
    const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'same-origin'
    });
    if (!response.ok) {
        throw new Error('Unable to initialize request security token');
    }
    const payload = await response.json();
    csrfTokenCache = payload.csrfToken;
    return csrfTokenCache;
}

async function csrfFetch(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        return fetch(url, { ...options, credentials: 'same-origin' });
    }

    const token = await getCsrfToken();
    const headers = new Headers(options.headers || {});
    headers.set('x-csrf-token', token);
    return fetch(url, {
        ...options,
        headers,
        credentials: 'same-origin'
    });
}

// Format currency
function formatCurrency(amount, currency = 'GBP') {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Format date
function formatDate(date, format = 'short') {
    const d = new Date(date);
    const options = format === 'long'
        ? { year: 'numeric', month: 'long', day: 'numeric' }
        : { year: 'numeric', month: 'short', day: 'numeric' };

    return new Intl.DateTimeFormat('en-GB', options).format(d);
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LoadingOverlay,
        Toast,
        FormValidator,
        smoothScroll,
        debounce,
        formatCurrency,
        formatDate,
        getCsrfToken,
        csrfFetch
    };
}

// Replace old icon+text brand marks with the provided full logo image.
document.addEventListener('DOMContentLoaded', () => {
    const candidateAnchors = Array.from(document.querySelectorAll('a')).filter((anchor) => {
        const text = (anchor.textContent || '').toLowerCase();
        const hasBrandText = text.includes('refundly') || text.includes('refundly');
        const hasLegacyIcon = Boolean(anchor.querySelector('i.fa-undo, i.fa-shield-alt'));
        return hasBrandText || hasLegacyIcon;
    });

    candidateAnchors.forEach((anchor) => {
        if (anchor.dataset.logoReplaced === 'true') return;
        anchor.dataset.logoReplaced = 'true';
        anchor.style.gap = '0';
        anchor.style.fontSize = '0';
        anchor.style.lineHeight = '0';

        anchor.innerHTML = `
            <img
                src="/assets/refundly-pay-logo.jpg"
                alt="Refundly Pay"
                style="height: 36px; width: auto; display: block;"
            >
        `;
    });
});
