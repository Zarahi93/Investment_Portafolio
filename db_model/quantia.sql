DROP DATABASE IF EXISTS quantia;
CREATE DATABASE IF NOT EXISTS quantia;
USE quantia;

-- Tabla de usuarios 
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    riskLevel ENUM('low', 'medium', 'high') DEFAULT 'medium',
    balance DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de portafolios
CREATE TABLE IF NOT EXISTS portfolios (
    portfolio_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Tabla de operaciones de trading
CREATE TABLE IF NOT EXISTS tradings (
    trading_id INT AUTO_INCREMENT PRIMARY KEY,
    portfolio_id INT NOT NULL,
    asset_symbol VARCHAR(100) NOT NULL,
    type ENUM('buy', 'sell') NOT NULL,
    quantity DECIMAL(15,2) NOT NULL,
    price_per_unit DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    status ENUM('pending', 'executed', 'cancelled') DEFAULT 'pending',
    trading_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(portfolio_id) ON DELETE CASCADE
);

-- Tabla de transacciones
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    trading_id INT NULL,
    type ENUM('deposit', 'withdrawal') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('completed', 'pending', 'failed') DEFAULT 'pending',
    description VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (trading_id) REFERENCES tradings(trading_id) ON DELETE SET NULL
);

-- Tabla de activos en portafolio (portfolio_assets)
CREATE TABLE IF NOT EXISTS portfolio_assets (
    pa_id INT AUTO_INCREMENT PRIMARY KEY,
    portfolio_id INT NOT NULL,
    asset_symbol VARCHAR(100) NOT NULL,
    quantity DECIMAL(15,2) NOT NULL DEFAULT 0,
    acquisition_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_invested DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(portfolio_id) ON DELETE CASCADE,
    UNIQUE KEY unique_portfolio_asset (portfolio_id, asset_symbol)
);

-- Insertar algunos usuarios de ejemplo
INSERT INTO users (username, password, email) VALUES 
('admin', '12345', 'admin@example.com'),
('maria_garcia', '12345', 'maria@example.com'),
('carlos_rojas', '12345', 'carlos@example.com');

-- Insertar portafolios de ejemplo
INSERT INTO portfolios (user_id, name, description) VALUES
(1, 'Portafolio Principal', 'Mis inversiones principales'),
(1, 'Portafolio Crypto', 'Inversiones en criptomonedas'),
(2, 'Portafolio María', 'Inversiones de María García');

-- Procedimiento para ejecutar una compra (BUY)
DELIMITER //

CREATE PROCEDURE execute_buy_trading(
    IN p_user_id INT,
    IN p_portfolio_id INT,
    IN p_asset_symbol VARCHAR(100),
    IN p_quantity DECIMAL(15,2),
    IN p_price DECIMAL(15,2)
)
BEGIN
    DECLARE total_cost DECIMAL(15,2);
    DECLARE new_trading_id INT;
    DECLARE new_transaction_id INT;
    DECLARE current_quantity DECIMAL(15,2);
    DECLARE current_avg_price DECIMAL(15,2);
    DECLARE current_total_invested DECIMAL(15,2);
    
    START TRANSACTION;
    
    -- Calcular costo total
    SET total_cost = p_quantity * p_price;
    
    -- Verificar que el usuario tenga suficiente balance
    IF (SELECT balance FROM users WHERE user_id = p_user_id) >= total_cost THEN
        -- Crear registro de trading
        INSERT INTO tradings (portfolio_id, asset_symbol, type, quantity, price_per_unit, total_amount, status)
        VALUES (p_portfolio_id, p_asset_symbol, 'buy', p_quantity, p_price, total_cost, 'executed');
        
        SET new_trading_id = LAST_INSERT_ID();
        
        -- Crear transacción de retiro
        INSERT INTO transactions (user_id, trading_id, type, amount, status, description)
        VALUES (p_user_id, new_trading_id, 'withdrawal', total_cost, 'completed', 
                CONCAT('Compra de ', p_quantity, ' ', p_asset_symbol));
        
        SET new_transaction_id = LAST_INSERT_ID();
        
        -- Actualizar balance del usuario
        UPDATE users SET balance = balance - total_cost WHERE user_id = p_user_id;
        
        -- Verificar si el activo ya existe en el portafolio
        SELECT quantity, acquisition_price, total_invested 
        INTO current_quantity, current_avg_price, current_total_invested
        FROM portfolio_assets 
        WHERE portfolio_id = p_portfolio_id AND asset_symbol = p_asset_symbol;
        
        IF current_quantity IS NOT NULL THEN
            -- Actualizar activo existente en el portafolio
            UPDATE portfolio_assets 
            SET quantity = quantity + p_quantity,
                total_invested = total_invested + total_cost,
                acquisition_price = (total_invested + total_cost) / (quantity + p_quantity),
                updated_at = CURRENT_TIMESTAMP
            WHERE portfolio_id = p_portfolio_id AND asset_symbol = p_asset_symbol;
        ELSE
            -- Insertar nuevo activo en el portafolio
            INSERT INTO portfolio_assets (portfolio_id, asset_symbol, quantity, 
                                        acquisition_price, total_invested)
            VALUES (p_portfolio_id, p_asset_symbol, p_quantity, p_price, total_cost);
        END IF;
        
        COMMIT;
    ELSE
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Saldo insuficiente';
    END IF;
