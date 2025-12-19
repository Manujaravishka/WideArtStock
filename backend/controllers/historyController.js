const historyModel = require('../models/historyModel');

class HistoryController {
  // Get all history records
  async getAll(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        actionType,
        startDate,
        endDate,
        itemId,
        userId
      } = req.query;
      
      const result = await historyModel.getAll({
        page: parseInt(page),
        limit: parseInt(limit),
        actionType,
        startDate,
        endDate,
        itemId: itemId ? parseInt(itemId) : undefined,
        userId: userId ? parseInt(userId) : undefined
      });
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Get history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch history records'
      });
    }
  }

  // Get today's history
  async getToday(req, res) {
    try {
      const history = await historyModel.getToday();
      
      // Calculate summary
      const summary = {
        items_added: history.filter(h => h.action_type === 'add').length,
        items_updated: history.filter(h => h.action_type === 'update' || h.action_type === 'adjust').length,
        items_deleted: history.filter(h => h.action_type === 'delete').length,
        total_actions: history.length
      };
      
      res.json({
        success: true,
        summary,
        data: history
      });
    } catch (error) {
      console.error('Get today history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch today\'s history'
      });
    }
  }

  // Get history by item ID
  async getByItemId(req, res) {
    try {
      const { itemId } = req.params;
      const { limit = 50 } = req.query;
      
      const history = await historyModel.getByItemId(parseInt(itemId), parseInt(limit));
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Get item history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch item history'
      });
    }
  }

  // Get history summary by date range
  async getSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
      }
      
      const summary = await historyModel.getSummary(startDate, endDate);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Get history summary error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch history summary'
      });
    }
  }
}

module.exports = new HistoryController();