// Servidor
import express from "express"           // Correr el servidor
import session from 'express-session';  // Crear sesiones en express (datos guardados en el servidor)
import path from "path";                // Creacion de rutas
import yahooFinance from "yahoo-finance2";
import pool from "./dbConfig.mjs";

// Middlewares para cambias de pagina
import cors from "cors"                 // Aceptar todas la fuentes
import bodyParser from 'body-parser';   // Renderizar paginas
import { fileURLToPath } from 'url';    // Trabajar con urls 

// Configuracion modular (ruteos)
const __filename = fileURLToPath(import.meta.url);  // Obtenemos la carpeta actual
const __dirname = path.dirname(__filename);         // Creamos una ruta default para añadirla como prefijo

// Creamos una referencia al servidor
const app = express();

// Configuración de sesión
app.use(session({
    secret: 'g4ZnXXORT8zQ72tUkdezT3BlbkFJX5CUdf5CO1yITWEOdaJY',  // Llave
    resave: false,                 //
    saveUninitialized: true,
    cookie: { secure: false }
}));


// Middlewares
app.use(cors());                                    // Aceptar todas las fuentes
app.use(express.json());
app.use(bodyParser.json());                         // Aceptar peticiones JSON
app.use(bodyParser.urlencoded({ extended: true })); // Aceptar encoded en URL

// Servir archivos estáticos (CSS, JS, imágenes)
app.use(express.static(path.join(__dirname, 'public')));    // Creamos la ruta para encontrar los archivos dentro de la carpeta public (archivos estaticos)

// Configuración para renderizar plantillas
app.set('view engine', 'ejs');                      // Motor .ejs permite plantillas HTML con codigo dinamico (codigo incrustrado)
app.set('views', path.join(__dirname, 'views'));

// Ruta principal - Sirve index.html
// app.get('/', (req, res) => {
//     res.render('index', {});
// });

// Middleware para verificar autenticación
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        // Usuario autenticado, continuar
        next();
    } else {
        // Usuario no autenticado, redirigir a login
        res.redirect('/login');
    }
};

app.get('/', (req, res) => {
    res.render('index', {
        user: req.session.user || null // Envía el usuario o null si no está logueado
    });
});

app.get('/login', (req, res) => {
    res.render('login', {});
});

app.get('/register', (req, res) => {
    res.render('register', {});
});

app.get('/quiz', (req, res) => {
    const userId = req.query.id; // Obtener el ID de la URL
    res.render('quiz', { userId: userId });
});

// Rutas protegidas que requieren autenticación
app.get('/balance', requireAuth, (req, res) => {
    console.log(req.session.user);
    res.render('balance', {
        user: req.session.user // Ya está autenticado, no necesita el operador ||
    });
});

app.get('/port-selector', requireAuth, (req, res) => {
    res.render('port-selector', {
        user: req.session.user
    });
});

app.get('/market', requireAuth, (req, res) => {
    res.render('market', {
        user: req.session.user
    });
});

app.get('/analyse', requireAuth, (req, res) => {
    res.render('analyse', {
        user: req.session.user
    });
});

app.get('/analyse/historic', requireAuth, (req, res) => {
  const stock = req.query.stock || 'IBM'; // Valor por defecto 'IBM'
  res.render('historic', { stock: stock, user : req.session.user });
});

// Ruta para renderizar la plantilla de assets de un portfolio específico
// app.get('/portfolio-info', requireAuth, (req, res) => {
//     const { portfolioId } = req.params;
//     res.render('portfolio-assets', {
//         portfolioId: portfolioId,
//         user: req.session.user, // Añadir usuario a la plantilla
//         title: `Portfolio ${portfolioId}`
//     });
// });

