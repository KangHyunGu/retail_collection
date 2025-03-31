const express = require('express');
const router = express.Router();
const places = require('./_model/googleMapPlaces/places');
const openLocationCode = require('open-location-code');

require('dotenv').config();
const axios = require('axios');
const API_KEY = process.env.GOOGLE_API_KEY;

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
    //console.log('req.query : ', req.query);
    try {
        const results = await places.getPlaces(req.query);
        res.status(200).json({success: true, places : results})
    } catch (error) {
        //console.log('getPlaces Select Fail : ', error);
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

// 시 데이터 가져오기
router.get('/getCity', async(req, res) => {
    try {
        const {
            offset_north_lat,
            offset_south_lat,
            offset_east_lng,
            offset_west_lng,
            center_lat,
            center_lng,
            zoom
        } = req.query;

        //console.log(req.query);
        const results = await places.getBoundsCity(offset_north_lat, offset_south_lat, offset_east_lng, offset_west_lng, center_lat, center_lng, zoom);
        //const results = await places.getRegions();
        //console.log('resylts : ', results);
        res.status(200).json({success: true, citys: results, message : 'success get city data'});
    } catch(error){
        console.error('getCity Server error ', error);
        res.status(500).json({success: false, message: `getcity Server error : ${error}`})
    }
})

// 도,도,부,현(도) 데이터 가져오기
router.get('/getPreFecTure', async(req, res) => {
    try {
        const results = await places.getBoundsPreFecTure();
        res.status(200).json({success: true, prefectures: results, message : 'success get prefecture data'});
    } catch(error){
        console.error('getPreFecTure Server error : ', error);
        res.status(500).json({success: false, message:`getPreFecTure Server error : ${error}`});
    }
})

// router.get('/getNullGlobalCode', async(req, res) => {
//     try {
//         const results = await places.getNullGlobalCode();
//         // Place Details API URL 구성 (필요에 따라 fields 파라미터 추가 가능)
         
//         for(let i=0; i <= results.length - 1; i++){
            
//             const place_id = results[i].place_id;
            
//             const lat = results[i].geometry_lat;
//             const lng = results[i].geometry_lng;
//             const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=ko&key=${API_KEY}`
//             try {
//                 const response = await axios.get(url);
               
//                 if (response.status === 200) {
//                   const geoCodingDatas = response.data.results;
//                   const find = geoCodingDatas.find((item) => {
//                     return item.place_id == place_id
//                 });
//                 const plus_code = response.data.plus_code;
//                 const updateSetData = {};
//                 updateSetData['plus_code_global'] = plus_code.global_code || '';
//                 updateSetData['plus_code_compound'] = plus_code.compound_code || '';
//                 const wheres = {place_id};

//                 const rows = await places.updateNullGlobalCode(updateSetData, wheres);
//                 console.log(rows.changedRows, ' -- ', i);
//                   // plus_code 정보가 있는 경우 확인
//                   if (response.data.plus_code) {
                   
//                   } else {
//                     console.log('응답에 plus_code 정보가 없습니다.');
//                   }
//                 } else {
//                   console.error('Place Details API 에러:', response.data.status, response.data.error_message);
//                 }
//               } catch (error) {
//                 console.error('Place Details API 호출 중 에러 발생:', error);
//               }
//         }
       
//         res.status(200).json({success: true, datas: results});
//     } catch(error) {
//         console.error('getNullGlobalCode Server error ', error);
//         res.status(500).json({success: false, message: `getNullGlobalCode Server error , ${error}`})
//     }
// })

module.exports = router;