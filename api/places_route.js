const express = require('express');
const db = require('../plugins/mysql')
const router = express.Router();
const places = require('./_model/googleMapPlaces/places')

// places log 가져오기 임시 테스트용
router.get('/getPlaceLogs/:area_name', async(req, res) => {
    const area_name = Number(req.params.area_name);
    try {
       const results = await places.getPlaceLogs(area_name);
       res.status(200).json({success: true, placeLogs: results});
    } catch (error) {
        res.status(500).json({success: false, message: 'getPlaceLogs fail'});
    }
})

// places 가져오기
router.get('/getPlaces', async(req, res) => {
    const regionId = parseInt(req.query.places_region_id, 10) || 1; // 지역 ID
    const page = parseInt(req.query.page, 10) || 1; // 페이지
    const limit = parseInt(req.query.limit, 10) || 50; // 데이터 개수
    const type = req.query.type || "all"; // 타입 필터

    try {
        const results = await places.getPlaces(regionId, page, limit, type)
        res.status(200).json({success: true, places : results})
    } catch (error) {
        console.log('getPlaces Select Fail : ', error);
        res.status(500).json({success: false, message : 'getPlaces Internal Server Error'});
    }
})
// 지역에 맞는 places 총 데이터 개수 가져오기 
router.get('/getTotalCount', async(req, res) => {
    const {places_region_id, type = "all"} = req.query;
    try {
        const totalCount = await places.getTotalCount(places_region_id, type);
        res.status(200).json({ success: true, total: totalCount[0].total})
    } catch(error) {
        console.error('getTotalCount Error : ', error.message);
        res.status(500).json({success: false, message : 'getTotalCount Fail'});
    }
})

// 이미 수집된 목록여부 체크(nearBy Search에서 활용)
router.post('/check_collected', async(req, res) => {
    const {place_ids} = req.body;
    if (!Array.isArray(place_ids)) {
        return res.status(400).json({ success: false, message: 'Invalid place_ids format' });
    }

    try {
        const collectedPlaceIds = await places.checkCollectedPlaces(place_ids);
        res.status(200).json({ success: true, collected: collectedPlaceIds });
    } catch (error) {
        console.error('check_collected fail : ', error.message);
        res.status(500).json({success: false, message : 'check_collected fail'})
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

// 장소 데이터 수집
router.post('/create_place_collections', async(req, res) => {
    const data = req.body;
    const results = await places.createPlaces(data);
    try {
        res.status(201).json({success: true, data, message: '장소 수집 입력이 완료되었습니다.'})
    } catch(error) {
        console.error('create_place_collection Database error : ', data);
        res.status(500).json({success: false, message : 'create_place_collection Internal Server Error'})
    }
})

// 지역 데이터 가져오기
router.get('/getRegions', async(req, res) => {
    try {
        const results = await places.getRegions();
        res.status(200).json({success: true, regions: results, message : 'success get region data'});
    } catch(error){
        console.error('getRegions Server error ', error);
        res.status(500).json({success: false, message: `getRegions Server error : ${error}`})
    }
}) 

module.exports = router;