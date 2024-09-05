const db = require('../../plugins/mysql');
const TABLE = require('../../utils/TABLE');
const sqlHelper = require("../../utils/sqlHelper")

const colStoreDevice = {

    async addStoreDevicesCollection(devicesData){
        const sql = sqlHelper.InsertArray(TABLE.COL_STORE_DEVICE, devicesData);
        const [row] = await db.execute(sql.query, sql.values);
        return row;
    }
}

module.exports = colStoreDevice