app.get('/portfolio-info', requireAuth, (req, res) => {
    try {
        // Obtener el portfolioId de la sesión en lugar de los parámetros
        const portfolioId = req.session.portfolioId;
        
        // Verificar que el portfolioId existe en la sesión
        if (!portfolioId) {
            // Redirigir a una página de selección o mostrar error
            return res.status(400).render('error', {
                message: 'No se ha seleccionado ningún portfolio',
                user: req.session.user,
                title: 'Error - Portfolio no seleccionado',
                redirectUrl: '/seleccionar-portfolio' // Opcional: URL para redirigir
            });
        }
        
        // Renderizar la plantilla con el portfolioId de la sesión
        res.render('portfolio-assets', {
            portfolioId: portfolioId,
            user: req.session.user
        });
        
    } catch (error) {
        console.error('Error en /portfolio-info:', error);
        res.status(500).render('error', {
            message: 'Error interno del servidor',
            user: req.session.user,
            title: 'Error'
        });
    }
});

app.get('/portfolio/assets/:portfolioId', requireAuth, (req, res) => {
    try {
        const { portfolioId } = req.params;
        
        // Guardar el portfolioId en la sesión
        req.session.portfolioId = portfolioId;
    
        // Redirigir a /portafolio-info
        res.redirect('/portfolio-info');
        
    } catch (error) {
        console.error('Error al guardar portfolio en sesión:', error);
        res.status(500);
    }
});

app.get('/logout', requireAuth, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            // Manejar error de forma más robusta
            console.error('Log out error:', err);
            return res.status(500).send('Log Out error');
        }
        res.redirect('/');
    });
});


//----------------------------------------------------------- DATABASE REQUEST ----------------------------------------------------

app.get("/db/check-conn", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT 1 + 1 AS solution');
    connection.release();
    
    res.json({
      success: true,
      message: 'Conexión a la base de datos establecida correctamente',
      result: rows[0].solution === 2 ? 'OK' : 'Error'
    });
  } catch (error) {
    console.error('Error al conectar a la base de datos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al conectar a la base de datos',
      error: error.message
    });
  }
});

app.post("/db/login", async (req, res) => {
  const { username, password } = req.body;
  try{
    if(!username || !password){
      return res.status(400).json({
        success: false,
        error : "Username and password is required for login"
      });
    }

    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password]
    );

    if(users.length === 0){
      return res.status(400).json({
        success: false,
        error: "Username or password invalid"
      });
    }
    
    const login_user = users[0];
    // console.log(login_user);
    req.session.user = {
      id: login_user.user_id,
      username: login_user.username,
      // No guardar la password en sesión por seguridad
      loggedIn: true,
      loginTime: new Date()
    };

    return res.json({
      success: true,
      message: "Login successful",
      user:{
        id: login_user.id,
        username: login_user.username,
        password: login_user.password
      }
    });

  } catch(err){
    console.err(err);
    return res.status(500).json({
      success: false,
      error: "Something went wrong, try again later",
      details: err.message,
    });
  }
});


app.post("/db/register", async (req, res) => {
  const { username, password, email } = req.body;

  // Validación
  if(!username || !password || !email){
    return res.status(400).json({
      success: false,
      message: "Username, password and email is required to register"
    });
  }

  try {
    const connection = await pool.getConnection();
    
    // Verificar usuario existente (con await)
    const [existingUsers] = await connection.query(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    console.log(existingUsers);

    if(existingUsers.length > 0){
      console.log("ENTRO A ESTE PUNTO");  
      connection.release();
      return res.status(409).json({
        success: false,
        message: "Username or email is already registered"
      });
    }

    // Insertar nuevo usuario (3 ? para 3 valores)
    const [result] = await connection.query(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, password, email]
    );

    const [portfolio] = await connection.query(
      'INSERT INTO portfolios (user_id) VALUES (?)',
      [username]
    );

    connection.release();


    return res.status(201).json({
      success: true,
      message: "User has been added successfully",
      userId: result.insertId
    });

  } catch(err) {
    console.error("Registration error:", err);
    return res.status(500).json({
      success: false,  // Corregido a false
      message: "Error during register",
      error: err.message
    });
  }
});

