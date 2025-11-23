const Database = require('../database/schema');

const logActivity = (action, details = {}) => {
  return (req, res, next) => {
    const db = new Database();
    const logData = {
      action,
      user_id: details.user_id || null,
      payment_id: details.payment_id || null,
      details: JSON.stringify({
        ...details,
        body: req.body,
        params: req.params,
        query: req.query
      }),
      ip_address: req.ip || req.connection.remoteAddress
    };

    db.connection.run(
      `INSERT INTO activity_logs (action, user_id, payment_id, details, ip_address) 
       VALUES (?, ?, ?, ?, ?)`,
      [logData.action, logData.user_id, logData.payment_id, logData.details, logData.ip_address],
      (err) => {
        if (err) {
          console.error('Error logging activity:', err);
        }
      }
    );

    next();
  };
};

module.exports = { logActivity };
