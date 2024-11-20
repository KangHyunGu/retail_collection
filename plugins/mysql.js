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
                database : process.env[`DATABASE_${environment}`],
                waitForConnections: true,   // 대기열 사용
                connectionLimit: 10,        // 최대 10개의 연결
                queueLimit: 50,             // 최대 50개의 요청만 대기
                keepAliveInitialDelay: 60000 // 60초 대기 후 Keep-Alive 전송(DB 연결 해제 방지)
            };
            const pool = mysql.createPool(config);
            instance = pool.promise();
            return instance;
        }   
    }
}

module.exports = createDatabase().getInstance().getConnection();