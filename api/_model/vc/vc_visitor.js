const db = require('../../../plugins/mysql');
const connection = db();
const sqlHelper = require('../../../utils/sqlHelper');
const TABLE = require('../../../utils/TABLE');

const vcVisitor = {
    async createVisitorRecord(useDeviceId, colStoreId){
        const sql = `
            INSERT INTO ${TABLE.VC_VISITOR} (
            visit_date,
            start_time,
            last_matched_time,
            total_visit_use_time,
            use_device_id,
            col_store_id
            )
            VALUES (CURDATE(), NOW(), NOW(), 0, ?, ?)
        `;
        const [result] = await connection.execute(sql, [useDeviceId, colStoreId]);
        return result;
    },

    /** 추가 매칭 시 last_matched_time 갱신 */
    async updateVisitorLastMatchedTime(visitorId) {
        const sql = `
        UPDATE ${TABLE.VC_VISITOR}
        SET last_matched_time = NOW(),
        total_visit_use_time = ROUND(TIMESTAMPDIFF(SECOND, start_time, NOW()) / 30.0) * 0.5
        WHERE visitor_id = ?
        `;
        const [result] = await connection.execute(sql, [visitorId])
        return result;
    },
}

module.exports = vcVisitor