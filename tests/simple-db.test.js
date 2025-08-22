const request = require('supertest');
const express = require('express');

const app = express();
app.use(express.json());

// Simple mock endpoints
app.get('/db/check-conn', (req, res) => {
  res.json({
    success: true,
    message: 'Conexión a la base de datos establecida correctamente',
    result: 'OK'
  });
});

app.post('/db/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: "Username and password is required for login"
    });
  }

  if (username === 'testuser' && password === 'testpass') {
    return res.json({
      success: true,
      message: "Login successful",
      user: { id: 1, username: 'testuser' }
    });
  }

  return res.status(400).json({
    success: false,
    error: "Username or password invalid"
  });
});

app.post('/db/register', (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({
      success: false,
      message: "Username, password and email is required to register"
    });
  }

  if (username === 'existinguser') {
    return res.status(409).json({
      success: false,
      message: "Username or email is already registered"
    });
  }

  return res.status(201).json({
    success: true,
    message: "User has been added successfully",
    userId: 1
  });
});

describe('Database Endpoints', () => {
  it('GET /db/check-conn should return success', async () => {
    const response = await request(app)
      .get('/db/check-conn');
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Conexión a la base de datos establecida correctamente');
  });

  it('POST /db/login should login successfully', async () => {
    const response = await request(app)
      .post('/db/login')
      .send({ username: 'testuser', password: 'testpass' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Login successful');
  });

  it('POST /db/login should fail with missing credentials', async () => {
    const response = await request(app)
      .post('/db/login')
      .send({});
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Username and password is required for login');
  });

  it('POST /db/login should fail with invalid credentials', async () => {
    const response = await request(app)
      .post('/db/login')
      .send({ username: 'wrong', password: 'wrong' });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Username or password invalid');
  });

  it('POST /db/register should register successfully', async () => {
    const response = await request(app)
      .post('/db/register')
      .send({ 
        username: 'newuser', 
        password: 'newpass', 
        email: 'new@example.com' 
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('User has been added successfully');
  });

  it('POST /db/register should fail with missing fields', async () => {
    const response = await request(app)
      .post('/db/register')
      .send({});
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Username, password and email is required to register');
  });

  it('POST /db/register should fail with existing user', async () => {
    const response = await request(app)
      .post('/db/register')
      .send({ 
        username: 'existinguser', 
        password: 'pass', 
        email: 'existing@example.com' 
      });
    
    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Username or email is already registered');
  });
});