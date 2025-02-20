const db = require('../../plugins/mysql');
const connection = db();
const TABLE = require('../../utils/TABLE');
const sqlHelper = require("../../utils/sqlHelper")
const moment = require('../../utils/moment');

const colStoreDevice = {

    async addStoreDevicesCollection(devicesData, transactionConn = null){
        // 트랜잭션 사용
        let conn = transactionConn ? transactionConn : connection;
        const sql = sqlHelper.InsertArray(TABLE.COL_STORE_DEVICE, devicesData);
        const [row] = await conn.execute(sql.query, sql.values);
        return row;
    },

    async updateStoreDeviceCollection(devicesData){
        const table = TABLE.COL_STORE_DEVICE;
        const data = devicesData;
        const idColumn = 'col_store_device_mac_addr';
        const caseColumns = 'col_store_device_rssi';
        const fixedColumns = [{name : 'col_store_id', value: devicesData[0].col_store_id}];
        const sql = sqlHelper.generateCaseWhenUpdate(table, data, idColumn, caseColumns, fixedColumns);
        
        const [row] = await connection.execute(sql.query, sql.values);
        
        return row;
    },

    async getMatchData(colDeviceData){
        if(!colDeviceData.length){
            return []
        }

        // MAC 주소만 추출
        const devicesMacInfos = colDeviceData.map(device => device.col_store_device_mac_addr);
        const tokens = new Array(devicesMacInfos.length).fill("?").join(",");
        //console.log(devicesMacInfos);
        // DB에서 해당 MAC 주소로 데이터 조회
        const sql = `SELECT *, 
                    (select parent_store_id from col_store where col_store_id = csd.col_store_id) as parent_store_id 
                    FROM ${TABLE.COL_STORE_DEVICE} csd WHERE col_store_device_mac_addr IN (${tokens})`;

        const [rows] = await connection.execute(sql, devicesMacInfos);
        return rows;
    },

    async processDeviceData(colDeviceData) {
        if (!colDeviceData.length) {
            return [];
        }
    
        const rows = await this.getMatchData(colDeviceData);
        let insertData = [];
        let updateData = [];
        // 결과를 처리
        for(const device of colDeviceData)
        {
            const find = rows.find(row => row.col_store_device_mac_addr === device.col_store_device_mac_addr);
    
            // 초기 상태 설정
            if (find) {
                // DB에 존재할 경우 RSSI 비교
                const findRssi = find.col_store_device_rssi;
                const deviceRssi = device.col_store_device_rssi;
    
                if (Math.abs(findRssi - deviceRssi) <= 15) {
                    // RSSI 차이가 15 이하인 경우 평균값으로 업데이트
                    device.col_store_device_rssi = parseInt((findRssi + deviceRssi) / 2);
                    updateData.push(device)
                } 
                  
            } else {
                // DB에 없는 경우 삽입 대상
                insertData.push(device);
            }
        };
    
        return {insertData, updateData};
    },

    async getDeviceFindStoreId(colDeviceData){
        if(!colDeviceData.length){
            return 0
        }

        // MAC 주소만 추출
        const devicesMacInfos = colDeviceData.map(device => device.col_store_device_mac_addr);
        const tokens = new Array(devicesMacInfos.length).fill("?").join(",");

        const sql = `SELECT col_store_id, count(*) as cnt FROM ${TABLE.COL_STORE_DEVICE} 
                     WHERE col_store_device_mac_addr IN (${tokens})
                     GROUP BY col_store_id`;
    
        const [rows] = await connection.execute(sql, devicesMacInfos);

         // 수집된 기기들을 매핑하여 가장 빈도가 높은 col_store_id를 도출.
         //  (단, 기준은 매핑된 기기의 수가 5개 이상일 경우에만 해당 col_store_id를 유효하게 처리.)
        let maxColStoreId = 0;
        let maxCount = 0;
        
        for (const countData of rows) {
            if (countData.cnt >= 5 && countData.cnt > maxCount) {
                maxCount = countData.cnt;
                maxColStoreId = countData.col_store_id;
            }
        }

        return maxColStoreId
    },

    async getDeviceList(col_store_id){
        //colStoreDevice
        let sql = sqlHelper.SelectSimple(TABLE.COL_STORE_DEVICE, {col_store_id});
        const [row] = await connection.execute(sql.query, sql.values)
        
        //colStoreUwb
        const uwbFilter = row.filter(item => item.col_store_device_type == "UWB")
        if(uwbFilter.length){
            for(const uwbData of uwbFilter){
                const col_store_device_id = uwbData.col_store_device_id
                sql = sqlHelper.SelectSimple(TABLE.COL_STORE_DEVICE_UWB, {col_store_device_id})
                const [[uwbResult]] = await connection.execute(sql.query, sql.values)
                if(uwbResult){
                    uwbData["col_store_device_uwb"] = uwbResult
                }
            }
        }
        return row
    },


    async removeDevices(col_store_id, isParent){
        // uwb Ranging 정보가 있다면 Ranging부터 제거
        // TODO: col_store의 하위로 연결 된 매장 있다면 그부분부터 제거

        // 기본 DELETE 쿼리
        let deleteUwbDeviceSql = `
            DELETE FROM ${TABLE.COL_STORE_DEVICE_UWB}
            WHERE col_store_device_id IN (
                SELECT col_store_device_id 
                FROM ${TABLE.COL_STORE_DEVICE} 
                WHERE col_store_id = ?
            )
        `;
        
        // isParent가 true일 경우 추가 조건
        if (isParent) {
            deleteUwbDeviceSql += `
                OR col_store_device_id IN (
                    SELECT col_store_device_id 
                    FROM ${TABLE.COL_STORE_DEVICE} 
                    WHERE col_store_id IN (
                        SELECT col_store_id 
                        FROM col_store 
                        WHERE parent_store_id = ?
                    )
                )
            `;
        }
        
        // 매개변수 설정
        const params = isParent ? [col_store_id, col_store_id] : [col_store_id];
        
        // SQL 실행
        await connection.execute(deleteUwbDeviceSql, params);
        
        // 매장 내 Device 제거
        if(isParent){
            //isParent가 true일 경우 하위매장부터 제거
            const sql = `DELETE FROM ${TABLE.COL_STORE_DEVICE} 
                        WHERE col_store_id IN 
                        (SELECT col_store_id FROM ${TABLE.COL_STORE} WHERE parent_store_id = ${col_store_id})`
            await connection.execute(sql);
        }
        const sql = sqlHelper.DeleteSimple(TABLE.COL_STORE_DEVICE, { col_store_id });
        const [row] = await connection.execute(sql.query, sql.values);
        return row;
    },

    // 매장 데이터 그룹화
    groupByParentStoreAndMac(rows){
        const groupedData = {};

        for(const row of rows){
            const parentStoreId = row.parent_store_id || row.col_store_id;
            const macAddr = row.col_store_device_mac_addr;

            if(!groupedData[parentStoreId]){
                groupedData[parentStoreId] = {};
            }

            if(!groupedData[parentStoreId][macAddr]){
                groupedData[parentStoreId][macAddr] = [];
            }

            groupedData[parentStoreId][macAddr].push(row)
        }
        return groupedData;
    },

    // 매칭 로직
    detectStoreEntry(ScanDatas, rows){
       // 1. 매장 데이터 그룹화 (상위 매장 및 MAC 주소 기준)
       const groupedData = this.groupByParentStoreAndMac(rows);

       // 2. 매칭 결과 저장
       const matchResults = [];

       for(const Scandevice of ScanDatas){
        const {col_store_device_mac_addr} = Scandevice;
        let isMatched = false;

        //상위 매장 순회
        for(const [storeId, macGroups] of Object.entries(groupedData)){
            // 해당 MAC 주소가 이 매장에 존재하는지 확인
            const matchedDevices = macGroups[col_store_device_mac_addr] || [];


            const filteredDevices = matchedDevices.filter(device => {
              // device.col_store_device_rssi: 실제 기기에서 수집된 RSSI 값
              // device.col_store_device_min_rssi: 해당 기기에 설정된 최소 RSSI 값
              // device.col_store_device_max_rssi: 해당 기기에 설정된 최대 RSSI 값
              console.log('scanDevice  Rssi ', device.col_store_device_nm, ' : ', Scandevice.col_store_device_rssi,  " == ", "minRssi : ", device.col_store_device_min_rssi, " maxRssi : ", device.col_store_device_max_rssi)
              return (
                Scandevice.col_store_device_rssi >= device.col_store_device_min_rssi &&
                Scandevice.col_store_device_rssi <= device.col_store_device_max_rssi
              );
            });

            if (filteredDevices.length > 0) {
                isMatched = true;
                matchResults.push({ storeId, Scandevice });
                break; // 한 매장과 매칭되면 다른 매장은 검사하지 않음
            }

            if (!isMatched) {
                console.log(`No match found for device:`, Scandevice);
            }
        }         
       }

       const totalDevices = ScanDatas.length;
       const matchedDevices = matchResults.length;
       const matchRate = totalDevices > 0 ? (matchedDevices / totalDevices) * 100 : 0.0;
       let isMatched = false;
       let storeId = 0;

       if(totalDevices >= 1 && totalDevices <= 3){
            // 1~3개: 최소 1개 매칭
            isMatched = matchedDevices >= 1 
       } else {
            isMatched = matchRate >= 60;
       }
    
       
       if (isMatched) {
         storeId = matchResults[0]?.storeId || 0;
         console.log(`User is inside the store: ${storeId}`);
       }
       
       return {
         isMatched,
         storeId,
         matchRate
       };
    },

    // processScanData(scanDatas, rows){
    //     const groupedStores = groupByStore(rows); // 매장 그룹화
    //     console.log('groupedStores : ', groupedStores);
    // }

}

module.exports = colStoreDevice