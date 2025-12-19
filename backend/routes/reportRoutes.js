const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth.verifyToken);

// Generate daily report
router.post('/daily', reportController.generateDailyReport);

// Generate stock summary report
router.get('/stock-summary', reportController.generateStockSummary);

// Generate history report
router.get('/history', reportController.generateHistoryReport);

module.exports = router;