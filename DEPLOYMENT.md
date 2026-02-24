# 🚀 RefundHelp Deployment Guide

## Node.js First Deployment (Primary Path)

This project should be deployed as a Node.js app using `server.js`.
PHP instructions in this file are legacy references and should not be your default deployment path.

### Required environment variables

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_SSL_REJECT_UNAUTHORIZED`
- `SESSION_SECRET` (random, 32+ chars)
- `APP_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### Minimal production runbook

1. Provision PostgreSQL and Supabase Auth.
2. Apply schema: `database_schema_postgres.sql`.
3. Apply RLS hardening: `supabase_rls_hardening.sql`.
4. Set all env vars above in the host.
5. Install and start:
   - `npm install`
   - `npm start`
6. Validate critical flows:
   - Register -> verify email -> login
   - Forgot password -> reset password
   - Submit claim with valid/invalid files
   - Admin login -> claim status update

### Incident checklist

- Rotate `DB_PASSWORD` and `SESSION_SECRET` immediately if leaked.
- Verify login + session creation after any secret rotation.
- Confirm upload restrictions and claim update audit entries still work.

Your website is ready to deploy! Here are multiple hosting options:

## 🌐 **Recommended: Vercel (Free & Easy)**

### Quick Deploy:
1. **Create Vercel Account**: https://vercel.com
2. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

3. **Deploy**:
   ```bash
   cd refund-site
   vercel --prod
   ```

4. **Configure Database**: Update `php/db.php` with your Supabase credentials

**Pros**: Free, fast, global CDN
**Cons**: Limited PHP support (may need API routes)

---

## 🐘 **Option 2: Heroku (PHP Support)**

### Deploy Steps:
1. **Install Heroku CLI**: https://devcenter.heroku.com/articles/heroku-cli
2. **Create App**:
   ```bash
   heroku create your-refundhelp-app
   ```

3. **Add Buildpacks**:
   ```bash
   heroku buildpacks:add heroku/php
   heroku buildpacks:add heroku/nodejs
   ```

4. **Deploy**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```

5. **Set Environment Variables**:
   ```bash
   heroku config:set DATABASE_URL="your_supabase_connection_string"
   ```

---

## ☁️ **Option 3: DigitalOcean App Platform**

### Deploy Steps:
1. **Create Account**: https://cloud.digitalocean.com
2. **New App** → GitHub/Docker
3. **Connect Repository** → Select refund-site folder
4. **Configure**:
   - Runtime: PHP
   - Build Command: (leave empty)
   - Environment Variables: Add Supabase credentials

---

## 🖥️ **Option 4: Traditional Hosting**

### Requirements:
- PHP 8.0+
- PostgreSQL/MySQL
- SSL Certificate
- FTP/SFTP Access

### Popular Providers:
- **Bluehost** (~$3/month)
- **Hostinger** (~$3/month)
- **SiteGround** (~$4/month)
- **A2 Hosting** (~$3/month)

### Upload Steps:
1. **Upload Files**: Use FTP to upload refund-site folder
2. **Database**: Create PostgreSQL database
3. **Configure**: Update `php/db.php` with credentials
4. **Run Schema**: Execute `database_schema_postgres.sql`

---

## 🔧 **Local Development Setup**

### Windows (XAMPP):
1. Download: https://www.apachefriends.org
2. Install XAMPP
3. Copy `refund-site` → `C:\xampp\htdocs\`
4. Start Apache + MySQL
5. Visit: `http://localhost/refund-site/`

### macOS (MAMP):
1. Download: https://www.mamp.info
2. Install MAMP
3. Copy `refund-site` → `/Applications/MAMP/htdocs/`
4. Start MAMP
5. Visit: `http://localhost:8888/refund-site/`

### Linux (Docker):
```bash
# Create Dockerfile
FROM php:8.2-apache
COPY . /var/www/html/
EXPOSE 80
```

---

## 📊 **Database Options**

### Supabase (Recommended):
- ✅ Free tier available
- ✅ PostgreSQL
- ✅ Real-time features
- ✅ Built-in API

### PlanetScale:
- ✅ MySQL-compatible
- ✅ Serverless
- ✅ Free tier

### Railway:
- ✅ PostgreSQL/MySQL
- ✅ Easy deployment
- ✅ Free tier

---

## 🔒 **Production Checklist**

### Security:
- [ ] Change default admin password
- [ ] Enable HTTPS/SSL
- [ ] Set secure session settings
- [ ] Configure firewall
- [ ] Regular backups

### Performance:
- [ ] Enable caching
- [ ] Optimize images
- [ ] Minify CSS/JS
- [ ] CDN for static files
- [ ] Database indexing

### Monitoring:
- [ ] Error logging
- [ ] Performance monitoring
- [ ] Database monitoring
- [ ] Security scanning

---

## 🎯 **Quick Start Commands**

```bash
# 1. Test locally first
php -S localhost:8000

# 2. Deploy to Vercel
npm install -g vercel
vercel --prod

# 3. Deploy to Heroku
heroku create your-app-name
git push heroku main

# 4. Deploy to DigitalOcean
# Use their web interface
```

---

## 💰 **Cost Comparison**

| Platform | Free Tier | Paid Plan | PHP Support |
|----------|-----------|-----------|-------------|
| Vercel | 100GB bandwidth | $0-20/month | Limited |
| Heroku | 512MB RAM | $7-25/month | Full |
| DigitalOcean | None | $5-25/month | Full |
| Bluehost | None | $3-15/month | Full |

---

## 🆘 **Troubleshooting**

### Common Issues:

**"PHP not found"**
- Install PHP or use XAMPP
- Add PHP to system PATH

**"Database connection failed"**
- Check Supabase credentials
- Verify database is active
- Run schema SQL file

**"File upload not working"**
- Check `uploads/` folder permissions
- Verify PHP upload settings

**"Admin login not working"**
- Run database schema
- Check admin credentials
- Clear browser cache

---

## 📞 **Need Help?**

1. Check the `README.md` file
2. Run `test_connection.php`
3. Review browser console errors
4. Check PHP error logs

Your RefundHelp website is production-ready! 🚀