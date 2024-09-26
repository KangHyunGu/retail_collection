const db = require('../../plugins/mysql');
const TABLE = require('../../utils/TABLE');
const sqlHelper = require("../../utils/sqlHelper")

const colStore = {

    async addStoreCollection(colStoreData) {
        const sql = sqlHelper.Insert(TABLE.COL_STORE, colStoreData);
        const [row] = await db.execute(sql.query, sql.values);
        return row;
    },

    async getStores(){
        const sql = sqlHelper.SelectSimple(TABLE.COL_STORE, null, [], {REG_DATE: false});
        const [row] = await db.execute(sql.query);
        return row;
    },

    async removeStore(col_store_id){
        sql = sqlHelper.DeleteSimple(TABLE.COL_STORE, {col_store_id})
        const [row] = await db.execute(sql.query, sql.values);
        return row;
    }

}

module.exports = colStore