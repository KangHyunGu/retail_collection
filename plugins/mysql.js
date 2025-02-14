require('dotenv').config();
const environment = process.env.NODE_ENV;
const mysql = require('mysql2');

let instance = null;

function getDatabaseInstance() {
  if (!instance) {
    const config = {
      host: process.env[`DB_HOST_${environment}`],
      user: process.env[`DB_USER_${environment}`],
      password: process.env[`DB_PASSWORD_${environment}`],
      database: process.env[`DATABASE_${environment}`],
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 50,
      keepAliveInitialDelay: 60000,
    };
    const pool = mysql.createPool(config);
    instance = pool.promise();

    // 주기적인 ping: 1분간격 커넥션 풀의 커넥션에 ping을 보내 유휴 상태 방지
    setInterval(async () => {
      try {
        const connection = await instance.getConnection();
        await connection.ping();
        connection.release();
        console.log('Database ping 성공');
      } catch (err) {
        console.error('Database ping 실패:', err);
      }
    }, 60000);
  }
  return instance;
}

module.exports = getDatabaseInstance;