END //

DELIMITER ;

-- Procedimiento para ejecutar una venta (SELL)
DELIMITER //

CREATE PROCEDURE execute_sell_trading(
    IN p_user_id INT,
    IN p_portfolio_id INT,
    IN p_asset_symbol VARCHAR(100),
    IN p_quantity DECIMAL(15,2),
    IN p_price DECIMAL(15,2)
)
BEGIN
    DECLARE total_revenue DECIMAL(15,2);
    DECLARE current_quantity DECIMAL(15,2);
    DECLARE new_trading_id INT;
    DECLARE new_transaction_id INT;
    
    START TRANSACTION;
    
    -- Calcular ingreso total
    SET total_revenue = p_quantity * p_price;
    
    -- Verificar que el portafolio tenga suficiente cantidad del activo
    SELECT quantity INTO current_quantity 
    FROM portfolio_assets 
    WHERE portfolio_id = p_portfolio_id AND asset_symbol = p_asset_symbol;
    
    IF current_quantity >= p_quantity THEN
        -- Crear registro de trading
        INSERT INTO tradings (portfolio_id, asset_symbol, type, quantity, price_per_unit, total_amount, status)
        VALUES (p_portfolio_id, p_asset_symbol, 'sell', p_quantity, p_price, total_revenue, 'executed');
        
        SET new_trading_id = LAST_INSERT_ID();
        
        -- Crear transacción de depósito
        INSERT INTO transactions (user_id, trading_id, type, amount, status, description)
        VALUES (p_user_id, new_trading_id, 'deposit', total_revenue, 'completed', 
                CONCAT('Venta de ', p_quantity, ' ', p_asset_symbol));
        
        SET new_transaction_id = LAST_INSERT_ID();
        
        -- Actualizar balance del usuario
        UPDATE users SET balance = balance + total_revenue WHERE user_id = p_user_id;
        
        -- Actualizar cantidad en el portafolio
        UPDATE portfolio_assets 
        SET quantity = quantity - p_quantity,
            total_invested = total_invested - (acquisition_price * p_quantity),
            updated_at = CURRENT_TIMESTAMP
        WHERE portfolio_id = p_portfolio_id AND asset_symbol = p_asset_symbol;
        
        -- Eliminar registro si la cantidad llega a cero
        DELETE FROM portfolio_assets 
        WHERE portfolio_id = p_portfolio_id AND asset_symbol = p_asset_symbol AND quantity <= 0;
        
        COMMIT;
    ELSE
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cantidad insuficiente en portafolio';
    END IF;
END //

DELIMITER ;

-- Procedimiento para realizar un depósito
DELIMITER //

CREATE PROCEDURE make_deposit(
    IN p_user_id INT,
    IN p_amount DECIMAL(15,2),
    IN p_description VARCHAR(255)
)
BEGIN
    INSERT INTO transactions (user_id, type, amount, status, description)
    VALUES (p_user_id, 'deposit', p_amount, 'completed', p_description);
    
    UPDATE users SET balance = balance + p_amount WHERE user_id = p_user_id;
