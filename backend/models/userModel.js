const db = require('./db');
const bcrypt = require('bcryptjs');

class UserModel {
  // Find user by ID
  async findById(id) {
    const query = 'SELECT id, username, email, full_name, role, created_at FROM users WHERE id = ?';
    const [rows] = await db.query(query, [id]);
    return rows[0];
  }

  // Find user by username
  async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = ?';
    const [rows] = await db.query(query, [username]);
    return rows[0];
  }

  // Find user by email
  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ?';
    const [rows] = await db.query(query, [email]);
    return rows[0];
  }

  // Create new user
  async create(userData) {
    const { username, email, password, full_name, role = 'staff' } = userData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const query = `
      INSERT INTO users (username, email, password, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.query(query, [username, email, hashedPassword, full_name, role]);
    
    return this.findById(result.insertId);
  }

  // Update user
  async update(id, userData) {
    const fields = [];
    const values = [];
    
    Object.keys(userData).forEach(key => {
      if (userData[key] !== undefined && key !== 'password') {
        fields.push(`${key} = ?`);
        values.push(userData[key]);
      }
    });
    
    if (fields.length === 0) {
      return this.findById(id);
    }
    
    values.push(id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    
    await db.query(query, values);
    return this.findById(id);
  }

  // Update password
  async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE users SET password = ? WHERE id = ?';
    
    await db.query(query, [hashedPassword, id]);
    return true;
  }

  // Verify password
  async verifyPassword(user, password) {
    return await bcrypt.compare(password, user.password);
  }

  // Get all users
  async getAll({ page = 1, limit = 10, role, search }) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }
    
    if (search) {
      whereClause += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const dataQuery = `
      SELECT id, username, email, full_name, role, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
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

  // Delete user
  async delete(id) {
    const query = 'DELETE FROM users WHERE id = ? AND role != "admin"';
    const [result] = await db.query(query, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = new UserModel();