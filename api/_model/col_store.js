const db = require('../../plugins/mysql');
const TABLE = require('../../utils/TABLE');
const sqlHelper = require("../../utils/sqlHelper")

const colStore = {

    async addStoreCollection(colStoreData) {
        const sql = sqlHelper.Insert(TABLE.COL_STORE, colStoreData);
        const [row] = await db.execute(sql.query, sql.values);
        return row
    }

}

module.exports = colStore