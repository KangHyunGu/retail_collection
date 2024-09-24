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
    const results = await colStoreCatCd.getAllCatCodes();
    // col_store_device insert(단 col_store 부여받은 ID값을 col_store_device 입력할때 col_store_id 컬럼에 넣어줄 것)

    let datas = {};
    
    for (const result of results) {
        // MAIN_CAT_CD가 datas에 없으면 추가
        if (!datas[result.MAIN_CAT_CD]) {
            datas[result.MAIN_CAT_CD] = {
                MAIN_CAT_NM: result.MAIN_CAT_NM,
                SUB_CODES: [] // 빈 배열로 초기화
            };
        }
        
        // SUB_CODES 배열에 추가
        datas[result.MAIN_CAT_CD].SUB_CODES.push({
            CAT_ID: result.CAT_ID,
            CAT_NM: result.CAT_NM,
            CAT_CD: result.CAT_CD
        });
    }
    
    // 객체 형식을 배열로 변환 (MAIN_CAT_CD를 키로 사용했던 것을 배열로)
    const finalData = Object.keys(datas).map(key => {
        return {
            MAIN_CAT_CD: key,
            MAIN_CAT_NM: datas[key].MAIN_CAT_NM,
            SUB_CODES: datas[key].SUB_CODES
        };
    });

    res.json(finalData);
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
    let devicesInsertCnt = 0;
    if(colStoreDevicesData.length){
        for(device of colStoreDevicesData){
            device['col_store_id'] = storeInsertId;
        }
        const devicesResult = await colStoreDevice.addStoreDevicesCollection(colStoreDevicesData);
        devicesInsertCnt = devicesResult.affectedRows;
    }
   
    res.json(1 == storeInsertCnt && colStoreDevicesData.length == devicesInsertCnt);
})

// col_store 전체 데이터 get
router.get("/get_stores", async(req, res) => {
    const results = await colStore.getStores(); 
   

    for(const store of results){
        const catId = store.cat_id
        const catCode = await colStoreCatCd.getCatCode(catId)
        store.main_cat_cd = catCode.main_cat_cd
            store.main_cat_nm = catCode.main_cat_nm
            store.cat_cd = catCode.cat_cd
            store.cat_nm = catCode.cat_nm
    }
   
    res.json(results)
})

router.get("/get_store_devices/:colStoreId", async(req, res) => {
    const colStoreId = req.params.colStoreId;
    const results = await colStoreDevice.getDeviceList(colStoreId);
    res.json(results)
})


module.exports = router;