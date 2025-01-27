let map;
let markers = [];
let infoWindow;
let currentMapMarker = null;
let contextMenuMarker = null; // 컨텍스트 메뉴가 표시된 마커
let favorites = []; // 즐겨찾기 데이터 배열
let circle = null;  // 중심원을 저장하는 변수
let collectionPlaces = [];
let collectionMarkers = [];

let currentPlaceListPage = 1;

let isSearch = false;

// icon 관련 사이트
// https://icons8.com
const currentMapMarkerIcon = "https://img.icons8.com/ultraviolet/36/marker.png"; // 파란색 마커 아이콘
const yellowStarIcon = "https://img.icons8.com/flat-round/36/star--v1.png";

// VC 체크용 Icon
const vcCheckIcon = "https://img.icons8.com/emoji/50/check-mark-emoji.png";


let favoriteIcon;

const types = 
    {
        "special" : {title:"기타", icon: "https://img.icons8.com/color/50/marker-pen.png"},
        "cafe"    : {title:"커피숍", icon: "https://img.icons8.com/color/50/cafe-building.png"},
        "pharmacy": {title:"약국", icon: "https://img.icons8.com/color/50/drugstore.png"}
    }
