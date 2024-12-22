require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');

(async function(){
    const environment = process.env.NODE_ENV;
    const app = express();
    const port = process.env[`SERVER_PORT_${environment}`]
    const webServer = http.createServer(app);

    // parser
    app.use(express.json());
    app.use(express.urlencoded({extended: true}));
  
    // 정적폴더
    app.use(express.static(path.join(__dirname, '/static')));
  
    // CORS 정책 허용
    app.use(cors());


    // rssi2.html 파일 경로 설정
    const htmlFilePath = path.join(__dirname, 'spread.html');

    // router
    app.use('/api', require('./api/route'));
    app.use('/api/vc/', require('./api/vc_route'))

    webServer.listen(port, () => {
        console.log(`${port} 서버시작`);
    })

    app.get('/', async (req, res) => {
        res.sendFile(htmlFilePath);
    })

})();