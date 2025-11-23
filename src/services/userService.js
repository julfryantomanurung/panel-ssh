const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const execAsync = promisify(exec);

class UserService {
  constructor() {
    this.xrayConfigPath = process.env.XRAY_CONFIG_PATH || '/usr/local/etc/xray/config.json';
    this.domain = process.env.DOMAIN || 'localhost';
  }

  async createSSHUser(username, password, days = 30) {
    try {
      // Create user
      await execAsync(`useradd -m -s /bin/bash ${username}`);
      
      // Set password
      await execAsync(`echo "${username}:${password}" | chpasswd`);
      
      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);
      const expiryStr = expiryDate.toISOString().split('T')[0];
      
      // Set expiry
      await execAsync(`chage -E ${expiryStr} ${username}`);
      
      return {
        username,
        password,
        expires_at: expiryDate.toISOString(),
        type: 'ssh'
      };
    } catch (error) {
      console.error('Error creating SSH user:', error);
      throw new Error(`Failed to create SSH user: ${error.message}`);
    }
  }

  async createXrayUser(username, type, days = 30) {
    try {
      const uuid = uuidv4();
      
      // Read current config
      const configData = await fs.readFile(this.xrayConfigPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Find the correct inbound
      let inboundIndex;
      let client;
      
      if (type === 'vless') {
        inboundIndex = 0;
        client = { id: uuid, email: username };
      } else if (type === 'vmess') {
        inboundIndex = 1;
        client = { id: uuid, alterId: 0, email: username };
      } else if (type === 'trojan') {
        inboundIndex = 2;
        client = { password: uuid, email: username };
      } else {
        throw new Error('Invalid Xray type');
      }
      
      // Add client
      if (!config.inbounds[inboundIndex].settings.clients) {
        config.inbounds[inboundIndex].settings.clients = [];
      }
      config.inbounds[inboundIndex].settings.clients.push(client);
      
      // Backup and write config
      await fs.writeFile(this.xrayConfigPath + '.bak', configData);
      await fs.writeFile(this.xrayConfigPath, JSON.stringify(config, null, 2));
      
      // Restart Xray
      await execAsync('systemctl restart xray');
      
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);
      
      return {
        username,
        uuid,
        expires_at: expiryDate.toISOString(),
        type
      };
    } catch (error) {
      console.error('Error creating Xray user:', error);
      throw new Error(`Failed to create ${type.toUpperCase()} user: ${error.message}`);
    }
  }

  async deleteSSHUser(username) {
    try {
      await execAsync(`userdel -r ${username}`);
      return true;
    } catch (error) {
      console.error('Error deleting SSH user:', error);
      throw new Error(`Failed to delete SSH user: ${error.message}`);
    }
  }

  async deleteXrayUser(username, type) {
    try {
      // Read current config
      const configData = await fs.readFile(this.xrayConfigPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Find the correct inbound
      let inboundIndex;
      if (type === 'vless') inboundIndex = 0;
      else if (type === 'vmess') inboundIndex = 1;
      else if (type === 'trojan') inboundIndex = 2;
      else throw new Error('Invalid Xray type');
      
      // Remove client
      const clients = config.inbounds[inboundIndex].settings.clients;
      config.inbounds[inboundIndex].settings.clients = clients.filter(
        client => client.email !== username
      );
      
      // Backup and write config
      await fs.writeFile(this.xrayConfigPath + '.bak', configData);
      await fs.writeFile(this.xrayConfigPath, JSON.stringify(config, null, 2));
      
      // Restart Xray
      await execAsync('systemctl restart xray');
      
      return true;
    } catch (error) {
      console.error('Error deleting Xray user:', error);
      throw new Error(`Failed to delete ${type.toUpperCase()} user: ${error.message}`);
    }
  }

  generateConfig(user) {
    const configs = {
      ssh: this.generateSSHConfig(user),
      vless: this.generateVlessConfig(user),
      vmess: this.generateVmessConfig(user),
      trojan: this.generateTrojanConfig(user)
    };
    
    return configs[user.type] || null;
  }

  generateSSHConfig(user) {
    return {
      type: 'ssh',
      host: this.domain,
      port: 22,
      username: user.username,
      password: user.password,
      expires_at: user.expires_at,
      connection_string: `ssh ${user.username}@${this.domain}`
    };
  }

  generateVlessConfig(user) {
    const config = {
      type: 'vless',
      host: this.domain,
      port: 443,
      uuid: user.uuid,
      path: '/vless',
      security: 'tls',
      expires_at: user.expires_at,
      link: `vless://${user.uuid}@${this.domain}:443?path=/vless&security=tls&encryption=none&type=ws#${user.username}`
    };
    return config;
  }

  generateVmessConfig(user) {
    const vmessConfig = {
      v: '2',
      ps: user.username,
      add: this.domain,
      port: '443',
      id: user.uuid,
      aid: '0',
      net: 'ws',
      path: '/vmess',
      type: 'none',
      host: this.domain,
      tls: 'tls'
    };
    
    const link = 'vmess://' + Buffer.from(JSON.stringify(vmessConfig)).toString('base64');
    
    return {
      type: 'vmess',
      host: this.domain,
      port: 443,
      uuid: user.uuid,
      path: '/vmess',
      security: 'tls',
      expires_at: user.expires_at,
      link
    };
  }

  generateTrojanConfig(user) {
    return {
      type: 'trojan',
      host: this.domain,
      port: 443,
      password: user.uuid,
      path: '/trojan',
      security: 'tls',
      expires_at: user.expires_at,
      link: `trojan://${user.uuid}@${this.domain}:443?path=/trojan&security=tls&type=ws#${user.username}`
    };
  }
}

module.exports = UserService;
