const db = require('../../plugins/mysql');
const connection = db();
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
        const [row] = await connection.execute(sql);
        return row;
    },

    async getCatCode(catId){
        const sql = `SELECT cat_cd.cat_cd,
                            cat_cd.cat_nm,
                            main_cat_cd.main_cat_cd,
                            main_cat_cd.main_cat_nm
        FROM ${TABLE.COL_STORE_CAT_CD} cat_cd JOIN ${TABLE.COL_STORE_MAIN_CAT_CD} main_cat_cd
        ON cat_cd.main_cat_id = main_cat_cd.main_cat_id
        WHERE cat_cd.cat_id = ?`
        const values = [catId]
        const [[row]] = await connection.execute(sql, values)
        return row
    },

    async attachCategoryData(stores){
        for(const store of stores){
            const catId = store.cat_id
            const catCode = await this.getCatCode(catId)
            store.main_cat_cd = catCode.main_cat_cd
                store.main_cat_nm = catCode.main_cat_nm
                store.cat_cd = catCode.cat_cd
                store.cat_nm = catCode.cat_nm
        }
        return stores
    }
}

module.exports = catStoreCatCd
