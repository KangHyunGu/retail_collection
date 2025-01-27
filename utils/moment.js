const moment = require('moment');

require('moment/locale/ko');
moment.locale('ko');

moment.updateLocale('ko', {
    longDateFormat : {
        L : 'YYYY-MM-DD',
        LT : 'YYYY-MM-DD HH:mm:ss',
        CREATE_KEY: 'YYYYMMDDHHmmss'
    }
});

// 사용자 정의 키 생성 함수
moment.createKey = () => {
    return moment().format(moment.localeData().longDateFormat("CREATE_KEY"));
};

module.exports = moment;