const stockModel = require('../models/stockModel');
const historyModel = require('../models/historyModel');

class StockController {
  // Get all stock items
  async getAll(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        category, 
        search, 
        sortBy, 
        sortOrder 
      } = req.query;
      
      const result = await stockModel.getAll({
        page: parseInt(page),
        limit: parseInt(limit),
        category,
        search,
        sortBy,
        sortOrder
      });
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Get all stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stock items'
      });
    }
  }

  // Get single stock item
  async getById(req, res) {
    try {
      const { id } = req.params;
      const item = await stockModel.getById(id);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Stock item not found'
        });
      }
      
      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      console.error('Get stock by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stock item'
      });
    }
  }

  // Create new stock item
  async create(req, res) {
    try {
      const userId = req.user.id;
      const itemData = req.body;
      
      // Validate required fields
      if (!itemData.name || !itemData.category || itemData.quantity === undefined || !itemData.unit_price) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, category, quantity, unit_price'
        });
      }
      
      const newItem = await stockModel.create(itemData, userId);
      
      // Record in history
      await historyModel.create({
        stock_item_id: newItem.id,
        action_type: 'add',
        previous_quantity: 0,
        quantity_change: itemData.quantity,
        new_quantity: itemData.quantity,
        user_id: userId,
        notes: `New item added: ${itemData.name}`
      });
      
      res.status(201).json({
        success: true,
        message: 'Stock item created successfully',
        data: newItem
      });
    } catch (error) {
      console.error('Create stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create stock item'
      });
    }
  }

  // Update stock item
  async update(req, res) {
    try {
      const { id } = req.params;
      const itemData = req.body;
      
      const existingItem = await stockModel.getById(id);
      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Stock item not found'
        });
      }
      
      const updatedItem = await stockModel.update(id, itemData);
      
      res.json({
        success: true,
        message: 'Stock item updated successfully',
        data: updatedItem
      });
    } catch (error) {
      console.error('Update stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update stock item'
      });
    }
  }

  // Delete stock item
  async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const existingItem = await stockModel.getById(id);
      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Stock item not found'
        });
      }
      
      // Record in history before deletion
      await historyModel.create({
        stock_item_id: id,
        action_type: 'delete',
        previous_quantity: existingItem.quantity,
        quantity_change: -existingItem.quantity,
        new_quantity: 0,
        user_id: userId,
        notes: `Item deleted: ${existingItem.name}`
      });
      
      const deleted = await stockModel.delete(id);
      
      if (deleted) {
        res.json({
          success: true,
          message: 'Stock item deleted successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to delete stock item'
        });
      }
    } catch (error) {
      console.error('Delete stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete stock item'
      });
    }
  }

  // Update stock quantity
  async updateQuantity(req, res) {
    try {
      const { id } = req.params;
      const { action, quantity, notes } = req.body;
      const userId = req.user.id;
      
      if (!['add', 'remove', 'adjust'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Use: add, remove, or adjust'
        });
      }
      
      if (!quantity || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a positive number'
        });
      }
      
      const existingItem = await stockModel.getById(id);
      if (!existingItem) {
        return res.status(404).json({
          success: false,
          message: 'Stock item not found'
        });
      }
      
      let quantityChange;
      let actionType;
      
      if (action === 'add') {
        quantityChange = quantity;
        actionType = 'add';
      } else if (action === 'remove') {
        if (existingItem.quantity < quantity) {
          return res.status(400).json({
            success: false,
            message: `Cannot remove ${quantity} items. Only ${existingItem.quantity} available.`
          });
        }
        quantityChange = -quantity;
        actionType = 'update';
      } else {
        // adjust action
        quantityChange = quantity - existingItem.quantity;
        actionType = 'adjust';
      }
      
      const updatedItem = await stockModel.updateQuantity(
        id, 
        actionType, 
        quantityChange, 
        userId, 
        notes
      );
      
      res.json({
        success: true,
        message: 'Stock quantity updated successfully',
        data: updatedItem
      });
    } catch (error) {
      console.error('Update quantity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update stock quantity'
      });
    }
  }

  // Get low stock items
  async getLowStock(req, res) {
    try {
      const { threshold = 1 } = req.query;
      const items = await stockModel.getLowStock(parseInt(threshold));
      
      res.json({
        success: true,
        count: items.length,
        data: items
      });
    } catch (error) {
      console.error('Get low stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch low stock items'
      });
    }
  }

  // Get stock statistics
  async getStatistics(req, res) {
    try {
      const statistics = await stockModel.getStatistics();
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics'
      });
    }
  }

  // Search stock items
  async search(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search query must be at least 2 characters'
        });
      }
      
      const results = await stockModel.search(q);
      
      res.json({
        success: true,
        count: results.length,
        data: results
      });
    } catch (error) {
      console.error('Search stock error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search stock items'
      });
    }
  }
}

module.exports = new StockController();