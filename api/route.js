const express = require('express');
const db = require('../plugins/mysql')
const router = express.Router();
const colStoreCatCd = require('./_model/col_store_cat_cd')
const colStore = require('./_model/col_store');
const colStoreDevice = require('./_model/col_store_device')

// router.get('/test', async(req, res) => {
//     const sql = "SELECT * FROM test";
//     const [row] = await db.execute(sql);
//     res.json(row);
// })

// router.post('/test2', async(req, res) => {
//     const sql = "SELECT * FROM test"
//     const [row] = await db.execute(sql)
//     res.json(row);
// })

// col_store_cat_cd 전체 데이터
router.get("/cat_codes", async(req, res) => {
    console.log('api call cat_codes')
    const results = await colStoreCatCd.getAllCatCodes();
    // col_store_device insert(단 col_store 부여받은 ID값을 col_store_device 입력할때 col_store_id 컬럼에 넣어줄 것)
    res.json(results);
})

// col_store 및 col_store_devices 데이터 수집 처리
router.post("/add_store_collection", async(req, res) => {
    console.log('api call add_store_collection');
    // col_store 데이터 수집 처리
    const colStoreData = req.body.colStore;
    const storeResults = await colStore.addStoreCollection(colStoreData);
    const storeInsertId = storeResults.insertId;
    const storeInsertCnt = storeResults.affectedRows;

    // col_store_device 데이터 수집 처리
    const colStoreDevicesData = req.body.colStoreDevices;
    for(device of colStoreDevicesData){
        device['col_store_id'] = storeInsertId;
    }
    const devicesResult = await colStoreDevice.addStoreDevicesCollection(colStoreDevicesData);
    const devicesInsertCnt = devicesResult.affectedRows;
    res.json(1 == storeInsertCnt && colStoreDevicesData.length == devicesInsertCnt);
})

// col_store 전체 데이터 get
router.get("/get_stores", async(req, res) => {
    const results = await colStore.getStores();    
    res.json(results)
})

router.get("/get_store_devices/:colStoreId", async(req, res) => {
    const colStoreId = req.params.colStoreId;
    const results = await colStoreDevice.getDeviceList(colStoreId);
    res.json(results)
})


module.exports = router;