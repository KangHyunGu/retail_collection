function updatePlacesCollectionList(type = "all", page = 1) {
    // 1. 기존 마커 제거
    collectionMarkers.forEach(marker => marker.setMap(null));
    collectionMarkers = [];
    
    // 먼저 필터링을 수행합니다.
    if(currentType != type || !filteredPlacesCache.length){
        filteredPlacesCache = type === 'all' ? collectionPlaces : collectionPlaces.filter((place) => {
            return place.type === type
        });    
    }
    
    const totalItems = filteredPlacesCache.length;
    const itemsPerPage = 300;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    console.log(`${currentPlaceListPage} / ${totalPages}`);

    const $dataList = $('#data-list');
    console.log($dataList);
    $dataList.empty();
    console.log('currentPlaceListPage : ', currentPlaceListPage);
    if (currentPlaceListPage > totalPages || currentPlaceListPage < 1) {
        return [];
    }

    const startIndex = (currentPlaceListPage - 1) * itemsPerPage;
    let endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    //console.log('startIndex:', startIndex, 'endIndex:', endIndex);
    //console.log('filteredPlaces:', filteredPlacesCache);

    // filteredPlaces 배열에 대해 루프를 돌립니다.
    for (let idx = startIndex; idx < endIndex; idx++) {
        const { place_name, formatted_address, type_name, geometry_lat, geometry_lng, type } = filteredPlacesCache[idx];

        const listItem = $(`
            <li>
                <span><strong>${place_name}</strong><br>${formatted_address}</span>
                <span style="display: flex; align-items: center;">
                    <span class="type-label">${type_name}</span>
                    <span class="info-icon" title="상세 정보"></span>
                </span>
            </li>
        `);

        $dataList.append(listItem);

        listItem.click(() => {
            map.setCenter({ lat: geometry_lat, lng: geometry_lng });
            map.setZoom(18);
        });

        const markerOptions = {
            position: { lat: geometry_lat, lng: geometry_lng },
            map: map,
            icon: types[type].icon
        };

        const marker = createMarker(markerOptions);
        collectionMarkers.push(marker);
    }

    currentPage = page;

    const $pagination = $("#pagination");
    $pagination.empty();


    // 이전 버튼
    if (currentPage > 1) {
        $pagination.append(`
            <button class="pagination-button" onclick="updatePlacesListEvent('${type}', ${currentPage - 1})">이전</button>
        `);
    }

    // 페이지 번호 (현재 페이지를 중심으로 앞뒤 2페이지)
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        if (i === currentPage) {
            $pagination.append(`<button class="pagination-button active">${i}</button>`);
        } else {
            $pagination.append(`
                <button class="pagination-button" onclick="updatePlacesListEvent('${type}', ${i})">${i}</button>
            `);
        }
    }

    // 다음 버튼
    if (currentPage < totalPages) {
        $pagination.append(`
            <button class="pagination-button" onclick="updatePlacesListEvent('${type}', ${currentPage + 1})">다음</button>
        `);
    }
}

function updatePagination(type = "all", page = 1) {
    currentPage = page;

    // pages 계산시 필터링된 배열의 길이를 사용하려면, 먼저 필터링
    const filteredPlaces = type === 'all' ? collectionPlaces : collectionPlaces.filter(place => place.type === type);
    const placesGetLimit = 300;  // itemsPerPage와 동일
    
    const totalPages = Math.max(1, Math.ceil(filteredPlaces.length / placesGetLimit));
   
    const $pagination = $("#pagination");
    $pagination.empty();

    // 이전 버튼
    if (currentPage > 1) {
        $pagination.append(`
            <button class="pagination-button" onclick="updatePlacesListEvent('${type}', ${currentPage - 1})">이전</button>
        `);
    }

    // 페이지 번호 (현재 페이지를 중심으로 앞뒤 2페이지)
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        if (i === currentPage) {
            $pagination.append(`<button class="pagination-button active">${i}</button>`);
        } else {
            $pagination.append(`
                <button class="pagination-button" onclick="updatePlacesListEvent('${type}', ${i})">${i}</button>
            `);
        }
    }

    // 다음 버튼
    if (currentPage < totalPages) {
        $pagination.append(`
            <button class="pagination-button" onclick="updatePlacesListEvent('${type}', ${currentPage + 1})">다음</button>
        `);
    }
}

function updatePlacesListEvent(type, page) {
    currentPage = page;
    currentPlaceListPage = page;  // 두 변수를 함께 업데이트
    updatePlacesCollectionList(type, page);
    //updatePagination(type, page);
}


// Select Box 초기화(지역)
async function initializeRegionSelect() {
    const $regionSelect = $("#regionSelect");
    
    // 지역 데이터 가져오기
    const data = await fetchLoadPreFecTure();
    
    // Select Box 옵션 추가
    data.forEach(prefecture => {
        const options = `<option value=${prefecture.id}>${prefecture.name}</option>`
        $regionSelect.append(options);
        // region 데이터 삽입
        preFecTureDatas.push(prefecture);
    })

    // 첫 번째 항목 자동 선택
    if (data.length > 0) {
        const firstRegionId = data[0].id;
        $regionSelect.val(firstRegionId); // 첫 번째 항목 선택
        $regionSelect.trigger("change"); // 이벤트 트리거
    }
}

function processPlacesCreate(){
    const customDatas = [];
    const type = $("#placeType").val();

    // 이미 수집 된 목록 있으면 제외
    const filterMarkers = markers.filter((marker) => !marker.customData.is_collected);
    for(const marker of filterMarkers){
        const customData = marker.customData;        
        const geometry_lat = customData.geometry_lat;
        const geometry_lng = customData.geometry_lng;
        const offsetData = calculateOffset(geometry_lat, geometry_lng);
        delete customData.is_collected;
        customDatas.push({...customData, ...offsetData, type});
    }

    if(!customDatas.length){
        alert('이미 수집이 완료 된 장소들입니다.');
        return;
    }
    
    createPlaceCollections(customDatas);
}

// Offset 계산 함수
// 기존 center 중심으로 부터 distanceInMeters 만큼 east, west, north, south offset 생성
function calculateOffset(lat, lng, distanceInMeters = 30) {
    const earthRadius = 6378137; // 지구 반지름 (미터 단위)
    // 위도 차이
    const latOffset = distanceInMeters / earthRadius * (180 / Math.PI);
    // 경도 차이
    const lngOffset = distanceInMeters / (earthRadius * Math.cos((lat * Math.PI) / 180)) * (180 / Math.PI);

    return {
        geometry_lat: lat,
        geometry_lng: lng,
        offset_north_lat : lat + latOffset,
        offset_south_lat : lat - latOffset,
        offset_east_lng  : lng + lngOffset,
        offset_west_lng  : lng - lngOffset
    }
}   