# RefundHelp - Professional Refund Claim Website

A complete, professional refund claim service website built with PHP, MySQL, HTML, CSS, and JavaScript. This is a legitimate refund service platform where users can submit claims for flight refunds, subscription cancellations, purchase returns, and bank fee recoveries.

## 🎨 Design Features

- **Professional Color Scheme**: #0D0A0B, #454955, #F3EFF5, #72B01D, #3F7D20
- **Mobile-Responsive**: Works perfectly on all devices
- **Trust-Focused Design**: Clear messaging, professional appearance
- **Accessible**: WCAG compliant design patterns

## 🚀 Features

### Public Features
- ✅ User registration and secure login
- ✅ Claim submission with file uploads
- ✅ Real-time claim status tracking
- ✅ Professional dashboard
- ✅ Mobile-friendly interface
- ✅ Secure file handling (proof uploads)

### Admin Features
- 🔐 Secure admin panel
- 📊 Comprehensive dashboard with statistics
- 📋 Full claims management (view, filter, update status)
- 👥 User management
- 📈 Reports and analytics
- 🔄 Status change tracking with history
- 📧 Export functionality

### Business Features
- 💰 Success fee model (no win, no fee)
- 🛡️ Secure data handling
- 📱 Mobile-first design
- 🌐 Professional branding
- 📋 Legal compliance ready

## 🛠️ Technology Stack

**Option 1: Node.js (Recommended)**
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Supabase)
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Security**: bcrypt, sessions, file validation

**Option 2: PHP**
- **Backend**: PHP 7.4+ with PDO (supports PostgreSQL/MySQL)
- **Database**: PostgreSQL 12+ or MySQL 5.7+
- **Security**: Password hashing, prepared statements, file validation

**Common Features:**
- **Responsive**: Mobile-first CSS Grid & Flexbox
- **Database**: Supabase PostgreSQL
- **File Uploads**: Secure document handling

## 📁 Project Structure

```
refund-site/
├── index.html                 # Home page (clean, modern design)
├── services.html              # Services page with detailed offerings
├── how-it-works.html          # Process explanation with timeline
├── about.html                 # Company information and team
├── contact.html               # Contact form and information
├── login.html                 # User login
├── register.html              # User registration
├── submit-claim.html          # Claim submission form
├── dashboard.html             # User dashboard (Node.js version)
├── demo.html                  # Static demo version
├── assets/
│   └── logo.svg              # Professional SVG logo
├── css/
│   ├── style.css             # Original styles (legacy)
│   └── style-clean.css       # Clean, modern styles (recommended)
├── js/
│   └── main.js               # Frontend JavaScript with animations
├── php/                      # PHP backend (legacy)
│   ├── db.php
│   ├── login.php
│   └── register.php
├── admin/                    # Admin panel
│   ├── login.html
│   ├── dashboard.php
│   ├── claims.php
│   ├── css/admin.css
│   └── js/admin.js
├── uploads/                  # File uploads directory
├── database_schema.sql       # MySQL schema
├── database_schema_postgres.sql  # PostgreSQL schema
├── package.json              # Node.js dependencies
├── server.js                 # Node.js Express server
├── setup.php                 # Database setup checker
├── test_connection.php       # Connection test script
├── README.md                 # This documentation
├── DEPLOYMENT.md             # Deployment guide
└── start_server.bat         # Windows server starter
```

## 🗄️ Database Setup

### Option 1: PostgreSQL (Recommended)
1. Create a PostgreSQL database named `refund_company`
2. Import the `database_schema_postgres.sql` file:

```bash
psql -U postgres -d refund_company -f database_schema_postgres.sql
```

### Option 2: MySQL
1. Create a MySQL database named `refund_company`
2. Import the `database_schema.sql` file:

```sql
mysql -u root -p refund_company < database_schema.sql
```

The schema includes:
- `users` table for user accounts
- `claims` table for refund claims
- `admin_users` table for administrators
- `claim_history` table for status tracking

## 🔧 Installation & Setup

### Prerequisites

**For Node.js (Recommended):**
- Node.js 16+ and npm
- PostgreSQL database (Supabase provided)

**For PHP:**
- PHP 7.4 or higher with PDO extension
- PostgreSQL 12+ or MySQL 5.7+
- Web server (Apache/Nginx)

## 🚀 Quick Start (Node.js - Recommended)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
# Copy .env.example to .env and fill real values

# 3. Start the server
npm start

# 4. Open in browser
# http://localhost:3000