// app.post("/db/register", async (req, res) => {
//   const { username, password, email } = req.body;

//   // Validación
//   if(!username || !password || !email){
//     return res.status(400).json({
//       success: false,
//       message: "Username, password and email is required to register"
//     });
//   }

//   // Validación de email
//   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//   if (!emailRegex.test(email)) {
//     return res.status(400).json({
//       success: false,
//       message: "Please provide a valid email address"
//     });
//   }

//   // Validación de fortaleza de password
//   if (password.length < 6) {
//     return res.status(400).json({
//       success: false,
//       message: "Password must be at least 6 characters long"
//     });
//   }

//   try {
//     const connection = await pool.getConnection();
    
//     // Verificar usuario existente
//     const [existingUsers] = await connection.query(
//       'SELECT * FROM users WHERE username = ? OR email = ?',
//       [username, email]
//     );

//     if(existingUsers.length > 0){
//       connection.release();
      
//       // Detectar específicamente qué existe
//       const usernameExists = existingUsers.some(user => user.username === username);
//       const emailExists = existingUsers.some(user => user.email === email);
      
//       let message = "Registration failed";
//       if (usernameExists && emailExists) {
//         message = "Username and email are already registered";
//       } else if (usernameExists) {
//         message = "Username is already taken";
//       } else if (emailExists) {
//         message = "Email is already registered";
//       }

//       return res.status(409).json({
//         success: false,
//         message: message,
//         conflict: {
//           username: usernameExists,
//           email: emailExists
//         }
//       });
//     }

//     // Insertar nuevo usuario
//     const [result] = await connection.query(
//       'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
//       [username, password, email]
//     );

//     connection.release();

//     // Crear sesión automáticamente después del registro
//     req.session.user = {
//       id: result.insertId,
//       username: username,
//       email: email,
//       loggedIn: true,
//       loginTime: new Date(),
//       isNewUser: true // Bandera para identificar usuario recién registrado
//     };

//     // Guardar la sesión
//     req.session.save((err) => {
//       if (err) {
//         console.error('Session save error:', err);
//         // Aún así responder éxito pero con advertencia de sesión
//         return res.status(201).json({
//           success: true,
//           message: "User registered successfully but session creation failed",
//           userId: result.insertId,
//           warning: "Please login manually"
//         });
//       }

//       // Respuesta exitosa con datos de sesión
//       return res.status(201).json({
//         success: true,
//         message: "User registered and logged in successfully",
//         user: {
//           id: result.insertId,
//           username: username,
//           email: email
//         },
//         sessionCreated: true
//       });
//     });

//   } catch(err) {
//     console.error("Registration error:", err);
    
//     // Manejar errores específicos de base de datos
//     if (err.code === 'ER_DUP_ENTRY') {
//       return res.status(409).json({
//         success: false,
//         message: "Username or email already exists",
//         error: "Duplicate entry"
//       });
//     }
    
//     return res.status(500).json({
//       success: false,
//       message: "Error during registration",
//       error: process.env.NODE_ENV === 'development' ? err.message : "Internal server error"
//     });
//   }
// });

// Cambiar riesgo


app.post("/db/change-risk", async (req, res) => {
  const { risk, userId } = req.body;

  // Validación
  if(!risk || !userId){
    return res.status(400).json({
      success: false,
      message: "Risk and userID is required to register"
    });
  }

  try {
    const connection = await pool.getConnection();
    
    // Verificar usuario existente (con await)
    const [existingUsers] = await connection.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if(existingUsers.length === 0){
      connection.release();
      return res.status(409).json({
        success: false,
        message: "Username not found  "
      });
    }

    // Insertar nuevo usuario (3 ? para 3 valores)
    const [result] = await connection.query(
      "UPDATE users SET riskLevel = ? WHERE id = ?;",
      [risk, userId]
    );

    connection.release();

    return res.status(201).json({
      success: true,
      message: "Risk has been changed successfully",
      userId: result.insertId
    });

  } catch(err) {
    console.error("Change risk error:", err);
    return res.status(500).json({
      success: false,  // Corregido a false
      message: "Error during change risk",
      error: err.message
    });
  }
});

