const db = require('../../plugins/mysql');
const TABLE = require('../../utils/TABLE');

const catStoreCatCd = {
    async getAllCatCodes(){
        const sql = `SELECT * FROM ${TABLE.COL_STORE_CAT_CD}`;
        const [row] = await db.execute(sql);
        return row;
    },

    async getCatCode(catCd){
        const sql = `SELECT * FROM ${TABLE.COL_STORE_CAT_CD} WHERE cat_cd = ?`
        const values = [catCd]
        const [row] = await db.execute(sql, values)
        return row
    }
}

module.exports = catStoreCatCd
