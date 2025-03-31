const db = require('../../../plugins/mysql');
const connection = db();
const sqlHelper = require('../../../utils/sqlHelper');
const TABLE = require('../../../utils/TABLE');
const utils = require('../../../utils/utils');
const moment = require('../../../utils/moment');

const places = {
    // place log 가져오기 임시 테스트용
    async getPlaceLogs(area_name){
        const sql = sqlHelper.SelectSimple(TABLE.VC_GPS_LOG, {area_name});
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
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    },

    async getPlaces(queryInfos) {
        // Haversine 공식으로 거리(km)를 계산 (6371: 지구 반경, km)

        const current_lat = parseFloat(queryInfos.current_lat);
        const current_lng = parseFloat(queryInfos.current_lng);

        let query = `
          SELECT PLA.*, PT.type_name,
            (6371 * ACOS(
               COS(RADIANS(?)) * COS(RADIANS(PLA.geometry_lat)) *
               COS(RADIANS(PLA.geometry_lng) - RADIANS(?)) +
               SIN(RADIANS(?)) * SIN(RADIANS(PLA.geometry_lat))
            )) AS distance
          FROM places PLA
          JOIN places_type PT ON PLA.type = PT.type
        `;
    
        let params = [];
        // Haversine 계산에 필요한 파라미터: center_lat, center_lng, center_lat
        params.push(current_lat, current_lng, current_lat);
    
        // city_id 조건 처리
        const city_id = parseInt(queryInfos.city_id);
        if (city_id !== 0) {
            query += ` WHERE PLA.city_id = ? `;
            params.push(city_id);
        } 
    
        // type 필터 적용 (all 이외의 경우)
        const type = queryInfos.type;
        if (type && type !== "all") {
            query += " AND PLA.type = ? ";
            params.push(type);
        }
    
        // HAVING 절을 통해 중심 좌표로부터 반경 10km 내의 데이터만 필터링
        query += ` HAVING distance <= ? `;
        const radius = parseInt(queryInfos.radius);
        params.push(radius);
    
        // 가까운 순서대로 정렬, 동일 거리일 경우 최신(place_id 내림차순)
        query += ` ORDER BY distance ASC, PLA.place_id DESC; `;
    
        try {
            //const formattedQuery = await connection.format(query, params);
            //console.log('formattedQuery : ', formattedQuery);
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
        const [rows] = await connection.execute(query, placeIds);
        return rows;
    },

    async createPlaces(datas){
        const process_id = moment.createKey();
        
        for(const data of datas){
            data.process_id = process_id;
        }

        const sql = sqlHelper.InsertArray(TABLE.PLACES, datas);
        //const formattedQuery = await connection.format(sql.query, sql.values);
        //console.log('formattedQuery : ', formattedQuery);
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
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    },

    async getFavorites(page, limit){
       const sort = {id : false}
       const sql = sqlHelper.SelectSimpleLimit(TABLE.PLACES_FAV, page, limit, null, [], sort, [])
       const [rows] = await connection.execute(sql.query)
       return rows;
    },

    async deleteFavorite(id){
        const sql = sqlHelper.DeleteSimple(TABLE.PLACES_FAV, {id});
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

        const [rows] = await connection.execute(sql, params);
        return rows;
    },

    async makeVcGpsLog(logData){
        const sql = sqlHelper.Insert(TABLE.VC_GPS_LOG, logData);
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    },

    async getRegions(){
        const columns = ['region.id', 'region.region_name', 'region.geometry_lat', 
                        'region.geometry_lng', 'region.offset_north_lat', 'region.offset_south_lat',
                        'region.offset_east_lng', 'region.offset_west_lng', '(select count(*) place_cnt from places where places_region_id = region.id) as place_cnt'];
        const sql = sqlHelper.SelectSimple(`${TABLE.PLACES_REGION} region`, null, columns);
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    },

    async getNullGlobalCode() {
        const query = `SELECT place_id, geometry_lat, geometry_lng FROM places WHERE plus_code_compound is null OR plus_code_compound = '';`
        const [row] = await connection.execute(query);
        return row;
    },

    async updateNullGlobalCode(updateSetData, wheres) {
        const process_id = moment.createKey();
        const query = `UPDATE places
                        SET plus_code_global = ?,
                            plus_code_compound = ?,
                            process_id = ?
                        WHERE place_id = ?
                        `
        const formattedQuery = connection.format(query, [updateSetData.plus_code_global, updateSetData.plus_code_compound, process_id, wheres.place_id]);
        console.log('formattedQuery : ', formattedQuery);
        const [row] = await connection.execute(query, [updateSetData.plus_code_global, updateSetData.plus_code_compound, process_id, wheres.place_id]);
        return row;
    },
    async getBoundsCity(offset_north_lat, offset_south_lat, offset_east_lng, offset_west_lng, center_lat, center_lng, zoom){

        let precision;
        // switch (zoom) {
        // case 9:
        //     precision = 1;
        //     break;
        // case 10:
        //     precision = 2;
        //     break;
        // case 11:
        //     precision = 3;
        //     break;
        // case 12:
        //     precision = 4;
        //     break;
        // default:
        //     precision = 1;
        // }


        // const query = `
        //     SELECT 
        //         ROUND(((c.offset_north_lat + c.offset_south_lat) / 2), ?) AS grid_center_lat,
        //         ROUND(((c.offset_east_lng + c.offset_west_lng) / 2), ?) AS grid_center_lng,
        //         COUNT(*) AS city_count,
        //         SUM(
        //             (SELECT COUNT(place.place_id)
        //                 FROM places place
        //                 WHERE place.city_id = c.id)
        //         ) AS total_places
        //     FROM city c
        //     WHERE c.offset_north_lat <= ?
        //         AND c.offset_south_lat >= ?
        //         AND c.offset_east_lng <= ?
        //         AND c.offset_west_lng >= ?
        //     GROUP BY grid_center_lat, grid_center_lng;
        // `
        // const params = [
        //     precision,
        //     precision,
        //     offset_north_lat,
        //     offset_south_lat,
        //     offset_east_lng,
        //     offset_west_lng
        // ]
        // const formattedQuery = await connection.format(query, params);
        // console.log('formattedQuery : ', formattedQuery);
        // const [row] = await connection.execute(query, params);
        // return row;

         // 예시: zoom 레벨별로 그리드 크기 설정
        let latGrid, lngGrid;
        
        switch (Number(zoom)) {
            case 9:
            // 대략 20km
            latGrid = 0.18;
            lngGrid = 0.22;
            break;
            case 10:
            // 대략 15km
            latGrid = 0.135;
            lngGrid = 0.165;
            break;
            case 11:
            // 대략 10km
            latGrid = 0.09;
            lngGrid = 0.11;
            break;
            case 12:
            // 대략 5km
            latGrid = 0.045;
            lngGrid = 0.055;
            break;
            default:
            // 혹은 기본값
            latGrid = 0.09;
            lngGrid = 0.11;
            break;
        }
        // console.log(Number(zoom));
        // console.log(latGrid);
        // console.log(lngGrid);

        // const query = `
        //     SELECT 
        //         FLOOR(center_lat / ?) AS group_lat,
        //         FLOOR(center_lng / ?) AS group_lng,
        //         COUNT(*) AS city_count,
        //         SUM(total_places) AS total_places,
        //         CAST('${latGrid}' AS DECIMAL(10, 3)) AS latGrid,
        //         CAST('${lngGrid}' AS DECIMAL(10, 3)) AS lngGrid
        //     FROM (
        //         SELECT 
        //             ((c.offset_north_lat + c.offset_south_lat) / 2) AS center_lat,
        //             ((c.offset_east_lng + c.offset_west_lng) / 2) AS center_lng,
        //             (SELECT COUNT(place.place_id)
        //             FROM places place
        //             WHERE place.city_id = c.id) AS total_places
        //         FROM city c
        //         WHERE c.offset_north_lat <= ?
        //             AND c.offset_south_lat >= ?
        //             AND c.offset_east_lng <= ?
        //             AND c.offset_west_lng >= ?
        //     ) AS sub
        //     GROUP BY group_lat, group_lng;
        //     `;

        const query = `
             SELECT 
                     ((c.offset_north_lat + c.offset_south_lat) / 2) AS center_lat,
                     ((c.offset_east_lng + c.offset_west_lng) / 2) AS center_lng,
                     COUNT(p.place_id) AS total_places
                 FROM city c
                 JOIN prefecture pf
                   ON c.prefecture_id = pf.id
                   AND ST_Contains(pf.boundary, ST_GeomFromText('POINT(${center_lng} ${center_lat})'))
                 LEFT JOIN places p
                   ON p.city_id = c.id
                WHERE c.offset_north_lat <= ?
                  AND c.offset_south_lat >= ?
                  AND c.offset_east_lng <= ?
                  AND c.offset_west_lng >= ?
                GROUP BY c.id
                ORDER BY total_places DESC;
        `

        //const params = [latGrid, lngGrid, offset_north_lat, offset_south_lat, offset_east_lng, offset_west_lng];     
        const params = [offset_north_lat, offset_south_lat, offset_east_lng, offset_west_lng];
        //const formattedQuery = await connection.format(query, params);
        //console.log('formattedQuery : ', formattedQuery);
        const [row] = await connection.execute(query, params);
        return row;
    },

    async getBoundsPreFecTure(){
        const query = `
            SELECT
                pr.id,
                pr.name,
                pr.major_city_name,
                pr.major_city_lat,
                pr.major_city_lng,
                (SELECT COUNT(place.place_id) 
                FROM places place
                WHERE place.city_id IN (SELECT id from city WHERE prefecture_id = pr.id)) as total_places
            FROM prefecture pr
            ORDER BY total_places DESC;
        `;
        const [row] = await connection.execute(query);
        return row;
    }
}

module.exports = places