const mysql = require('mysql2/promise');

// Replace these with your actual MySQL credentials
const dbConfig = {
  host: 'localhost',      // or the host where MySQL is running
  user: 'root',           // your MySQL username
  password: 'BLcivicom1*',  // your MySQL password
  database: 'pharmatrack' // your existing database
};

async function connectDB() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected to pharmatrack database!');
    return connection;
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

module.exports = connectDB;
