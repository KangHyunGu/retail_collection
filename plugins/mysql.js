require('dotenv').config();
const environment = process.env.NODE_ENV;
const mysql = require('mysql2');

function createDatabase() {
    let instance = null;
    return {
        getInstance : function() {
            const config = {
                host : process.env[`DB_HOST_${environment}`],
                user : process.env[`DB_USER_${environment}`],
                password : process.env[`DB_PASSWORD_${environment}`],
                database : process.env[`DATABASE_${environment}`]
            };
            const pool = mysql.createPool(config);
            instance = pool.promise();
            return instance;
        }   
    }
}

module.exports = createDatabase().getInstance().getConnection();