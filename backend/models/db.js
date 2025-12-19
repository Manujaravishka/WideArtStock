const mysql = require('mysql2/promise');
const config = require('../config/database');

class Database {
  constructor() {
    this.pool = null;
  }

  async connect() {
    try {
      const env = process.env.NODE_ENV || 'development';
      const dbConfig = config[env];
      
      this.pool = mysql.createPool({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        waitForConnections: dbConfig.waitForConnections,
        connectionLimit: dbConfig.connectionLimit,
        queueLimit: dbConfig.queueLimit,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      });

      // Test connection
      const connection = await this.pool.getConnection();
      console.log(`✅ Connected to MySQL database: ${dbConfig.database}`);
      connection.release();
      
      return this.pool;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.log('Please check:');
      console.log('1. MySQL server is running');
      console.log('2. Database credentials in .env file');
      console.log('3. Database exists (run: npm run setup-db)');
      process.exit(1);
    }
  }

  async query(sql, params) {
    try {
      const [results] = await this.pool.execute(sql, params);
      return results;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async transaction(callback) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('Database connection closed');
    }
  }
}

module.exports = new Database();