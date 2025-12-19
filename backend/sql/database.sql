CREATE DATABASE IF NOT EXISTS stock_management;
USE stock_management;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Stock Items Table
CREATE TABLE IF NOT EXISTS stock_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    unit_price DECIMAL(10, 2) NOT NULL,
    low_stock_threshold INT DEFAULT 10,
    supplier VARCHAR(255),
    location VARCHAR(100),
    sku VARCHAR(100) UNIQUE,
    barcode VARCHAR(100),
    user_id INT,
    added_date DATE DEFAULT (CURRENT_DATE),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_category (category),
    INDEX idx_quantity (quantity)
);

-- Stock History Table
CREATE TABLE IF NOT EXISTS stock_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    stock_item_id INT NOT NULL,
    action_type ENUM('add', 'update', 'delete', 'restock', 'adjust') NOT NULL,
    previous_quantity INT,
    quantity_change INT NOT NULL,
    new_quantity INT NOT NULL,
    notes TEXT,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (stock_item_id) REFERENCES stock_items(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_action_type (action_type),
    INDEX idx_created_at (created_at)
);

-- Daily Reports Table
CREATE TABLE IF NOT EXISTS daily_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    report_date DATE NOT NULL,
    total_items_added INT DEFAULT 0,
    total_items_updated INT DEFAULT 0,
    total_items_deleted INT DEFAULT 0,
    total_value DECIMAL(15, 2) DEFAULT 0,
    low_stock_items INT DEFAULT 0,
    generated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_report_date (report_date),
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Categories Table for reference
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- Insert default categories
INSERT IGNORE INTO categories (name) VALUES
('Electronics'),
('Clothing'),
('Food & Beverages'),
('Office Supplies'),
('Hardware'),
('Pharmaceuticals'),
('Books'),
('Other');

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO users (username, email, password, full_name, role) 
VALUES ('admin', 'admin@stock.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeKRW5LwYQ7Zc0.jBq4h5pK6Z7jQfJqWq', 'System Administrator', 'admin');

-- Create stored procedure for stock update with history
DELIMITER $$
CREATE PROCEDURE UpdateStockWithHistory(
    IN p_item_id INT,
    IN p_action_type VARCHAR(20),
    IN p_quantity_change INT,
    IN p_user_id INT,
    IN p_notes TEXT
)
BEGIN
    DECLARE v_previous_quantity INT;
    DECLARE v_new_quantity INT;
    
    START TRANSACTION;
    
    -- Get current quantity
    SELECT quantity INTO v_previous_quantity 
    FROM stock_items 
    WHERE id = p_item_id FOR UPDATE;
    
    -- Calculate new quantity
    SET v_new_quantity = v_previous_quantity + p_quantity_change;
    
    -- Update stock item
    UPDATE stock_items 
    SET quantity = v_new_quantity, 
        last_updated = CURRENT_TIMESTAMP
    WHERE id = p_item_id;
    
    -- Record in history
    INSERT INTO stock_history (
        stock_item_id, 
        action_type, 
        previous_quantity, 
        quantity_change, 
        new_quantity, 
        user_id, 
        notes
    ) VALUES (
        p_item_id,
        p_action_type,
        v_previous_quantity,
        p_quantity_change,
        v_new_quantity,
        p_user_id,
        p_notes
    );
    
    COMMIT;
END$$
DELIMITER ;

-- Create view for low stock items
CREATE OR REPLACE VIEW low_stock_items AS
SELECT 
    si.*,
    CASE 
        WHEN quantity <= low_stock_threshold THEN 'CRITICAL'
        WHEN quantity <= low_stock_threshold * 2 THEN 'LOW'
        ELSE 'NORMAL'
    END as stock_status
FROM stock_items si
WHERE quantity <= low_stock_threshold * 2
ORDER BY quantity ASC;

-- Create view for daily summary
CREATE OR REPLACE VIEW daily_summary AS
SELECT 
    DATE(created_at) as summary_date,
    COUNT(CASE WHEN action_type = 'add' THEN 1 END) as items_added,
    COUNT(CASE WHEN action_type = 'update' THEN 1 END) as items_updated,
    COUNT(CASE WHEN action_type = 'delete' THEN 1 END) as items_deleted,
    COUNT(*) as total_actions
FROM stock_history
GROUP BY DATE(created_at)
ORDER BY summary_date DESC;