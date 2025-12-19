const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Public routes
router.post('/login', authController.login);

// Protected routes (require authentication)
router.use(auth.verifyToken);

// Get profile
router.get('/profile', authController.getProfile);

// Update profile
router.put('/profile', authController.updateProfile);

// Change password
router.post('/change-password', authController.changePassword);

// Register new user (admin only)
router.post('/register', auth.checkRole('admin', 'manager'), authController.register);

module.exports = router;