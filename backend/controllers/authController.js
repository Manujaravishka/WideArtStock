const userModel = require('../models/userModel');
const jwt = require('jsonwebtoken');

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      const { username, email, password, full_name, role = 'staff' } = req.body;
      
      // Check if user already exists
      const existingUser = await userModel.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
      }
      
      const existingEmail = await userModel.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
      
      // Validate role
      const validRoles = ['admin', 'manager', 'staff'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be: admin, manager, or staff'
        });
      }
      
      // Check if admin is trying to create another admin
      if (role === 'admin' && req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admin can create admin users'
        });
      }
      
      // Create user
      const user = await userModel.create({
        username,
        email,
        password,
        full_name,
        role
      });
      
      // Generate token
      const token = this.generateToken(user);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            created_at: user.created_at
          },
          token
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register user'
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }
      
      // Find user
      const user = await userModel.findByUsername(username);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      // Verify password
      const isValidPassword = await userModel.verifyPassword(user, password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      // Generate token
      const token = this.generateToken(user);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            created_at: user.created_at
          },
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to login'
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = await userModel.findById(req.user.id);
      
      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          created_at: user.created_at
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { full_name, email } = req.body;
      const userId = req.user.id;
      
      // Check if email is being changed and if it already exists
      if (email) {
        const existingUser = await userModel.findByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use'
          });
        }
      }
      
      const updateData = {};
      if (full_name !== undefined) updateData.full_name = full_name;
      if (email !== undefined) updateData.email = email;
      
      const updatedUser = await userModel.update(userId, updateData);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }
      
      // Get user and verify current password
      const user = await userModel.findById(userId);
      const isValid = await userModel.verifyPassword(user, currentPassword);
      
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
      
      // Update password
      await userModel.updatePassword(userId, newPassword);
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password'
      });
    }
  }

  // Generate JWT token
  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
  }
}

module.exports = new AuthController();