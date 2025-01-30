const db = require('../../../plugins/mysql');
const sqlHelper = require('../../../utils/sqlHelper');
const TABLE = require('../../../utils/TABLE');
const utils = require('../../../utils/utils');
const moment = require('../../../utils/moment');

const places = {
    // place log 가져오기 임시 테스트용
    async getPlaceLogs(area_name){
        const sql = sqlHelper.SelectSimple(TABLE.VC_GPS_LOG, {area_name});
        const connection = await db;
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    },

    async getTotalCount(regionId, type = 'all'){
        const datas = {places_region_id: regionId};
        const columns = ['COUNT(*) as total'];

        if(type && type != 'all'){
            datas["type"] = type;
        }
        const sql = sqlHelper.SelectSimple(TABLE.PLACES, datas, columns);
        const connection = await db;
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    },

    async getPlaces(regionId, page, limit, type = "all") {
        let query = `SELECT PLA.*, PT.type_name 
                     FROM places PLA
                     JOIN places_type PT ON PLA.type = PT.type
                     WHERE PLA.places_region_id = ?`;
    
        const params = [regionId];
    
        if (type !== "all") {
            query += " AND PLA.type = ?";
            params.push(type);
        }
    
        // ORDER BY, LIMIT, OFFSET 추가
        const offset = (page - 1) * limit;
        query += ` ORDER BY PLA.id DESC LIMIT ${limit} OFFSET ${offset}`;
    
        try {
            const connection = await db;
            const [rows] = await connection.execute(query, params);
            return rows;
        } catch (error) {
            console.error("getPlaces Query Fail:", error.message);
            throw error;
        }
    },

    async checkCollectedPlaces(placeIds){
        const placeHolders = placeIds.map(() => '?').join(',');
        const query = `SELECT place_id FROM places WHERE place_id IN (${placeHolders})`;
        const connection = await db;
        const [rows] = await connection.execute(query, placeIds);
        return rows;
    },

    async createPlaces(datas){
        const process_id = moment.createKey();
        
        for(const data of datas){
            data.process_id = process_id;
        }

        const sql = sqlHelper.InsertArray(TABLE.PLACES, datas);
        const connection = await db;
        const [row] = await connection.execute(sql.query, sql.values);


        // 데이터 입력 후 places_region_id 연결 처리
        const updateQuery = `
             UPDATE places p
            JOIN places_region r
            ON p.geometry_lat BETWEEN r.offset_south_lat AND r.offset_north_lat
               AND p.geometry_lng BETWEEN r.offset_west_lng AND r.offset_east_lng
            SET p.places_region_id = r.id
            WHERE p.process_id >= ?
        `
        await connection.execute(updateQuery, [process_id]);

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
       const [rows] = await connection.execute(sql.query)
       return rows;
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
        const [rows] = await connection.execute(sql, params);
        return rows;
    },

    async makeVcGpsLog(logData){
        const sql = sqlHelper.Insert(TABLE.VC_GPS_LOG, logData);
        const connection = await db;
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    },

    async getRegions(){
        const columns = ['id', 'region_name', 'geometry_lat', 
                        'geometry_lng', 'offset_north_lat', 'offset_south_lat',
                        'offset_east_lng', 'offset_west_lng'];
        const sql = sqlHelper.SelectSimple(TABLE.PLACES_REGION, null, columns);
        const connection = await db;
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    }
}

module.exports = places