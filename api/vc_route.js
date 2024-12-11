const express = require('express');
const db = require('../plugins/mysql');
const TABLE = require('../utils/TABLE');
const router = express.Router();
const vcCustomer = require('./_model/vc/vc_customer');
const colStoreDevice = require('./_model/col_store_device')
const colStore = require('./_model/col_store');
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
       //console.log("ROWS SIZE : ", rows.length, " == devices.size ", devices.length )

      // //1.1 모바일에서 스캔한 데이터와 등록 된 기기 데이터를 비교처리

      // // 1.WIFI 데이터를 비교 후 매장 출입 결정
      // // 기준 : Wifi 데이터에 매칭여부
      const test = colStoreDevice.detectStoreEntryInWifi(wifiScanDatas, rows);
      console.log(test);
      const storeId = parseInt(test.storeId)
      if(storeId != 0){
        const col_store = await colStore.getStore(storeId);
        responseData["visitStoreId"] = col_store[0].col_store_id || 0;
        responseData["visitStoreName"] = col_store[0].col_store_nm || "";
      }

      // 2. TODO: 위도, 경도 가지고 매장 매칭
      // 블루투스 데이터를 매칭하여 신호(Rssi)가 가까운 쪽이면 해당 매장 내 진열대에 있다고 판단
    } catch (error) {
      console.error('Query Execution Error:', error);
    }
    console.log('responseData : ', responseData);
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

module.exports = router;
