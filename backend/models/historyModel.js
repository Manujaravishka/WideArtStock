const db = require('./db');

class HistoryModel {
  // Get all history records with filters
  async getAll({ page = 1, limit = 20, actionType, startDate, endDate, itemId, userId }) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (actionType) {
      whereClause += ' AND action_type = ?';
      params.push(actionType);
    }

    if (startDate) {
      whereClause += ' AND DATE(created_at) >= ?';
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ' AND DATE(created_at) <= ?';
      params.push(endDate);
    }

    if (itemId) {
      whereClause += ' AND stock_item_id = ?';
      params.push(itemId);
    }

    if (userId) {
      whereClause += ' AND user_id = ?';
      params.push(userId);
    }

    const countQuery = `SELECT COUNT(*) as total FROM stock_history ${whereClause}`;
    const dataQuery = `
      SELECT 
        sh.*,
        si.name as item_name,
        si.category as item_category,
        u.username as user_name
      FROM stock_history sh
      LEFT JOIN stock_items si ON sh.stock_item_id = si.id
      LEFT JOIN users u ON sh.user_id = u.id
      ${whereClause}
      ORDER BY sh.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const [countResult] = await db.query(countQuery, params.slice(0, params.length - 2));
    const data = await db.query(dataQuery, params);

    return {
      items: data,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }

  // Get today's history
  async getToday() {
    const query = `
      SELECT 
        sh.*,
        si.name as item_name,
        u.username as user_name,
        TIME(sh.created_at) as time
      FROM stock_history sh
      LEFT JOIN stock_items si ON sh.stock_item_id = si.id
      LEFT JOIN users u ON sh.user_id = u.id
      WHERE DATE(sh.created_at) = CURDATE()
      ORDER BY sh.created_at DESC
    `;
    return await db.query(query);
  }

  // Get history by item ID
  async getByItemId(itemId, limit = 50) {
    const query = `
      SELECT 
        sh.*,
        u.username as user_name
      FROM stock_history sh
      LEFT JOIN users u ON sh.user_id = u.id
      WHERE stock_item_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    return await db.query(query, [itemId, limit]);
  }

  // Get summary by date range
  async getSummary(startDate, endDate) {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(CASE WHEN action_type = 'add' THEN 1 END) as items_added,
        COUNT(CASE WHEN action_type = 'update' THEN 1 END) as items_updated,
        COUNT(CASE WHEN action_type = 'delete' THEN 1 END) as items_deleted,
        COUNT(*) as total_actions
      FROM stock_history
      WHERE DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    return await db.query(query, [startDate, endDate]);
  }

  // Record a history entry
  async create(historyData) {
    const {
      stock_item_id, action_type, previous_quantity,
      quantity_change, new_quantity, user_id, notes
    } = historyData;

    const query = `
      INSERT INTO stock_history (
        stock_item_id, action_type, previous_quantity,
        quantity_change, new_quantity, user_id, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
      stock_item_id, action_type, previous_quantity,
      quantity_change, new_quantity, user_id, notes
    ]);

    return result.insertId;
  }
}

module.exports = new HistoryModel();