const db = require('../../../plugins/mysql');
const connection = db();
const sqlHelper = require('../../../utils/sqlHelper');
const TABLE = require('../../../utils/TABLE');
const moment = require('../../../utils/moment');

const vcVisitor = {
    async createVisitorRecord(useDeviceId, colStoreId, colStoreNm){
        const fieldValues = {
            visit_date : moment().format("L"),
            start_time : moment().format("LTS"),
            last_matched_time : moment().format("LTS"),
            date_year: moment().format("Y"),
            date_month: moment().format("M"),
            date_day: moment().format("D"),
            use_device_id: useDeviceId,
            col_store_id: colStoreId,
            col_store_nm: colStoreNm
        }

        const sql = sqlHelper.Insert(TABLE.VC_VISITOR, fieldValues);
        const [result] = await connection.execute(sql.query, sql.values);
        return result;
    },

    /** 추가 매칭 시 last_matched_time 갱신 */
    async updateVisitorLastMatchedTime(visitorId) {
        const updateSql = `
        UPDATE ${TABLE.VC_VISITOR}
        SET last_matched_time = NOW(),
        total_visit_use_time = ROUND(TIMESTAMPDIFF(SECOND, start_time, NOW()) / 30.0) * 0.5
        WHERE visitor_id = ?
        `;
        const [result] = await connection.execute(updateSql, [visitorId])
        return result;
    },
}

module.exports = vcVisitor