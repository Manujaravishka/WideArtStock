const express = require('express');
const router = express.Router();

// Import route modules
const stockRoutes = require('./stockRoutes');
const historyRoutes = require('./historyRoutes');
const reportRoutes = require('./reportRoutes');
const authRoutes = require('./authRoutes');

// API Routes
router.use('/auth', authRoutes);
router.use('/stock', stockRoutes);
router.use('/history', historyRoutes);
router.use('/reports', reportRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Stock Management API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.originalUrl} not found`
  });
});

module.exports = router;