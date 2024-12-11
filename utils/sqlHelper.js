const sqlHelper = {
    SelectSimple(table, data = null, cols = [], sort = null, group = []){
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

        // Group By
        if(group.length > 0){
            query += ` GROUP BY ` + group.join(", ");
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
        const prepare = [];
        const values = [];
        for(const key of keys){
            // location처럼 (Point타입) SQL 함수가 필요한 필드는 직접 삽입
            if(typeof data[key] == 'string' && data[key].startsWith('ST_SRID')){
                prepare.push(data[key]); // SQL 함수로 직접 삽입
            } else {
                prepare.push("?");
                values.push(data[key]); // 일반 값은 Prepared Statement로 처리
            }
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

    Update(table, data, where) {
		let query = `UPDATE ${table} SET {1} WHERE {2}`;
		const keys = Object.keys(data);
		const sets = [];
		const values = [];
		for (const key of keys) {
			sets.push(`${key}=?`);
			values.push(data[key]);
		}
		query = query.replace('{1}', sets.join(', '));

		const keys2 = Object.keys(where);
		const wheres = [];
		for (const key of keys2) {
			wheres.push(`${key}=?`);
			values.push(where[key]);
		}
		query = query.replace('{2}', wheres.join(' AND '));
		return { query, values };
	},
    
    generateCaseWhenUpdate(table, data, idColumn, caseColumn, fixedColumns) {
        let query = `UPDATE ${table} SET {1}, {2} WHERE {3}`;
        const caseWhenParts = [];
        const values = [];

         // 고정 값 설정
         const fixedSetClauses = fixedColumns.map(col => `${col.name} = ?`);
         fixedColumns.forEach(col => values.push(col.value));
    
        // CASE WHEN 구문 생성
        for (const item of data) {
            caseWhenParts.push(`WHEN ${idColumn} = ? THEN ?`);
            values.push(item[idColumn], item[caseColumn]);
        }
    
        // CASE WHEN 구문 완성
        const caseClause = `${caseColumn} = CASE ${caseWhenParts.join(' ')} END`;
    
        // WHERE 조건 생성
        const whereClause = `${idColumn} IN (${data.map(() => '?').join(', ')})`;
        values.push(...data.map(item => item[idColumn]));
    
        query = query
            .replace('{1}', fixedSetClauses.join(', '))
            .replace('{2}', caseClause)
            .replace('{3}', whereClause);
    
        return { query, values };
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