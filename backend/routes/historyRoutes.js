const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth.verifyToken);

// Get all history records
router.get('/', historyController.getAll);

// Get today's history
router.get('/today', historyController.getToday);

// Get history summary
router.get('/summary', historyController.getSummary);

// Get history by item ID
router.get('/item/:itemId', historyController.getByItemId);

module.exports = router;