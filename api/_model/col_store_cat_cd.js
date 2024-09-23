const db = require('../../plugins/mysql');
const TABLE = require('../../utils/TABLE');

const catStoreCatCd = {
    async getAllCatCodes(){
        const sql = `SELECT CAT_CD.CAT_ID, 
                            CAT_CD.CAT_CD, 
                            CAT_CD.CAT_NM,  
                            (SELECT MAIN_CAT_NM FROM col_store_main_cat_cd
                                WHERE MAIN_CAT_ID = CAT_CD.MAIN_CAT_ID
                            ) AS MAIN_CAT_NM,
                            (SELECT MAIN_CAT_CD FROM col_store_main_cat_cd
                                WHERE MAIN_CAT_ID = CAT_CD.MAIN_CAT_ID
                            ) AS MAIN_CAT_CD 
                            FROM ${TABLE.COL_STORE_CAT_CD} CAT_CD`;
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
