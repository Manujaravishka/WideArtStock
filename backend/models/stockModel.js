const db = require('./db');

class StockModel {
  // Get all stock items with pagination
  async getAll({ page = 1, limit = 10, category, search, sortBy = 'last_updated', sortOrder = 'DESC' }) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      whereClause += ' AND (name LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    const validSortColumns = ['name', 'category', 'quantity', 'unit_price', 'last_updated', 'added_date'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'last_updated';
    const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    const countQuery = `SELECT COUNT(*) as total FROM stock_items ${whereClause}`;
    const dataQuery = `
      SELECT 
        si.*,
        CASE 
          WHEN quantity <= low_stock_threshold THEN 'low'
          WHEN quantity <= low_stock_threshold * 2 THEN 'medium'
          ELSE 'high'
        END as stock_status,
        (quantity * unit_price) as total_value
      FROM stock_items si
      ${whereClause}
      ORDER BY ${sortColumn} ${order}
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

  // Get single stock item
  async getById(id) {
    const query = `
      SELECT 
        si.*,
        (quantity * unit_price) as total_value,
        u.username as added_by
      FROM stock_items si
      LEFT JOIN users u ON si.user_id = u.id
      WHERE si.id = ?
    `;
    const [rows] = await db.query(query, [id]);
    return rows[0];
  }

  // Create stock item
  async create(itemData, userId) {
    const {
      name, description, category, quantity, unit_price,
      low_stock_threshold = 10, supplier, location, sku, barcode
    } = itemData;

    const query = `
      INSERT INTO stock_items (
        name, description, category, quantity, unit_price,
        low_stock_threshold, supplier, location, sku, barcode, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
      name, description || '', category, quantity, unit_price,
      low_stock_threshold, supplier || '', location || '', sku || '', barcode || '', userId
    ]);

    return this.getById(result.insertId);
  }

  // Update stock item
  async update(id, itemData) {
    const fields = [];
    const values = [];

    Object.keys(itemData).forEach(key => {
      if (itemData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(itemData[key]);
      }
    });

    if (fields.length === 0) {
      return this.getById(id);
    }

    values.push(id);
    const query = `UPDATE stock_items SET ${fields.join(', ')}, last_updated = CURRENT_TIMESTAMP WHERE id = ?`;
    
    await db.query(query, values);
    return this.getById(id);
  }

  // Delete stock item
  async delete(id) {
    const query = 'DELETE FROM stock_items WHERE id = ?';
    const [result] = await db.query(query, [id]);
    return result.affectedRows > 0;
  }

  // Update stock quantity with stored procedure
  async updateQuantity(itemId, actionType, quantityChange, userId, notes = '') {
    try {
      // First get current quantity
      const item = await this.getById(itemId);
      
      if (!item) {
        throw new Error('Item not found');
      }

      // Update using stored procedure
      await db.query('CALL UpdateStockWithHistory(?, ?, ?, ?, ?)', [
        itemId, 
        actionType, 
        quantityChange, 
        userId, 
        notes
      ]);
      
      return this.getById(itemId);
    } catch (error) {
      // Fallback to manual update if stored procedure doesn't exist
      console.log('Using manual update (stored procedure might not exist):', error.message);
      
      const query = `
        UPDATE stock_items 
        SET quantity = quantity + ?, 
            last_updated = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      
      await db.query(query, [quantityChange, itemId]);
      
      // Record history manually
      const historyQuery = `
        INSERT INTO stock_history (
          stock_item_id, action_type, previous_quantity, 
          quantity_change, new_quantity, user_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const newQuantity = item.quantity + quantityChange;
      await db.query(historyQuery, [
        itemId, actionType, item.quantity, 
        quantityChange, newQuantity, userId, notes
      ]);
      
      return this.getById(itemId);
    }
  }

  // Get low stock items
  async getLowStock(thresholdMultiplier = 1) {
    const query = `
      SELECT * 
      FROM stock_items 
      WHERE quantity <= low_stock_threshold * ?
      ORDER BY quantity ASC
    `;
    return await db.query(query, [thresholdMultiplier]);
  }

  // Get stock statistics
  async getStatistics() {
    const queries = {
      totalItems: 'SELECT COUNT(*) as count FROM stock_items',
      totalValue: 'SELECT SUM(quantity * unit_price) as value FROM stock_items',
      lowStockCount: 'SELECT COUNT(*) as count FROM stock_items WHERE quantity <= low_stock_threshold',
      categoryStats: `
        SELECT category, COUNT(*) as item_count, SUM(quantity * unit_price) as total_value
        FROM stock_items
        GROUP BY category
        ORDER BY total_value DESC
      `
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      const [rows] = await db.query(query);
      results[key] = rows;
    }

    return results;
  }

  // Search stock items
  async search(term) {
    const query = `
      SELECT id, name, category, quantity, unit_price, low_stock_threshold
      FROM stock_items
      WHERE name LIKE ? OR description LIKE ?
      LIMIT 20
    `;
    const searchTerm = `%${term}%`;
    return await db.query(query, [searchTerm, searchTerm]);
  }
}

module.exports = new StockModel();