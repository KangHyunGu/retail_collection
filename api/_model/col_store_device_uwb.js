const db = require('../../plugins/mysql');
const connection = db();
const TABLE = require('../../utils/TABLE');
const sqlHelper = require("../../utils/sqlHelper")

const colStoreDeviceUWb = {
    async addStoreDevicesUwbInfo(storeId, deviceUwbDatas, transactionConn = null){
        // 트랜잭션 사용
        let sql = `INSERT INTO ${TABLE.COL_STORE_DEVICE_UWB}(col_distance, col_store_device_mac_addr, col_store_device_id)
            VALUES`;
        let conn = transactionConn ? transactionConn : connection;
        let addCnt = 0;
        for(const uwbData of deviceUwbDatas){
           sql += `(?, ?, (SELECT col_store_device_id FROM ${TABLE.COL_STORE_DEVICE} WHERE col_store_id = ? AND col_store_device_mac_addr = ?))`
          const [row] = await conn.execute(sql, [uwbData.col_distance, uwbData.col_store_device_mac_addr, storeId, uwbData.col_store_device_mac_addr])
          addCnt += row.affectedRows
        }

        return addCnt
    },

    async getCollectionDevice(deviceMacInfos){
        
    }
}

module.exports = colStoreDeviceUWb