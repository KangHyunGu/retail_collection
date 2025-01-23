const express = require('express');
const db = require('../plugins/mysql')
const router = express.Router();
const places = require('./_model/googleMapPlaces/places')


// places 가져오기
router.get('/getPlaces', async(req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    try {
        const results = await places.getPlaces(page, limit)
        res.status(200).json({success: true, places : results})
    } catch (error) {
        console.log('getPlaces Select Fail : ', error);
        res.status(500).json({success: false, message : 'getPlaces Internal Server Error'});
    }

})

// 즐겨찾기 가져오기
router.get('/favorite_list', async(req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const results = await places.getFavorites(page, limit)
    res.status(200).json(results);
})


// 즐겨찾기 삭제
router.delete('/delete_favorite/:id', async(req, res) => {
    const { id } = req.params;
    try {   
        const results = await places.deleteFavorite(id);
        res.status(200).json({success: results.affectedRows == 1})
    } catch(error) {
        console.error('Database Delete error : ', error);
        res.status(500).json({success: false, message: 'Internal Server Error'});
    }
})

// 즐겨찾기 데이터 삽입
router.post('/create_favorite', async(req, res) => {
    const data = req.body;

    try {
        const results = await places.createFavorite(data)

        // 삽입 된 아이디 가져오기
        const insertId = results.insertId;
        data["id"] = insertId;
        res.status(201).json({success: true, data, message: '즐겨찾기가 입력되었습니다.'});
    } catch (error) {
        console.error('Database insertion error : ', error);
        res.status(500).json({success: false, message : 'Internal Server Error'});
    }
    
})

module.exports = router;