const express = require('express');
const router = express.Router();
const { apiKeyAuth } = require('../middleware/auth');
const { logActivity } = require('../middleware/logger');
const {
  createUser,
  listUsers,
  deleteUser,
  getUserConfig
} = require('../controllers/userController');

// Apply API key authentication to all routes
router.use(apiKeyAuth);

// User routes
router.post('/', logActivity('create_user'), createUser);
router.get('/', logActivity('list_users'), listUsers);
router.delete('/:id', logActivity('delete_user'), deleteUser);
router.get('/:id/config', logActivity('get_user_config'), getUserConfig);

module.exports = router;
