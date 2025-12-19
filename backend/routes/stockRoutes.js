const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth.verifyToken);

// Get all stock items
router.get('/', stockController.getAll);

// Search stock items
router.get('/search', stockController.search);

// Get stock statistics
router.get('/statistics', stockController.getStatistics);

// Get low stock items
router.get('/low-stock', stockController.getLowStock);

// Create new stock item
router.post('/', stockController.create);

// Get single stock item
router.get('/:id', stockController.getById);

// Update stock item
router.put('/:id', stockController.update);

// Update stock quantity
router.patch('/:id/quantity', stockController.updateQuantity);

// Delete stock item
router.delete('/:id', auth.checkRole('admin', 'manager'), stockController.delete);

module.exports = router;