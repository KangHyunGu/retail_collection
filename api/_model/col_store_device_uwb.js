const db = require('../../plugins/mysql');
const TABLE = require('../../utils/TABLE');
const sqlHelper = require("../../utils/sqlHelper")

const colStoreDeviceUWb = {
    async addStoreDevicesUwbInfo(storeId, deviceUwbDatas){
        let sql = `INSERT INTO col_store_device_uwb(col_distance, col_store_device_mac_addr, col_store_device_id)
            VALUES`

        let addCnt = 0;
        const connection = await db;
        for(const uwbData of deviceUwbDatas){
           sql += `(?, ?, (SELECT col_store_device_id FROM col_store_device WHERE col_store_id = ? AND col_store_device_mac_addr = ?))`
          const [row] = await connection.execute(sql, [uwbData.col_distance, uwbData.col_store_device_mac_addr, storeId, uwbData.col_store_device_mac_addr])
          addCnt += row.affectedRows
        }

        return addCnt
    },

    async getCollectionDevice(deviceMacInfos){
        
    }
}

module.exports = colStoreDeviceUWb