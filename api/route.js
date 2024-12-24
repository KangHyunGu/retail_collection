const express = require('express');
const db = require('../plugins/mysql')
const router = express.Router();
const colStoreCatCd = require('./_model/col_store_cat_cd')
const colStore = require('./_model/col_store');
const colStoreDevice = require('./_model/col_store_device')
const colStoreDeviceUwb = require('./_model/col_store_device_uwb');
const monent = require('../utils/moment');
const TABLE = require('../utils/TABLE');

// router.get('/test', async(req, res) => {
//     const sql = "SELECT * FROM test";
    
//     const [row] = await db.execute(sql);
//     res.json(row);
// })

router.get('/spread', async(req, res) => {
    const store = req.query.store || "";
    const sql = `SELECT 
                    cs.col_store_nm,
                    csd.col_store_device_mac_addr,
                    csd.col_store_device_nm,
                    csd.col_store_device_rssi,
                    csd.col_store_device_type,
                    csd.REG_DATE
                FROM col_store cs join col_store_device csd
                ON cs.col_store_id = csd.col_store_id
                WHERE cs.col_store_nm = ? AND csd.col_store_device_nm <> 'KangHyunGu'
                ORDER BY csd.REG_DATE, csd.col_store_device_type, csd.col_store_device_nm, cs.col_store_id`;
    const connection = await db;            
    const [row] = await connection.execute(sql, [store]);
    res.json(row);
})

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

router.post("/add_data_collection", async (req, res) => {
    let connection;

    try {
        const colStoreData = req.body.colStore;
        const colDeviceData = req.body.colStoreDevices;

        // 1. 기존에 등록 된 디바이스들이 존재하는지 확인
        const deviceMacInfos = []
        for(const device of colDeviceData){
            deviceMacInfos.push(device.col_store_device_mac_addr);
        }
       const targetDeviceData = await colStoreDevice.processDeviceData(colDeviceData)

       let target_store_id = await colStoreDevice.getDeviceFindStoreId(colDeviceData)
       const insertData = targetDeviceData.insertData
       const updateData = targetDeviceData.updateData
      
       connection = await db;
       // 트랜잭션 시작
       await connection.beginTransaction();
        
       // col_store가 데이터가 없을 경우 INSERT 처리
       colStoreData['location'] = `ST_SRID(Point(${colStoreData.col_store_loc_lot},${colStoreData.col_store_loc_lat}), 4326)`
       if(target_store_id == 0){
        const storeResults = await colStore.addStoreCollection(colStoreData);
        target_store_id = storeResults.insertId;
       } else {
        colStoreData["CHG_ID"] = 1;
        colStoreData["CHG_DATE"] = monent().format("LT");
        delete colStoreData.REG_ID;
        delete colStoreData.REG_DATE;
       }


       if(insertData.length){
        for(const device of insertData){
            device['col_store_id'] = target_store_id;
            delete device['col_store_device_uwb']
        }
         const devicesResult = await colStoreDevice.addStoreDevicesCollection(insertData);
       }

       if(updateData.length){
        for(const device of updateData){
            device['col_store_id'] = target_store_id;
            delete device['col_store_device_uwb']
        }
        //TODO: 업데이트 처리
        const devicesResult = await colStoreDevice.updateStoreDeviceCollection(updateData);
        console.log('devicesResult : ', devicesResult);
       }

       // 트랜잭션 커밋
       await connection.commit();
    } catch(err){
        if (connection) {
            // 오류가 발생하면 롤백
            await connection.rollback();
            console.log(err);
            console.error('Transaction rolled back due to error:', err.message);
        }

        // 오류 응답 반환
        console.error(err.message);
        return res.status(500).json({ error: 'Transaction failed', details: err.message });
    }

    return res.json(true);
})

// col_store 및 col_store_devices 데이터 수집 처리
router.post("/add_store_collection", async (req, res) => {
    console.log('API call: add_store_collection');
    let connection;
    let storeInsertCnt = 0;
    let devicesInsertCnt = 0;
    let devicesUwbInsertCnt = 0;
    let col_store_device_uwb = [];
    let colStoreDevicesData = [];

    try {
        // 풀에서 연결을 가져옴
        connection = await db

        // 트랜잭션 시작
        await connection.beginTransaction();

        // col_store 데이터 수집 처리
        const colStoreData = req.body.colStore;
        colStoreData['location'] = `ST_SRID(Point(${colStoreData.col_store_loc_lot},${colStoreData.col_store_loc_lat}), 4326)`;
        const storeResults = await colStore.addStoreCollection(colStoreData);
        const storeInsertId = storeResults.insertId;
        storeInsertCnt = storeResults.affectedRows;

        // col_store_device 데이터 수집 처리
        colStoreDevicesData = req.body.colStoreDevices;

        if (colStoreDevicesData.length) {
            for (let device of colStoreDevicesData) {
                device['col_store_id'] = storeInsertId;
            }

            const existUwbData = colStoreDevicesData.filter((item) => item.col_store_device_uwb != null);

            if (existUwbData.length) {
                for (const device of existUwbData) {
                    col_store_device_uwb.push(device.col_store_device_uwb);
                    delete device.col_store_device_uwb;
                }
            }

            // 일부러 예외 발생 (테스트용)
            //throw new Error('Intentional error to trigger rollback');

            const devicesResult = await colStoreDevice.addStoreDevicesCollection(colStoreDevicesData);
            devicesInsertCnt = devicesResult.affectedRows;

            if (devicesInsertCnt > 0 && col_store_device_uwb.length) {
                // UWB Distance 정보 insert 처리
                devicesUwbInsertCnt += await colStoreDeviceUwb.addStoreDevicesUwbInfo(storeInsertId, col_store_device_uwb);
            }
        }

        // 트랜잭션 커밋
        await connection.commit();
        console.log('Transaction committed successfully');

        // 응답 반환
        return res.json(
            storeInsertCnt === 1 &&
            colStoreDevicesData.length === devicesInsertCnt &&
            col_store_device_uwb.length === devicesUwbInsertCnt
        );

    } catch (err) {
        if (connection) {
            // 오류가 발생하면 롤백
            await connection.rollback();
            console.error('Transaction rolled back due to error:', err);
        }

        // 오류 응답 반환
        return res.status(500).json({ error: 'Transaction failed', details: err.message });

    } finally {
        if (connection) {
            // 연결 반환
            await connection.release();
        }
    }
});

// col_store 전체 데이터 get
router.get("/get_stores", async(req, res) => {
    let results = await colStore.getStores(); 
    res.json(results)
})

router.get("/get_store_devices/:colStoreId", async(req, res) => {
    const colStoreId = req.params.colStoreId;
    const results = await colStoreDevice.getDeviceList(colStoreId);
    res.json(results)
})

router.delete("/remove_store_collection/:colStoreId/:isParent", async(req, res) => {
    const {colStoreId, isParent} = req.params
    // 1. col_store_device 삭제
    await colStoreDevice.removeDevices(colStoreId, isParent)
    // 2. col_store 삭제
    await colStore.removeStore(colStoreId, isParent)
    res.json(true);
})

router.get("/get_near_by_store/:latitude/:longitude", async(req, res) => {
    const latitude = req.params.latitude
    const longitude = req.params.longitude
    const results = await colStore.getNearByStores(latitude, longitude)
    res.json(results);
  })


module.exports = router;