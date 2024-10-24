const db = require('../../plugins/mysql');
const TABLE = require('../../utils/TABLE');
const sqlHelper = require("../../utils/sqlHelper")

const colStoreDevice = {

    async addStoreDevicesCollection(devicesData){
        const sql = sqlHelper.InsertArray(TABLE.COL_STORE_DEVICE, devicesData);
        const connection = await db
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    },

    async getDeviceList(col_store_id){
        //colStoreDevice
        let sql = sqlHelper.SelectSimple(TABLE.COL_STORE_DEVICE, {col_store_id});
        const connection = await db
        const [row] = await connection.execute(sql.query, sql.values)
        
        //colStoreUwb
        const uwbFilter = row.filter(item => item.col_store_device_type == "UWB")
        if(uwbFilter.length){
            for(const uwbData of uwbFilter){
                const col_store_device_id = uwbData.col_store_device_id
                sql = sqlHelper.SelectSimple(TABLE.COL_STORE_DEVICE_UWB, {col_store_device_id})
                const [[uwbResult]] = await connection.execute(sql.query, sql.values)
                if(uwbResult){
                    uwbData["col_store_device_uwb"] = uwbResult
                }
            }
        }
        return row
    },


    async removeDevices(col_store_id){
        // uwb Ranging 정보가 있다면 Ranging부터 제거
        let deleteSql = `DELETE FROM ${TABLE.COL_STORE_DEVICE_UWB} 
                         WHERE col_store_device_id IN 
                            (SELECT col_store_device_id FROM col_store_device 
                             WHERE col_store_id = ${col_store_id})`
        const connection = await db;
        await connection.execute(deleteSql);

        // 매장 내 Device 제거
        const sql = sqlHelper.DeleteSimple(TABLE.COL_STORE_DEVICE, {col_store_id});
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    }
}

module.exports = colStoreDevice