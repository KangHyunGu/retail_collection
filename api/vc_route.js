const express = require('express');
const db = require('../plugins/mysql')
const router = express.Router();

router.post('/make_visitor', async (req, res) => {
    console.log(req.body)
    res.json(true);
})

module.exports = router;