// Hacer un deposito
app.post("/db/deposit", async (req, res) => {
    try {
        const { userId, amount, description } = req.body;
        
        // Validaciones
        if (!userId || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Datos inválidos' });
        }

        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Llamar al procedimiento almacenado
            await connection.execute(
                'CALL make_deposit(?, ?, ?)',
                [userId, amount, description || 'Depósito realizado']
            );
            
            await connection.commit();
            
            res.json({ 
                success: true, 
                message: 'Depósito realizado exitosamente',
                amount: amount
            });
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('Error en depósito:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Hacer un retiro
app.post("/db/withdrawal",async (req, res) => {
    try {
        const { userId, amount, description } = req.body;
        
        if (!userId || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Datos inválidos' });
        }

        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            await connection.execute(
                'CALL make_withdrawal(?, ?, ?)',
                [userId, amount, description || 'Retiro realizado']
            );
            
            await connection.commit();
            
            res.json({ 
                success: true, 
                message: 'Retiro realizado exitosamente',
                amount: amount
            });
            
        } catch (error) {
            await connection.rollback();
            
            if (error.message.includes('Saldo insuficiente')) {
                return res.status(400).json({ error: 'Saldo insuficiente' });
            }
            throw error;
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('Error en retiro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener información de un usuario específico
app.get("/db/user/:id", async (req, res) => {
  const userId = req.params.id;

  if(!userId || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      message: "Se requiere un ID de usuario válido"
    });
  }

  try {
    const connection = await pool.getConnection();
    
    // Obtener datos básicos del usuario
    const [userRows] = await connection.query(
      'SELECT user_id, username, email, riskLevel, balance FROM users WHERE user_id = ?',
      [userId]
    );

    if(userRows.length === 0){
      connection.release();
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    const userData = userRows[0];

    connection.release();

    userData.balance = parseFloat(userData.balance);

    return res.status(200).json({
      success: true,
      data: userData
    });

  } catch(err) {
    console.error("Error al obtener usuario:", err);
    return res.status(500).json({
      success: false,
      message: "Error al obtener información del usuario",
      error: err.message
    });
  }
});

app.get("/db/user/email/:email", async (req, res) => {
  const email = req.params.email;

  if(!email) {
    return res.status(400).json({
      success: false,
      message: "Se requiere un email de usuario válido"
    });
  }

  try {
    const connection = await pool.getConnection();
    
    // Obtener datos básicos del usuario
    const [userRows] = await connection.query(
      'SELECT user_id, username, email, password, riskLevel, balance FROM users WHERE email = ?',
      [email]
    );

    if(userRows.length === 0){
      connection.release();
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    const userData = userRows[0];

    connection.release();

    userData.balance = parseFloat(userData.balance);

    return res.status(200).json({
      success: true,
      data: userData
    });

  } catch(err) {
    console.error("Error al obtener usuario:", err);
    return res.status(500).json({
      success: false,
      message: "Error al obtener información del usuario",
      error: err.message
    });
  }
});

// Obtener transacciones de un usuario
app.get("/db/transactions/:userId", async (req, res) => {
  const userId = req.params.userId;
  const { limit = 10, offset = 0 } = req.query;

  if(!userId || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      message: "Se requiere un ID de usuario válido"
    });
  }

  try {
    const connection = await pool.getConnection();
    
    // Obtener transacciones del usuario
    const [transactions] = await connection.query(
      `SELECT transaction_id, user_id as userId, type, amount, transaction_date as transactionDate, 
       status, description 
       FROM transactions 
       WHERE user_id = ? 
       ORDER BY transaction_date DESC 
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    // Obtener conteo total para paginación
    const [countRows] = await connection.query(
      'SELECT COUNT(*) as total FROM transactions WHERE user_id = ?',
      [userId]
    );

    const processedTransactions = transactions.map(tx => ({
      ...tx,
      amount: parseFloat(tx.amount)
    }));

    connection.release();

    return res.status(200).json({
      success: true,
      data: processedTransactions,
      total: parseFloat(countRows[0].total)
    });

  } catch(err) {
    console.error("Error al obtener transacciones:", err);
    return res.status(500).json({
      success: false,
      message: "Error al obtener transacciones",
      error: err.message
    });
  }
});

// Endpoint para obtener portafolios de un usuario
app.get("/db/portfolios/:userId", async (req, res) => {
  const userId = req.params.userId;

  if (!userId || isNaN(userId)) {
    return res.status(400).json({
      success: false,
      message: "Se requiere un ID de usuario válido"
    });
  }

  try {
    const connection = await pool.getConnection();
    
    // Verificar si el usuario existe
    const [userRows] = await connection.query(
      'SELECT user_id FROM users WHERE user_id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado"
      });
    }

    // Obtener los portafolios del usuario
    const [portfolioRows] = await connection.query(
      `SELECT p.portfolio_id, p.name, p.description, p.created_at, p.updated_at,
              COUNT(pa.pa_id) as assets_count,
              COALESCE(SUM(pa.total_invested), 0) as total_invested
       FROM portfolios p
       LEFT JOIN portfolio_assets pa ON p.portfolio_id = pa.portfolio_id
       WHERE p.user_id = ?
       GROUP BY p.portfolio_id
       ORDER BY p.created_at DESC`,
      [userId]
    );

    connection.release();

    // Convertir valores numéricos
    const portfolios = portfolioRows.map(portfolio => {
      return {
        ...portfolio,
        total_invested: parseFloat(portfolio.total_invested)
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        user_id: parseInt(userId),
        portfolios: portfolios,
        count: portfolios.length
      }
    });

  } catch (err) {
    console.error("Error al obtener portafolios:", err);
    return res.status(500).json({
      success: false,
      message: "Error al obtener los portafolios del usuario",
      error: err.message
    });
  }
});

app.get("/db/portfolio/assets/:portfolioId", async (req, res) => {
  const portfolioId = req.params.portfolioId;

  if (!portfolioId || isNaN(portfolioId)) {
    return res.status(400).json({
      success: false,
      message: "Se requiere un ID de portafolio válido"
    });
  }

  try {
    const connection = await pool.getConnection();
    
    // Verificar si el portafolio existe
    const [portfolioRows] = await connection.query(
      'SELECT portfolio_id, name FROM portfolios WHERE portfolio_id = ?',
      [portfolioId]
    );

    if (portfolioRows.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: "Portafolio no encontrado"
      });
    }

    // Obtener los activos del portafolio
    const [assetRows] = await connection.query(
      `SELECT pa_id, asset_symbol, quantity, acquisition_price, total_invested, 
              created_at, updated_at
       FROM portfolio_assets
       WHERE portfolio_id = ?
       ORDER BY asset_symbol`,
      [portfolioId]
    );

    connection.release();

    // Convertir valores numéricos
    const assets = assetRows.map(asset => {
      return {
        ...asset,
        quantity: parseFloat(asset.quantity),
        acquisition_price: parseFloat(asset.acquisition_price),
        total_invested: parseFloat(asset.total_invested)
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        portfolio: {
          portfolio_id: parseInt(portfolioId),
          name: portfolioRows[0].name
        },
        assets: assets,
        count: assets.length,
        total_value: assets.reduce((sum, asset) => sum + asset.total_invested, 0)
      }
    });

  } catch (err) {
    console.error("Error al obtener activos del portafolio:", err);
    return res.status(500).json({
      success: false,
      message: "Error al obtener los activos del portafolio",
      error: err.message
    });
  }
});

// Endpoint para comprar activos
app.post("/db/buy-asset",async (req, res) => {
    try {
        const { userId, portfolioId, assetSymbol, quantity, price } = req.body;
        
        // Validaciones
        if (!userId || !portfolioId || !assetSymbol ){//|| !quantity || !price) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        if (quantity < 0 || price < 0) {
            return res.status(400).json({ error: 'Cantidad y precio deben ser positivos' });
        }

        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Llamar al procedimiento almacenado de compra
            await connection.execute(
                'CALL execute_buy_trading(?, ?, ?, ?, ?)',
                [userId, portfolioId, assetSymbol, quantity, price]
            );
            
            await connection.commit();
            
            res.json({ 
                success: true, 
                message: 'Compra realizada exitosamente',
                asset: assetSymbol,
                quantity: quantity,
                total: quantity * price
            });
            
        } catch (error) {
            await connection.rollback();
            
            if (error.message.includes('Saldo insuficiente')) {
                return res.status(400).json({ error: 'Saldo insuficiente' });
            }
            
            console.error('Error en compra:', error);
            res.status(500).json({ error: 'Error en la operación de compra' });
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('Error en compra:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para vender activos
app.post("/db/sell-asset", async (req, res) => {
    try {
        const { userId, portfolioId, assetSymbol, quantity, price } = req.body;
        
        // Validaciones
        if (!userId || !portfolioId || !assetSymbol || !quantity || !price) {
            return res.status(400).json({ error: 'Todos los campos son requeridos' });
        }

        if (quantity <= 0 || price <= 0) {
            return res.status(400).json({ error: 'Cantidad y precio deben ser positivos' });
        }

        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Llamar al procedimiento almacenado de venta
            await connection.execute(
                'CALL execute_sell_trading(?, ?, ?, ?, ?)',
                [userId, portfolioId, assetSymbol, quantity, price]
            );
            
            await connection.commit();
            
            res.json({ 
                success: true, 
                message: 'Venta realizada exitosamente',
                asset: assetSymbol,
                quantity: quantity,
                total: quantity * price
            });
            
        } catch (error) {
            await connection.rollback();
            
            if (error.message.includes('Cantidad insuficiente')) {
                return res.status(400).json({ error: 'No tienes suficientes activos para vender' });
            }
            
            console.error('Error en venta:', error);
            res.status(500).json({ error: 'Error en la operación de venta' });
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('Error en venta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

//-------------------------------------------------------------- API REQUEST ----------------------------------------------------

// // Endpoint para buscar stocks 
app.get("/api/search/:symbol", async (req, res) => {
  const { symbol } = req.params;

  try {
    const searchResults = await yahooFinance.search(symbol, {
      quotesCount: 100,  // Número máximo de resultados
      newsCount: 0      // No necesitamos noticias en la búsqueda
    });

    

    // Filtrar y formatear los resultados
    const stocks = searchResults.quotes
      .filter(quote => quote.symbol && quote.shortname)
      .map(quote => ({
        symbol: quote.symbol,
        name: quote.shortname,
        exchange: quote.exchDisp,
        type: quote.quoteType,
        sector: quote.sector || 'N/A',
      }));

    res.json({
      success:true,
      symbol,
      count: stocks.length,
      results: stocks
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success:false,
      error: "Error en la búsqueda",
      details: err.message 
    });
  }
});

// // Endpoint para pedir datos históricos
app.get("/api/historical/:symbol", async (req, res) => {
  const { symbol } = req.params;

  try {
    const hist = await yahooFinance.chart(symbol, {
      /*period1: "1900-01-01",*/
      period1: "2020-01-01",
      period2: new Date(),
      interval: "1d"
    });

    const ohlc = hist.quotes
    res.json({symbol, ohlc});
  } catch (err) {
    console.error(err);
    console.error(err);
    res.status(500).json({ 
      error: "Error al obtener datos historicos",
      details: err.message 
    });
  }
});

app.get("/api/today/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const { interval = "1m" } = req.query; // Intervalo: 1m, 5m, 15m, etc.

  try {
    // Obtener fecha actual en formato YYYY-MM-DD
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Obtener datos del día actual
    const hist = await yahooFinance.chart(symbol, {
      period1: todayStr, // Inicio del día actual
      period2: new Date(), // Hora actual
      interval: interval // Intervalo de tiempo (1m, 5m, 15m, 1h)
    });

    // Filtrar solo los datos válidos (sin valores null)
    const todayData = hist.quotes.filter(quote => 
      quote.date && quote.open && quote.high && quote.low && quote.close
    );

    // Formatear respuesta
    const response = {
      symbol,
      interval,
      name:hist.meta.shortName,
      marketOpen: todayStr,
      lastUpdate: new Date().toISOString(),
      dataPoints: todayData.map(quote => ({
        time: quote.date.toISOString(),
        open: quote.open.toFixed(2),
        high: quote.high.toFixed(2),
        low: quote.low.toFixed(2),
        close: quote.close.toFixed(2),
        volume: quote.volume.toFixed(2)
      }))
    };

    res.json(response);

  } catch (err) {
    console.error(`Error getting today's data for ${symbol}:`, err);
    res.status(500).json({ 
      error: `Error al obtener datos del día para ${symbol}`,
      details: err.message 
    });
  }
});

// Endpoint para obtener noticias de un stock
app.get("/api/news/:symbol", async (req, res) => {
  const { symbol } = req.params;
  const { count = 5 } = req.query; // Número de noticias a devolver (default: 5)

  try {
    // Obtener información básica del símbolo para el nombre completo
    const quote = await yahooFinance.quote(symbol);
    const companyName = quote.shortName || quote.longName || symbol;
    
    // Buscar noticias relacionadas
    const news = await yahooFinance.search(companyName, {
      newsCount: parseInt(count),
      quotesCount: 0 // No necesitamos datos de cotización aquí
    });

    // Formatear la respuesta
    const formattedNews = news.news.map(item => ({
      title: item.title,
      publisher: item.publisher,
      link: item.link,
      date: new Date(item.providerPublishTime * 1000).toISOString(),
      thumbnail: item.thumbnail?.resolutions?.[0]?.url
    }));

    res.json({
      symbol,
      companyName,
      news: formattedNews
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      error: "Error al obtener noticias",
      details: err.message 
    });
  }
});

// Endpoint para información actual de cotización del activo (precio y datos de trading)
app.get("/api/quote/:symbol", async (req, res) => {
  const { symbol } = req.params;

  try {
    // Obtener datos básicos de cotización
    const quote = await yahooFinance.quote(symbol);
    
    // Obtener datos fundamentales adicionales
    const fundamentals = await yahooFinance.quoteSummary(symbol, {
      modules: [
        'summaryProfile', // Sector, industria, descripción
        'financialData', // Recomendaciones, margenes
        'defaultKeyStatistics', // Ratios avanzados
        'earnings' // Crecimiento de ganancias
      ]
    });

    // Formatear la respuesta con datos completos
    const response = {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName,
      exchange: quote.exchangeName,
      currency: quote.currency,
      currentPrice: quote.regularMarketPrice,
      previousClose: quote.regularMarketPreviousClose,
      open: quote.regularMarketOpen,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      bid: quote.bid,
      ask: quote.ask,
      bidSize: quote.bidSize,
      askSize: quote.askSize,
      marketCap: quote.marketCap,
      peRatio: quote.trailingPE,
      dividendYield: quote.trailingAnnualDividendYield,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      isMarketOpen: quote.marketState === 'REGULAR',
      lastUpdated: new Date().toISOString(),
      fundamentals: {
        // Datos de perfil
        sector: fundamentals.summaryProfile?.sector || 'N/A',
        industry: fundamentals.summaryProfile?.industry || 'N/A',
        employees: fundamentals.summaryProfile?.fullTimeEmployees,
        country: fundamentals.summaryProfile?.country,
        
        // Datos financieros clave
        recommendation: fundamentals.financialData?.recommendationKey,
        profitMargins: fundamentals.financialData?.profitMargins,
        revenueGrowth: fundamentals.financialData?.revenueGrowth,
        
        // Ratios avanzados
        beta: fundamentals.defaultKeyStatistics?.beta,
        forwardPE: fundamentals.defaultKeyStatistics?.forwardPE,
        pegRatio: fundamentals.defaultKeyStatistics?.pegRatio,
        
        // Rentabilidad
        returnOnEquity: fundamentals.financialData?.returnOnEquity,
        returnOnAssets: fundamentals.financialData?.returnOnAssets,
        
        // Crecimiento de ganancias
        earningsGrowth: fundamentals.earnings?.earningsChart?.quarterly?.slice(-4),
        
        // Descripción de la empresa
        description: fundamentals.summaryProfile?.longBusinessSummary
      }
    };

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      error: "Error al obtener cotización",
      details: err.message 
    });
  }
});

// Endpoint para obtener solo el precio actual de un activo
app.get("/api/price/:symbol", async (req, res) => {
  const { symbol } = req.params;

  try {
    // Obtener datos básicos de cotización
    const quote = await yahooFinance.quote(symbol);
    
    // Formatear la respuesta con solo el precio y datos esenciales
    const response = {
      symbol: quote.symbol,
      name: quote.shortName || quote.longName,
      currency: quote.currency,
      currentPrice: quote.regularMarketPrice,
      previousClose: quote.regularMarketPreviousClose,
      change: quote.regularMarketPrice - quote.regularMarketPreviousClose,
      changePercent: ((quote.regularMarketPrice - quote.regularMarketPreviousClose) / quote.regularMarketPreviousClose * 100).toFixed(2),
      isMarketOpen: quote.marketState === 'REGULAR',
      lastUpdated: new Date().toISOString()
    };

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      error: "Error al obtener el precio",
      details: err.message 
    });
  }
});


app.get("/api/news", async (req, res) => {
  const { 
    count = 10,         // Número de noticias (default: 10)
    category = "general",      // Categoría: general, markets, economy, etc.
    region = "US"         // Región: US, EU, ASIA, etc.
  } = req.query;

  try {
    // Términos de búsqueda genéricos para noticias financieras
    const searchTerms = {
      general: 'financial || economy || markets',
      markets: 'stock market || equities || trading',
      economy: 'economy || inflation || interest rates',
      crypto: 'crypto || bitcoin || blockchain',
      banking: 'banking || federal reserve || central banks'
    };

    const query = searchTerms[category.toLowerCase()] || searchTerms.general;
    
    // Buscar noticias financieras generales
    const news = await yahooFinance.search(query, {
      newsCount: parseInt(count),
      quotesCount: 0,
      region: region.toUpperCase()
    });

    // Formatear la respuesta
    const formattedNews = news.news.map(item => ({
      title: item.title,
      publisher: item.publisher,
      link: item.link,
      date: new Date(item.providerPublishTime * 1000).toISOString(),
      thumbnail: item.thumbnail?.resolutions?.[0]?.url,
      category: category
    }));

    res.json({
      count: formattedNews.length,
      category,
      region,
      news: formattedNews
    });
  } catch (err) {
    console.error('Error fetching financial news:', err);
    res.status(500).json({ 
      error: "Error al obtener noticias financieras",
      details: err.message 
    });
  }
});

// ------------------------------------ RENDERIZACIONES ---------------------------------------------------------
// Manejo de errores 404
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(404).sendFile(path.join(__dirname, 'public', '500.html'));
});

function startServer() {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () =>
    console.log(`Server started on http://localhost:${PORT}`)
  );
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export default app;

