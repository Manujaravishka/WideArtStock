require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./models/db');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// API Routes
app.use('/api', routes);

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Database connection and server start
async function startServer() {
    try {
        // Connect to database
        await db.connect();
        
        // Create sample data if needed
        await createSampleData();
        
        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Database: ${process.env.DB_NAME}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📁 Frontend: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Create sample data
async function createSampleData() {
    try {
        // Check if we already have stock items
        const [items] = await db.query('SELECT COUNT(*) as count FROM stock_items');
        
        if (items[0].count === 0) {
            console.log('Creating sample stock data...');
            
            const sampleItems = [
                ['Laptop Pro X1', 'High-performance business laptop', 'Electronics', 15, 1200.00, 10, 'TechCorp Inc.'],
                ['Wireless Mouse', 'Ergonomic wireless mouse', 'Electronics', 42, 25.99, 20, 'Peripherals Co.'],
                ['Office Chair', 'Ergonomic office chair', 'Office Supplies', 8, 189.50, 5, 'Furniture World'],
                ['Notebooks (Pack of 10)', 'A4 size notebooks', 'Office Supplies', 23, 15.75, 15, 'Paper Goods Ltd.'],
                ['Energy Drink (24 cans)', 'Case of energy drinks', 'Food & Beverages', 12, 28.50, 10, 'Beverage Distributors'],
                ['Smartphone X10', 'Latest model smartphone', 'Electronics', 5, 899.99, 8, 'Mobile Tech'],
                ['Desk Lamp', 'LED desk lamp with adjustable brightness', 'Office Supplies', 18, 34.99, 12, 'Lighting Solutions'],
                ['First Aid Kit', 'Complete first aid kit', 'Pharmaceuticals', 7, 45.25, 5, 'Health Supplies Co.']
            ];
            
            for (const item of sampleItems) {
                await db.query(
                    'INSERT INTO stock_items (name, description, category, quantity, unit_price, low_stock_threshold, supplier) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    item
                );
            }
            
            console.log('Sample data created successfully');
        }
    } catch (error) {
        console.error('Error creating sample data:', error);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await db.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await db.close();
    process.exit(0);
});

// Start the server
startServer();