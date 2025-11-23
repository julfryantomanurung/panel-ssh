const Database = require('../database/schema');
const UserService = require('../services/userService');

const db = new Database();
const userService = new UserService();

const createUser = async (req, res) => {
  try {
    const { username, type, password, days = 30 } = req.body;

    if (!username || !type) {
      return res.status(400).json({
        success: false,
        message: 'Username and type are required'
      });
    }

    const validTypes = ['ssh', 'vless', 'vmess', 'trojan'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be one of: ssh, vless, vmess, trojan'
      });
    }

    let userData;
    if (type === 'ssh') {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required for SSH users'
        });
      }
      userData = await userService.createSSHUser(username, password, days);
    } else {
      userData = await userService.createXrayUser(username, type, days);
    }

    // Save to database
    const query = `INSERT INTO users (username, type, uuid, password, expires_at, status) 
                   VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.connection.run(
      query,
      [username, type, userData.uuid || null, password || null, userData.expires_at, 'active'],
      function(err) {
        if (err) {
          console.error('Error saving user to database:', err);
          return res.status(500).json({
            success: false,
            message: 'User created but failed to save to database',
            error: err.message
          });
        }

        const userId = this.lastID;
        res.status(201).json({
          success: true,
          message: 'User created successfully',
          data: {
            id: userId,
            ...userData
          }
        });
      }
    );
  } catch (error) {
    console.error('Error in createUser:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const listUsers = async (req, res) => {
  try {
    const { type, status } = req.query;
    
    let query = 'SELECT * FROM users WHERE 1=1';
    const params = [];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    db.connection.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error listing users:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to list users'
        });
      }

      res.json({
        success: true,
        data: rows,
        count: rows.length
      });
    });
  } catch (error) {
    console.error('Error in listUsers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Get user info
    db.connection.get('SELECT * FROM users WHERE id = ?', [id], async (err, user) => {
      if (err || !user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      try {
        // Delete from system
        if (user.type === 'ssh') {
          await userService.deleteSSHUser(user.username);
        } else {
          await userService.deleteXrayUser(user.username, user.type);
        }

        // Delete from database
        db.connection.run('DELETE FROM users WHERE id = ?', [id], (err) => {
          if (err) {
            console.error('Error deleting user from database:', err);
            return res.status(500).json({
              success: false,
              message: 'User deleted from system but failed to delete from database'
            });
          }

          res.json({
            success: true,
            message: 'User deleted successfully'
          });
        });
      } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
          success: false,
          message: error.message
        });
      }
    });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const getUserConfig = async (req, res) => {
  try {
    const { id } = req.params;

    db.connection.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
      if (err || !user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const config = userService.generateConfig(user);
      
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            type: user.type,
            status: user.status,
            created_at: user.created_at,
            expires_at: user.expires_at
          },
          config
        }
      });
    });
  } catch (error) {
    console.error('Error in getUserConfig:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createUser,
  listUsers,
  deleteUser,
  getUserConfig
};
