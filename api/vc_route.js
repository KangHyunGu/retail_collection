const express = require('express');
const router = express.Router();
const vcCustomer = require('./_model/vc/vc_customer');
const colStoreDevice = require('./_model/col_store_device')
const colStore = require('./_model/col_store');
const places = require('./_model/googleMapPlaces/places');
const moment = require('../utils/moment');


router.post('/make_visitor', async (req, res) => {
   
    const datas = req.body;
   //console.log('datas : ', datas);
    const wifiScanDatas = datas.wifiScanDatas
    const bleScanDatas = datas.bleScanDatas
    const devices = [...new Set([...wifiScanDatas, ...bleScanDatas])]
    const rows = await colStoreDevice.getMatchData(devices)
    //console.log('row : ', rows);
    const responseData = {
      visitStoreId: 0,
      visitStoreName: "",
    };

    try {
      console.log('--------------------------------------------');
       //console.log("ROWS SIZE : ", rows.length, " == devices.size ", devices.length )

      // //1.1 모바일에서 스캔한 데이터와 등록 된 기기 데이터를 비교처리

      // BLE 기기 비교 후 매장 출입 결정
      // 기준 : BLE 데이터에 매칭여부
      let detectStoreEntry = colStoreDevice.detectStoreEntry(bleScanDatas, rows);
      let storeId = parseInt(detectStoreEntry.storeId)
      if(storeId != 0){
        const col_store = await colStore.getStore(storeId);
        responseData["visitStoreId"] = col_store[0].col_store_id || 0;
        responseData["visitStoreName"] = col_store[0].col_store_nm || "";
        responseData["matchResultsBle"] = [];
        
        for(device of detectStoreEntry.matchResults){
          responseData["matchResultsBle"].push(device.Scandevice)
        }
        
        console.log('BLE : ', detectStoreEntry)
      } else {
        // BLE에서 매칭 실패했을경우
        // WIFI 데이터를 비교 후 매장 출입 결정
        // 기준 : Wifi 데이터에 매칭여부
        detectStoreEntry = colStoreDevice.detectStoreEntry(wifiScanDatas, rows);
        storeId = parseInt(detectStoreEntry.storeId)
        console.log('WIFI : ', detectStoreEntry)
        if(storeId != 0){
          const col_store = await colStore.getStore(storeId);
          responseData["visitStoreId"] = col_store[0].col_store_id || 0;
          responseData["visitStoreName"] = col_store[0].col_store_nm || "";
          responseData["matchResultsWifi"] = [];

          for(device of detectStoreEntry.matchResults){
            responseData["matchResultsWifi"].push(device.Scandevice)
          }

          console.log('WIFI : ', detectStoreEntry)
        }
      }
    } catch (error) {
      console.error('Query Execution Error:', error);
    }
    responseData["matchResultsWifi"] = responseData["matchResultsWifi"] || [];
    console.log("matched WIFI : ", responseData["matchResultsWifi"]);
    console.log('--------------------------------------------');
    res.json(responseData);
})

router.get("/get_customer/:deviceId", async (req, res) => {
  const use_device_id = req.params.deviceId
  const results = await vcCustomer.getCustomer(use_device_id)
  res.json(results[0])
})

router.post("/make_customer", async(req, res) => {
  const vcCustomer = req.body
  const use_device_id = vcCustomer.use_device_id;
  const row = await vcCustomer.getCustomer(use_device_id)

  if(row){
    console.error("이미 등록 된 고객입니다.")
    res.json(true)
    return
  }
  
  const results = vcCustomer.addCustomer(vcCustomer)
  res.json(true);
})

router.get("/get_near_by_place/:latitude/:longitude", async(req, res) => {
  const {latitude, longitude} = req.params;
  try {
    const results = await places.getNearByPlaces(latitude, longitude);
    res.status(200).json(results)
  } catch (error) {
    console.error('modile vc nearByPlace server error : ', error);
    res.status(500).json({success: false, message : 'modile vc nearByPlace server error'})
  }
  
})

router.get("/nearby/stores-devices/:latitude/:longitude", async(req, res) => {
  const {latitude, longitude} = req.params;
  try {
    const results = await colStore.getNearByStoreWithBleDevices(latitude, longitude);
    res.status(200).json(results)
  } catch (error) {
    console.error('modile vc nearByPlace server error : ', error);
    res.status(500).json({success: false, message : 'modile vc nearByPlace server error'})
  }
  
})

router.post('/make_vc_gps_log', async(req, res) => {
   const logData = req.body;
   console.log('logData : ', logData);
   const results = await places.makeVcGpsLog(logData);
   res.json(results.affectedRows == 1);
})

module.exports = router;
