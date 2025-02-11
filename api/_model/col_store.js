const db = require('../../plugins/mysql');
const TABLE = require('../../utils/TABLE');
const sqlHelper = require("../../utils/sqlHelper")
const catStoreCatCd = require('./col_store_cat_cd')

const colStore = {

    async addStoreCollection(colStoreData) {
        if(colStoreData.col_store_loc_post_cd == ""){
            colStoreData.col_store_loc_post_cd = 0;
        }
        const sql = sqlHelper.Insert(TABLE.COL_STORE, colStoreData);
        const connection = await db
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    },

    async updateStoreCollection(colStoreData){
        
    },

    async getStores(){
        const sql = sqlHelper.SelectSimple(TABLE.COL_STORE, null, [], {REG_DATE: false});
        const connection = await db
        
        let [row] = await connection.execute(sql.query);
        row = await catStoreCatCd.attachCategoryData(row);
        return row;
    },

    async getStore(storeId){
        const sql = sqlHelper.SelectSimple(TABLE.COL_STORE, {col_store_id: storeId})
        const connection = await db

        let [row] = await connection.execute(sql.query, sql.values);
        row = await catStoreCatCd.attachCategoryData(row);
        return row;
    },

    async getNearByStores(latitude, longitude){
        // 위도, 경도 값으로 반경 30M내 해당되는 매장 검색
        const searchRedius = 30;
        const sql = `SELECT *,
                        ST_Distance_Sphere(location, ST_SRID(Point(?,?), 4326)) as distance
                 FROM ${TABLE.COL_STORE}
                 WHERE (parent_store_id IS NULL
                   AND ST_Distance_Sphere(location, ST_SRID(Point(?,?), 4326)) <= ?)
                   ORDER BY distance ASC
                   LIMIT 30`
          
        const connection = await db
        let [row] = await connection.execute(sql, [longitude, latitude, longitude, latitude, searchRedius])
        row = await catStoreCatCd.attachCategoryData(row);
        return row;
    },

    async getNearByStoreWithBleDevices(latitude, longitude){
        // 위도, 경도 값으로 반경 30M내 해당되는 매장 검색
        const nearByStores = await this.getNearByStores(latitude, longitude)
        
        const ids = [];
        for(const nearByStore of nearByStores){
            ids.push(nearByStore.col_store_id);
        }

        const query = 
        `SELECT col_store_device_mac_addr
         FROM ${TABLE.COL_STORE_DEVICE}
         WHERE col_store_id in (${new Array(ids.length).fill("?").join(",")})
           AND col_store_device_type = 'BLE'
         GROUP BY col_store_device_mac_addr
        `
        const connection = await db
        let [row] = await connection.execute(query, ids)

        return {
                nearByColStores: nearByStores,
                nearByColStoreDevices: row
            }
    },


    async removeStore(col_store_id, isParent){
        const connection = await db
        if(isParent){
            const sql = sqlHelper.DeleteSimple(TABLE.COL_STORE, {parent_store_id: col_store_id})
            await connection.execute(sql.query, sql.values)
        }
        const sql = sqlHelper.DeleteSimple(TABLE.COL_STORE, {col_store_id})
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    }

}

module.exports = colStore