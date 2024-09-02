const express = require('express');
const db = require('../plugins/mysql')
const router = express.Router();
const TABLE = require('../utils/TABLE')

router.get('/test', async(req, res) => {
    console.log('API 접근');
    const sql = "SELECT * FROM test";
    const [row] = await db.execute(sql);
    res.json(row);
})

router.post('/test2', async(req, res) => {
    console.log(req.body);
    const sql = "SELECT * FROM test"
    const [row] = await db.execute(sql)
    res.json(row);
})


module.exports = router;