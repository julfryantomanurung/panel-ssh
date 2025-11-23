# API Examples

Contoh lengkap penggunaan REST API dengan berbagai tools.

## Table of Contents
- [cURL Examples](#curl-examples)
- [JavaScript/Node.js Examples](#javascriptnodejs-examples)
- [Python Examples](#python-examples)
- [Postman Collection](#postman-collection)

## cURL Examples

### User Management

#### Create SSH User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key-here" \
  -d '{
    "username": "johndoe",
    "type": "ssh",
    "password": "SecureP@ss123",
    "days": 30
  }'
```

#### Create VLESS User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key-here" \
  -d '{
    "username": "janedoe",
    "type": "vless",
    "days": 30
  }'
```

#### List All Users
```bash
curl http://localhost:3000/api/users \
  -H "X-API-KEY: your-api-key-here"
```

#### List SSH Users Only
```bash
curl "http://localhost:3000/api/users?type=ssh" \
  -H "X-API-KEY: your-api-key-here"
```

#### List Active Users
```bash
curl "http://localhost:3000/api/users?status=active" \
  -H "X-API-KEY: your-api-key-here"
```

#### Get User Config
```bash
curl http://localhost:3000/api/users/1/config \
  -H "X-API-KEY: your-api-key-here"
```

#### Delete User
```bash
curl -X DELETE http://localhost:3000/api/users/1 \
  -H "X-API-KEY: your-api-key-here"
```

### Payment Management

#### Create Payment for SSH Service
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key-here" \
  -d '{
    "service_type": "ssh",
    "username": "newuser123",
    "password": "MyPassword123",
    "payment_method": "BCAVA",
    "customer_name": "John Doe",
    "customer_phone": "08123456789",
    "duration": 30
  }'
```

#### Create Payment for VLESS Service
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key-here" \
  -d '{
    "service_type": "vless",
    "username": "vlessuser",
    "payment_method": "QRIS",
    "customer_name": "Jane Smith",
    "customer_phone": "08198765432",
    "telegram_chat_id": "123456789",
    "duration": 30
  }'
```

#### Get Payment Status
```bash
curl http://localhost:3000/api/payments/T12345678 \
  -H "X-API-KEY: your-api-key-here"
```

## JavaScript/Node.js Examples

### Using Axios

```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const API_KEY = 'your-api-key-here';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-API-KEY': API_KEY,
    'Content-Type': 'application/json'
  }
});

// Create SSH User
async function createSSHUser(username, password, days = 30) {
  try {
    const response = await api.post('/users', {
      username,
      type: 'ssh',
      password,
      days
    });
    console.log('User created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error.response?.data || error.message);
    throw error;
  }
}

// Create VLESS User
async function createVLESSUser(username, days = 30) {
  try {
    const response = await api.post('/users', {
      username,
      type: 'vless',
      days
    });
    console.log('User created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error.response?.data || error.message);
    throw error;
  }
}

// List Users
async function listUsers(type = null, status = null) {
  try {
    const params = {};
    if (type) params.type = type;
    if (status) params.status = status;
    
    const response = await api.get('/users', { params });
    console.log('Users:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error listing users:', error.response?.data || error.message);
    throw error;
  }
}

// Get User Config
async function getUserConfig(userId) {
  try {
    const response = await api.get(`/users/${userId}/config`);
    console.log('User config:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting config:', error.response?.data || error.message);
    throw error;
  }
}

// Delete User
async function deleteUser(userId) {
  try {
    const response = await api.delete(`/users/${userId}`);
    console.log('User deleted:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error deleting user:', error.response?.data || error.message);
    throw error;
  }
}

// Create Payment
async function createPayment(serviceType, username, password, paymentMethod, customerName, customerPhone) {
  try {
    const data = {
      service_type: serviceType,
      username,
      payment_method: paymentMethod,
      customer_name: customerName,
      customer_phone: customerPhone,
      duration: 30
    };
    
    if (serviceType === 'ssh') {
      data.password = password;
    }
    
    const response = await api.post('/payments/create', data);
    console.log('Payment created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating payment:', error.response?.data || error.message);
    throw error;
  }
}

// Get Payment Status
async function getPaymentStatus(invoiceId) {
  try {
    const response = await api.get(`/payments/${invoiceId}`);
    console.log('Payment status:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting payment status:', error.response?.data || error.message);
    throw error;
  }
}

// Example usage
(async () => {
  try {
    // Create SSH user
    await createSSHUser('testuser', 'password123', 30);
    
    // Create VLESS user
    await createVLESSUser('vlessuser', 30);
    
    // List all SSH users
    await listUsers('ssh', 'active');
    
    // Get user config
    await getUserConfig(1);
    
    // Create payment
    await createPayment('ssh', 'newuser', 'pass123', 'BCAVA', 'John Doe', '08123456789');
    
    // Get payment status
    await getPaymentStatus('T12345678');
  } catch (error) {
    console.error('Error:', error);
  }
})();
```

### Using Fetch (Browser/Node 18+)

```javascript
const API_BASE_URL = 'http://localhost:3000/api';
const API_KEY = 'your-api-key-here';

async function apiRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'X-API-KEY': API_KEY,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }
  
  return data;
}

// Create user
async function createUser(username, type, password = null, days = 30) {
  const body = { username, type, days };
  if (password) body.password = password;
  
  return await apiRequest('/users', 'POST', body);
}

// List users
async function listUsers(filters = {}) {
  const params = new URLSearchParams(filters);
  return await apiRequest(`/users?${params}`);
}

// Delete user
async function deleteUser(userId) {
  return await apiRequest(`/users/${userId}`, 'DELETE');
}

// Create payment
async function createPayment(paymentData) {
  return await apiRequest('/payments/create', 'POST', paymentData);
}
```

## Python Examples

### Using Requests Library

```python
import requests
import json

API_BASE_URL = 'http://localhost:3000/api'
API_KEY = 'your-api-key-here'

class VPNPanelAPI:
    def __init__(self, base_url=API_BASE_URL, api_key=API_KEY):
        self.base_url = base_url
        self.headers = {
            'X-API-KEY': api_key,
            'Content-Type': 'application/json'
        }
    
    def create_user(self, username, user_type, password=None, days=30):
        """Create a new user"""
        data = {
            'username': username,
            'type': user_type,
            'days': days
        }
        if password:
            data['password'] = password
        
        response = requests.post(
            f'{self.base_url}/users',
            headers=self.headers,
            json=data
        )
        return response.json()
    
    def list_users(self, user_type=None, status=None):
        """List all users with optional filters"""
        params = {}
        if user_type:
            params['type'] = user_type
        if status:
            params['status'] = status
        
        response = requests.get(
            f'{self.base_url}/users',
            headers=self.headers,
            params=params
        )
        return response.json()
    
    def get_user_config(self, user_id):
        """Get user configuration"""
        response = requests.get(
            f'{self.base_url}/users/{user_id}/config',
            headers=self.headers
        )
        return response.json()
    
    def delete_user(self, user_id):
        """Delete a user"""
        response = requests.delete(
            f'{self.base_url}/users/{user_id}',
            headers=self.headers
        )
        return response.json()
    
    def create_payment(self, service_type, username, payment_method, 
                      customer_name, customer_phone, password=None, 
                      telegram_chat_id=None, duration=30):
        """Create a payment invoice"""
        data = {
            'service_type': service_type,
            'username': username,
            'payment_method': payment_method,
            'customer_name': customer_name,
            'customer_phone': customer_phone,
            'duration': duration
        }
        
        if password:
            data['password'] = password
        if telegram_chat_id:
            data['telegram_chat_id'] = telegram_chat_id
        
        response = requests.post(
            f'{self.base_url}/payments/create',
            headers=self.headers,
            json=data
        )
        return response.json()
    
    def get_payment_status(self, invoice_id):
        """Get payment status"""
        response = requests.get(
            f'{self.base_url}/payments/{invoice_id}',
            headers=self.headers
        )
        return response.json()

# Example usage
if __name__ == '__main__':
    api = VPNPanelAPI()
    
    # Create SSH user
    result = api.create_user('testuser', 'ssh', 'password123', 30)
    print('SSH User created:', json.dumps(result, indent=2))
    
    # Create VLESS user
    result = api.create_user('vlessuser', 'vless', days=30)
    print('VLESS User created:', json.dumps(result, indent=2))
    
    # List all SSH users
    result = api.list_users(user_type='ssh', status='active')
    print('SSH Users:', json.dumps(result, indent=2))
    
    # Get user config
    result = api.get_user_config(1)
    print('User config:', json.dumps(result, indent=2))
    
    # Create payment
    result = api.create_payment(
        service_type='ssh',
        username='newuser',
        password='pass123',
        payment_method='BCAVA',
        customer_name='John Doe',
        customer_phone='08123456789'
    )
    print('Payment created:', json.dumps(result, indent=2))
    
    # Get payment status
    result = api.get_payment_status('T12345678')
    print('Payment status:', json.dumps(result, indent=2))
```

## Postman Collection

Import collection ini ke Postman:

```json
{
  "info": {
    "name": "VPN Panel API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api"
    },
    {
      "key": "apiKey",
      "value": "your-api-key-here"
    }
  ],
  "item": [
    {
      "name": "Users",
      "item": [
        {
          "name": "Create SSH User",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "X-API-KEY",
                "value": "{{apiKey}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"testuser\",\n  \"type\": \"ssh\",\n  \"password\": \"password123\",\n  \"days\": 30\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": "{{baseUrl}}/users"
          }
        },
        {
          "name": "List Users",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "X-API-KEY",
                "value": "{{apiKey}}"
              }
            ],
            "url": "{{baseUrl}}/users"
          }
        },
        {
          "name": "Get User Config",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "X-API-KEY",
                "value": "{{apiKey}}"
              }
            ],
            "url": "{{baseUrl}}/users/1/config"
          }
        },
        {
          "name": "Delete User",
          "request": {
            "method": "DELETE",
            "header": [
              {
                "key": "X-API-KEY",
                "value": "{{apiKey}}"
              }
            ],
            "url": "{{baseUrl}}/users/1"
          }
        }
      ]
    },
    {
      "name": "Payments",
      "item": [
        {
          "name": "Create Payment",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "X-API-KEY",
                "value": "{{apiKey}}"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"service_type\": \"ssh\",\n  \"username\": \"newuser\",\n  \"password\": \"password123\",\n  \"payment_method\": \"BCAVA\",\n  \"customer_name\": \"John Doe\",\n  \"customer_phone\": \"08123456789\",\n  \"duration\": 30\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": "{{baseUrl}}/payments/create"
          }
        },
        {
          "name": "Get Payment Status",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "X-API-KEY",
                "value": "{{apiKey}}"
              }
            ],
            "url": "{{baseUrl}}/payments/T12345678"
          }
        }
      ]
    }
  ]
}
```

## Response Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (Missing API Key)
- `403` - Forbidden (Invalid API Key)
- `404` - Not Found
- `429` - Too Many Requests (Rate Limited)
- `500` - Internal Server Error

## Error Response Format

```json
{
  "success": false,
  "message": "Error description here"
}
```
