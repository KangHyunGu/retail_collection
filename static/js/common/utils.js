function formatTimestampCustom (timestamp){
    const date = new Date(timestamp);

    const padZero = (num) => (num < 10 ? '0' : '') + num;

    const year = date.getFullYear();
    const month = padZero(date.getMonth() + 1); // 월은 0부터 시작하므로 +1
    const day = padZero(date.getDate());
    const hours = padZero(date.getHours());
    const minutes = padZero(date.getMinutes());
    const seconds = padZero(date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};