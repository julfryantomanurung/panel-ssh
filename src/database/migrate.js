require('dotenv').config();
const Database = require('./schema');

const db = new Database();

db.initialize()
  .then(() => {
    console.log('Migration completed successfully');
    return db.close();
  })
  .then(() => {
    console.log('Database connection closed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
