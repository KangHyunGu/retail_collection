const sqlHelper = {
    SelectSimple(table, data = null, cols = [], sort = null){
        let query = `SELECT * FROM ${table}`;
        const where = [];
        const values = [];

        if(data) {
            const keys = Object.keys(data);
            for(const key of keys){
                where.push(`${key}=?`)
                values.push(data[key])
            }
            if(where.length > 0){
                query += ` WHERE ` + where.join( ' AND ');
            }
        }

        // 선택 필드
        if(cols.length > 0){
            query = query.replace('*', cols.join(','));
        }

        // 정렬
        if(sort) {
            let sorts = [];
            const keys = Object.keys(sort);
            for(const key of keys){
                sorts.push(key + (sort[key] ? ' ASC ' : ' DESC '));
            }
            if(sorts.length) {
                query += ` ORDER BY ` + sorts.join(', ');
            }

        }

        return {query, values}
    },
    Insert(table, data){
        let query = `INSERT INTO ${table} ({1}) VALUES ({2})`;
        const keys = Object.keys(data);
        const prepare = new Array(keys.length).fill('?').join(', ');
        const values = [];
        for(const key of keys){
            values.push(data[key]);
        }
        query = query.replace('{1}', keys.join(', '));
        query = query.replace('{2}', prepare);
        return {query, values}

    },
    InsertArray(table, datas){
        let sql;
        let prepare; // (?,?,?)
        for(const i in datas){
            const data = datas[i];
            const keys = Object.keys(data);
            if(i == 0){
                sql = sqlHelper.Insert(table, data);
                prepare = new Array(keys.length).fill('?').join(', ');
            } else {
                sql.query += `, (${prepare})`;
                for(const key of keys){
                    sql.values.push(data[key]);
                }
            }
        }
        return sql;
    },

    DeleteSimple(table, data){
        let query = `DELETE FROM ${table}`;
        const where = []
        const values = []

        if(data) {
            const keys = Object.keys(data);
            for(const key of keys){
                where.push(`${key}=?`)
                values.push(data[key]);
            }
            query += ` WHERE ` + where.join(' AND ');
        } else {
            throw new Error('Where 데이터가 없습니다.');
        }

        return {query, values};
    }

}

module.exports = sqlHelper;