/**
 * Para crear una conexion con una base de datos es necesario importar el modulo mysql2.
 * 
 * Para usarlo en la nueva forma de usarlo con pool debe ser la version con promesas para usarlos dentro de funciones asincronas
 * 
 * Porque asincronas? Es más agil de usar no necesitas esperar a que termine de ejecutarse la función para que el resto del codigo funcione
 * 
 */

// npm install mysql2
// Importamos el modulo mysql dentro del paquete mysql2/promise
import mysql from "mysql2/promise"

// Definimos las credeciales de conexión
const dbConfig = {
    host: "localhost",      // Servidor
    port: 3306,             // Puerto
    user: "root",           // Usuario
    password: "5546515Pizza13.",     // Contraseña
    database: "quantia",     // Base 
    waitForConnections: true,   // Si todas las conexiones estan ocupadas deben esperar
    connectionLimit:10,     // Limite de conexiones simultaneas
    queueLimit:0           // Limite de la lista de espera (0 = infinito)
};

// Creamos un pool que son las conexiones diponibles listas para usarse
const pool = mysql.createPool(dbConfig);

// Exportamos las conexiones 
export default pool