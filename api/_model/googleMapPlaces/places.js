const db = require('../../../plugins/mysql');
const sqlHelper = require('../../../utils/sqlHelper');
const TABLE = require('../../../utils/TABLE');
const utils = require('../../../utils/utils')

const places = {
    // place log 가져오기 임시 테스트용
    async getPlaceLogs(area_name){
        const sql = sqlHelper.SelectSimple(TABLE.VC_GPS_LOG, {area_name});
        const connection = await db;
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    },

    async getPlaces(page, limit){
        const sql = `SELECT PLA.*, 
                            (SELECT type from ${TABLE.PLACES_TYPE} WHERE places_id = PLA.id) AS type
                     FROM ${TABLE.PLACES} PLA
                     ORDER BY id DESC
                     LIMIT ${page - 1}, ${page * limit}
                     `;
        const connection = await db;
        const [row] = await connection.execute(sql);
        return row;
    },

    async createFavorite(place_fav_data){
        const sql = sqlHelper.Insert(TABLE.PLACES_FAV, place_fav_data);
        const connection = await db;
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    },

    async getFavorites(page, limit){
       const sort = {id : false}
       const sql = sqlHelper.SelectSimpleLimit(TABLE.PLACES_FAV, page, limit, null, [], sort, [])
       const connection = await db;
       const [row] = await connection.execute(sql.query)
       return row;
    },

    async deleteFavorite(id){
        const sql = sqlHelper.DeleteSimple(TABLE.PLACES_FAV, {id});
        const connection = await db;
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    },

    async getNearByPlaces(latitude, longitude){

        // 1차 필터 100M 이내 반경 장소들
        const radius = 100;
        latitude = parseFloat(latitude);
        longitude = parseFloat(longitude);
        const {minLat, maxLat, minLng, maxLng} = utils.calculateBoundingBox(latitude, longitude, radius);
    
        const sql = `
        SELECT *,
               ROUND(
               (
                    6371000 * ACOS(
                    COS(RADIANS(?)) * COS(RADIANS(geometry_lat)) *
                    COS(RADIANS(geometry_lng) - RADIANS(?)) +
                    SIN(RADIANS(?)) * SIN(RADIANS(geometry_lat))
                )
               ), 2) AS distance
        FROM (
            SELECT * 
            FROM places
            WHERE 
                geometry_lat BETWEEN ? AND ?
                AND geometry_lng BETWEEN ? AND ?
        ) AS bounding_box
        WHERE
            (
                6371000 * ACOS(
                    COS(RADIANS(?)) * COS(RADIANS(geometry_lat)) *
                    COS(RADIANS(geometry_lng) - RADIANS(?)) +
                    SIN(RADIANS(?)) * SIN(RADIANS(geometry_lat))
                )
            ) <= ?
        ORDER BY distance ASC;
      `;

        //console.log('sql : ', sql);

        // 파라미터 배열 생성
        const params = [
            latitude, // 거리 계산 중심 위도
            longitude, // 거리 계산 중심 경도
            latitude, // 거리 계산 중심 위도
            minLat, // Bounding Box 최소 위도
            maxLat, // Bounding Box 최대 위도
            minLng, // Bounding Box 최소 경도
            maxLng, // Bounding Box 최대 경도
            latitude, // 거리 계산 중심 위도
            longitude, // 거리 계산 중심 경도
            latitude, // 거리 계산 중심 위도
            radius, // 반경 100m 조건
        ];

        const connection = await db;
        const [row] = await connection.execute(sql, params);
        return row;
    },

    async makeVcGpsLog(logData){
        const sql = sqlHelper.Insert(TABLE.VC_GPS_LOG, logData);
        const connection = await db;
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    }
}

module.exports = places