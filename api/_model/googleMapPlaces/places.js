const db = require('../../../plugins/mysql');
const sqlHelper = require('../../../utils/sqlHelper');
const TABLE = require('../../../utils/TABLE');
const utils = require('../../../utils/utils')

const places = {
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
          AND ? BETWEEN offset_south_lat AND offset_north_lat
          AND ? BETWEEN offset_west_lng AND offset_east_lng
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
            latitude, // 동/서/남/북 경계 조건 위도
            longitude, // 동/서/남/북 경계 조건 경도
        ];

        const connection = await db;
        const [row] = await connection.execute(sql, params);
        return row;
    }
}

module.exports = places