let map;
let markers = [];
let infoWindow;
let currentMapMarker = null;
let contextMenuMarker = null; // 컨텍스트 메뉴가 표시된 마커
let favorites = []; // 즐겨찾기 데이터 배열
let circle = null;  // 중심원을 저장하는 변수

// places List에 대한 페이징
let currentPage = 1;
let currentPlaceListPage = 1;

let isSearch = false;

// 현재는 페이지별로 불러온 데이터만 저장됨
let collectionPlaces = [];
// collectionPlaces에서 타입에 맞게 필터링 처리
let filteredPlacesCache = [];
// { regionId: [전체 데이터] } 형태로 지역별 데이터를 캐싱
let placesCache = {}; 

let collectionMarkers = [];
let placesGetLimit = 50;
let placesTotalPages = 1;
let placesGetTotalCount = 0;

let places_region = []; // places_region 데이터
let preFecTureDatas = [];   // 행정경계(도,도,부,현 단위 또는 도경계)
let cityDatas = [];     // city데이터

let currentRegion = {}; // 현재 선택한 지역 region
let RegionPolygons = []; // Zoom Level에 따른 전체 region
let cityRegionPolygons = [] //Zoom Level에 따른 전체 region(시 데이터 저장)

let currentRegionRectangle = null; // 현재 지역 경계를 저장할 변수
let currentRegionPolygon = null;

let currentType = 'all';

let places_vc_logs = [];

let heatMapData = []; // 히드맵을 활용하기 위한 변수
let heatMap = null;

let isCitySelect = false;

let caching_center_lat = null;
let caching_center_lng = null;
let caching_north_lat = null;
let caching_south_lat = null;
let caching_east_lng = null;
let caching_west_lng = null;


// icon 관련 사이트
// https://icons8.com
const currentMapMarkerIcon = "https://img.icons8.com/ultraviolet/50/marker.png"; // 파란색 마커 아이콘
const yellowStarIcon = "https://img.icons8.com/flat-round/50/star--v1.png";

// 이미 수집 완료 된 Icon
const collectedIcon = "https://img.icons8.com/color/50/place-marker--v1.png"

// VC 체크용 Icon
const vcCheckIcon = "https://img.icons8.com/emoji/50/check-mark-emoji.png";

let favoriteIcon;

const types = 
    {
        "special" : {icon: "https://img.icons8.com/color/50/marker-pen.png"},
        "cafe"    : {icon: "https://img.icons8.com/color/50/cafe-building.png"},
        "pharmacy": {icon: "https://img.icons8.com/color-glass/50/pharmacy-shop.png"},
        "drugstore": {icon: "https://img.icons8.com/color/50/drugstore.png"},
        "convenience_store" : {icon: "https://img.icons8.com/emoji/50/convenience-store.png"},
        "department_store"  : {icon: "https://img.icons8.com/emoji/50/department-store.png"},
        "shopping_mall"     : {icon: "https://img.icons8.com/fluency/50/shopping-mall.png"},
        "supermarket" : {icon: "https://img.icons8.com/color/50/grocery-store.png"}
    }

    