END //

DELIMITER ;

-- Procedimiento para realizar un retiro
DELIMITER //

CREATE PROCEDURE make_withdrawal(
    IN p_user_id INT,
    IN p_amount DECIMAL(15,2),
    IN p_description VARCHAR(255)
)
BEGIN
    DECLARE user_balance DECIMAL(15,2);
    
    SELECT balance INTO user_balance FROM users WHERE user_id = p_user_id;
    
    IF user_balance >= p_amount THEN
        INSERT INTO transactions (user_id, type, amount, status, description)
        VALUES (p_user_id, 'withdrawal', p_amount, 'completed', p_description);
        
        UPDATE users SET balance = balance - p_amount WHERE user_id = p_user_id;
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Saldo insuficiente';
    END IF;
END //

DELIMITER ;

-- Vista para ver el resumen de portafolios
CREATE VIEW portfolio_summary AS
SELECT 
    p.portfolio_id,
    u.username,
    p.name as portfolio_name,
    COUNT(pa.pa_id) as assets_count,
    COALESCE(SUM(pa.total_invested), 0) as total_invested,
    p.created_at
FROM portfolios p
JOIN users u ON p.user_id = u.user_id
LEFT JOIN portfolio_assets pa ON p.portfolio_id = pa.portfolio_id
GROUP BY p.portfolio_id;

-- Vista para ver los activos en portafolio con detalles
CREATE VIEW portfolio_assets_detail AS
SELECT 
    pa.pa_id,
    p.portfolio_id,
    p.name as portfolio_name,
    u.username,
    pa.asset_symbol,
    pa.quantity,
    pa.acquisition_price,
    pa.total_invested,
    pa.created_at,
    pa.updated_at
FROM portfolio_assets pa
JOIN portfolios p ON pa.portfolio_id = p.portfolio_id
JOIN users u ON p.user_id = u.user_id;


-- Insertar algunas transacciones de ejemplo
CALL make_deposit(1, 5000.00, 'Depósito inicial');
CALL make_deposit(2, 3000.00, 'Depósito inicial');
CALL make_deposit(3, 2000.00, 'Depósito inicial');

-- Realizar algunas operaciones de trading de ejemplo
CALL execute_buy_trading(1, 1, 'AAPL', 10.0, 150.00);
CALL execute_buy_trading(1, 1, 'MSFT', 5.0, 300.00);
CALL execute_buy_trading(1, 2, 'BTC', 0.5, 4000.00);
CALL execute_buy_trading(2, 3, 'TSLA', 3.0, 250.00);


-- Consulta para ver los usuarios insertados
SELECT * FROM users;

-- Consulta para ver las transacciones
SELECT * FROM transactions;

-- Consulta para ver los portafolios
SELECT * FROM portfolios;

-- Consulta para ver las operaciones de trading
SELECT * FROM tradings;

-- Consulta para ver los activos en portafolio
SELECT * FROM portfolio_assets;

-- Consulta para ver el resumen de portafolios
SELECT * FROM portfolio_summary;

-- Consulta para ver los detalles de activos en portafolio
SELECT * FROM portfolio_assets_detail;


-- Ver todas las transacciones del usuario 1 con suma acumulativa
SELECT 
    transaction_id,
    type,
    amount,
    transaction_date,
    SUM(CASE WHEN type = 'deposit' THEN amount ELSE -amount END) 
        OVER (ORDER BY transaction_date) as running_balance
FROM transactions 
WHERE user_id = 1 
ORDER BY transaction_date;

SELECT 
    t.trading_id,
    t.portfolio_id,
    t.asset_symbol,
    t.type,
    t.quantity,
    t.price_per_unit,
    t.total_amount,
    t.status,
    t.trading_date,
    p.name as portfolio_name,
    p.description as portfolio_description,
    u.user_id,
    u.username,
    u.email
FROM tradings t
JOIN portfolios p ON t.portfolio_id = p.portfolio_id
JOIN users u ON p.user_id = u.user_id
ORDER BY t.trading_date DESC;

select * from transactions;
