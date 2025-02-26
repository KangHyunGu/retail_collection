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
    app.use('/static', express.static(path.join(__dirname, '/static')));
  
    // CORS 정책 허용
    app.use(cors());

    // rssi2.html 파일 경로 설정
    const htmlFilePath = path.join(__dirname, 'index.html');

    // router
    app.use('/api', require('./api/route'));

    // router VC
    app.use('/api/vc/', require('./api/vc_route'));

    // router places
    app.use('/api/places/', require('./api/places_route'));


    webServer.listen(port, () => {
        console.log(`${port} 서버시작`);
    })

    app.get('/', async (req, res) => {
        res.sendFile(htmlFilePath);
    })

    // 구글맵 API KEY 가져오기
    app.get('/api/config', (req, res) => {
        const apiKey = process.env.GOOGLE_API_KEY;
        res.status(200).json({success: true, apiKey})
    })

    // spread 이동
    app.get('/spread', (req, res) => {
        res.sendFile(path.join(__dirname, 'spread.html'))
    })
    // googleMap 이동
    app.get('/googleMap', (req, res) => {
        res.sendFile(path.join(__dirname, 'googleMap.html'))
    })

    // BI-SOLUTION 페이지 이동
    app.get('/bi-solution', (req, res) => {
        const serverDomain = process.env.SERVER_DOMAIN
        const bi_soultion_port = process.env.BI_SOLUTION_PORT
        res.redirect(302, `${serverDomain}:${bi_soultion_port}`)
    })
})();