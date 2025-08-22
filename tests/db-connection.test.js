const request = require('supertest');
const express = require('express');

// Create a test Express app
const testApp = express();
testApp.use(express.json());

// Mock database functions
const mockDbFunctions = {
  checkConnection: jest.fn(),
  loginUser: jest.fn(),
  registerUser: jest.fn()
};

// Mock endpoints
testApp.get('/db/check-conn', async (req, res) => {
  try {
    const result = await mockDbFunctions.checkConnection();
    res.json({
      success: true,
      message: 'Conexión a la base de datos establecida correctamente',
      result: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al conectar a la base de datos',
      error: error.message
    });
  }
});

testApp.post('/db/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: "Username and password is required for login"
    });
  }

  try {
    const user = await mockDbFunctions.loginUser(username, password);
    if (user) {
      return res.json({
        success: true,
        message: "Login successful",
        user: user
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Username or password invalid"
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Something went wrong, try again later",
      details: error.message
    });
  }
});

testApp.post('/db/register', async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({
      success: false,
      message: "Username, password and email is required to register"
    });
  }

  try {
    const result = await mockDbFunctions.registerUser(username, password, email);
    return res.status(201).json({
      success: true,
      message: "User has been added successfully",
      userId: result.userId
    });
  } catch (error) {
    if (error.message.includes('already registered')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    return res.status(500).json({
      success: false,
      message: "Error during register",
      error: error.message
    });
  }
});

describe('Database Connection Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /db/check-conn', () => {
    it('should return successful database connection', async () => {
      mockDbFunctions.checkConnection.mockResolvedValue('OK');

      const response = await request(testApp)
        .get('/db/check-conn');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Conexión a la base de datos establecida correctamente',
        result: 'OK'
      });
    });

    it('should handle database connection error', async () => {
      mockDbFunctions.checkConnection.mockRejectedValue(new Error('Connection failed'));

      const response = await request(testApp)
        .get('/db/check-conn');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: 'Error al conectar a la base de datos',
        error: 'Connection failed'
      });
    });
  });

  describe('POST /db/login', () => {
    it('should login user successfully', async () => {
      mockDbFunctions.loginUser.mockResolvedValue({
        id: 1,
        username: 'testuser'
      });

      const response = await request(testApp)
        .post('/db/login')
        .send({
          username: 'testuser',
          password: 'testpass'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Login successful',
        user: {
          id: 1,
          username: 'testuser'
        }
      });
    });

    it('should return error for missing credentials', async () => {
      const response = await request(testApp)
        .post('/db/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Username and password is required for login'
      });
    });

    it('should return error for invalid credentials', async () => {
      mockDbFunctions.loginUser.mockResolvedValue(null);

      const response = await request(testApp)
        .post('/db/login')
        .send({
          username: 'wronguser',
          password: 'wrongpass'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Username or password invalid'
      });
    });
  });

  describe('POST /db/register', () => {
    it('should register user successfully', async () => {
      mockDbFunctions.registerUser.mockResolvedValue({ userId: 1 });

      const response = await request(testApp)
        .post('/db/register')
        .send({
          username: 'newuser',
          password: 'newpass',
          email: 'newuser@example.com'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: 'User has been added successfully',
        userId: 1
      });
    });

    it('should return error for missing fields', async () => {
      const response = await request(testApp)
        .post('/db/register')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: 'Username, password and email is required to register'
      });
    });

    it('should return error for existing user', async () => {
      mockDbFunctions.registerUser.mockRejectedValue(new Error('Username or email is already registered'));

      const response = await request(testApp)
        .post('/db/register')
        .send({
          username: 'existinguser',
          password: 'pass',
          email: 'existing@example.com'
        });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        success: false,
        message: 'Username or email is already registered'
      });
    });
  });
});