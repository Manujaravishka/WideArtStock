const jwt = require('jsonwebtoken');

const authMiddleware = {
  // Verify JWT token
  verifyToken: (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. No token provided.'
        });
      }
      
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Authentication error'
      });
    }
  },

  // Check role permission
  checkRole: (...roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }
      
      next();
    };
  },

  // Optional authentication (for public routes that can also work with auth)
  optionalAuth: (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      }
      
      next();
    } catch (error) {
      // If token is invalid, just continue without auth
      next();
    }
  }
};

module.exports = authMiddleware;