# Alternative: Use the batch file (Windows)
# Double-click start_server.bat
```

## 🎨 **Design Features (Improved)**

**✅ Professional UI/UX:**
- **Modern Design**: Clean, professional layout inspired by top SaaS companies
- **Consistent Branding**: Your color scheme (#0D0A0B, #454955, #F3EFF5, #72B01D, #3F7D20) throughout
- **Responsive Design**: Perfect on desktop, tablet, and mobile
- **Interactive Elements**: Smooth animations, hover effects, scroll animations
- **Trust-Building**: Professional imagery, testimonials, statistics

**✅ Technical Improvements:**
- **Clean Code**: Organized CSS with CSS variables and consistent naming
- **Performance**: Optimized animations and efficient CSS
- **Accessibility**: Proper ARIA labels, keyboard navigation, screen reader support
- **SEO Ready**: Proper meta tags, structured content, semantic HTML

**✅ User Experience:**
- **Intuitive Navigation**: Clear menu structure with active states
- **Mobile-First**: Hamburger menu, touch-friendly elements
- **Fast Loading**: Minimal dependencies, optimized assets
- **Professional Copy**: Clear, benefit-focused messaging

## 🔧 Installation & Setup

### Step 1: Choose Your Backend
Edit `php/db.php` and update the database credentials:

#### For PostgreSQL:
```php
$host = 'localhost';
$dbname = 'refund_company';
$username = 'postgres'; // or your PostgreSQL user
$password = 'your_password';
$port = '5432';
```

#### For MySQL:
```php
$host = 'localhost';
$dbname = 'refund_company';
$username = 'root'; // or your MySQL user
$password = 'your_password';
```

### Step 2: File Permissions
Set proper permissions for file uploads:

```bash
chmod 755 uploads/
chmod 644 uploads/*  # For existing files
```

### Step 3: Web Server Configuration
Make sure your web server serves PHP files and allows file uploads. Update `php.ini`:

```ini
upload_max_filesize = 5M
post_max_size = 8M
memory_limit = 128M
```

### Step 4: Admin Access
Default admin credentials:
- Username: `admin`
- Password: `admin123`

**⚠️ IMPORTANT**: Change the default admin password immediately after setup!

If admin login fails due to a legacy hash, reset it with:
```bash
npm run reset:admin -- admin admin123
```

### Step 5: SSL Setup (Production)
For production use, configure HTTPS:

```apache
# .htaccess example
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

## 🚀 Usage

### For Users
1. Register an account or login
2. Submit a claim with required details and proof
3. Track claim status in the dashboard
4. Receive updates via email

### For Administrators
1. Login to `/admin/login.html`
2. View dashboard statistics
3. Manage claims (review, approve, reject)
4. Export reports
5. Communicate with users

## 🔒 Security Features

- Password hashing with `password_hash()`
- Prepared statements for all database queries
- File upload validation and type checking
- Session management with secure cookies
- CSRF protection on forms
- SQL injection prevention
- XSS protection with input sanitization

## 📋 Legal Compliance

This website is designed to be legally compliant. However, you should:

1. **Consult a lawyer** before launching
2. **Add proper legal pages** (terms, privacy policy)
3. **Ensure GDPR/CCPA compliance** for data handling
4. **Obtain necessary licenses** for refund services
5. **Set up proper payment processing** for fees

## 🔄 Next Steps & Enhancements

### Immediate Tasks
- [ ] Add email notifications system
- [ ] Implement payment processing (Stripe/PayPal)
- [ ] Create legal pages (terms, privacy, refund policy)
- [ ] Add user profile management
- [ ] Implement claim history and messaging

### Advanced Features
- [ ] SMS notifications
- [ ] Multi-language support
- [ ] API integrations for claim validation
- [ ] Advanced reporting and analytics
- [ ] Chat support system
- [ ] Mobile app companion

### Production Readiness
- [ ] Security audit and penetration testing
- [ ] Performance optimization
- [ ] Backup and recovery procedures
- [ ] Monitoring and logging
- [ ] Load balancing setup

## 🤝 Contributing

This is a complete, working refund service website. For customizations or enhancements:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is provided as-is for educational and commercial use. Please ensure compliance with local laws and regulations regarding refund services.

## 🆘 Support

For setup issues or customizations:
- Check the database configuration
- Verify file permissions
- Ensure PHP and MySQL versions are compatible
- Review web server error logs

---

**⚠️ Disclaimer**: This is a software template for a refund service website. Running a refund claim service may require specific licenses and legal compliance in your jurisdiction. Consult with legal and financial professionals before launching any refund service business.