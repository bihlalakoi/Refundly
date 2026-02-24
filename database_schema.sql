-- RefundHelp Database Schema
-- Legal refund company database for tracking user claims

CREATE DATABASE IF NOT EXISTS refund_company;
USE refund_company;

-- Users table for authentication
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Claims table for refund requests
CREATE TABLE claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  claim_type VARCHAR(50) NOT NULL,
  reference_number VARCHAR(100),
  amount DECIMAL(10,2) NOT NULL,
  proof_file VARCHAR(255),
  description TEXT,
  status ENUM('Submitted', 'In Review', 'Approved', 'Rejected', 'Refunded') DEFAULT 'Submitted',
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Admin users table (separate from regular users)
CREATE TABLE admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Claim status history for tracking changes
CREATE TABLE claim_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  claim_id INT NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  changed_by INT, -- admin user id
  notes TEXT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (claim_id) REFERENCES claims(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES admin_users(id)
);

-- Insert default admin user (password: admin123)
INSERT INTO admin_users (username, password, role) VALUES
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Sample data for testing
INSERT INTO users (name, email, password) VALUES
('John Doe', 'john@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'),
('Jane Smith', 'jane@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');