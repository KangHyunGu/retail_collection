const db = require('../../../plugins/mysql');
const connection = db();
const sqlHelper = require('../../../utils/sqlHelper');
const TABLE = require('../../../utils/TABLE');

const vcCustomer = {
    async getCustomer(use_device_id){
        const sql = sqlHelper.SelectSimple(TABLE.VC_CUSTOMER, {use_device_id})
        const [row] = await connection.execute(sql.query, sql.values)
        return row;
    },

    async addCustomer(vcCustomer){
        const sql = sqlHelper.Insert(TABLE.VC_CUSTOMER, vcCustomer)
        const [row] = await connection.execute(sql.query, sql.values)
        return row;
    }
}

module.exports = vcCustomer