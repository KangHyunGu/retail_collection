function updatePlacesCollectionList() {
    // 1. 기존 마커 제거
    collectionMarkers.forEach(marker => marker.setMap(null));
    collectionMarkers = [];

    const totalItems = placesGetTotalCount;
    const itemsPerPage = 50
    const totalPages = Math.ceil(totalItems / itemsPerPage)

    const $dataList = $('#data-list');
    $dataList.empty();

    if(currentPlaceListPage > totalPages || currentPlaceListPage < 1){
        return [];
    }

    const startIndex = (currentPlaceListPage - 1) * itemsPerPage
    let endIndex = Math.min(startIndex + itemsPerPage, collectionPlaces.length);
    
    // 추가 조건: 데이터가 한 페이지에 다 들어올 경우
    if (collectionPlaces.length <= itemsPerPage) {
        endIndex = collectionPlaces.length;
    }

    for(let idx = startIndex; idx < endIndex; idx++){
        const place_name = collectionPlaces[idx].place_name;
        const formatted_address = collectionPlaces[idx].formatted_address;
        const type_name = collectionPlaces[idx].type_name;
        const lat = collectionPlaces[idx].geometry_lat;
        const lng = collectionPlaces[idx].geometry_lng;

        const listItem = $(`
            <li>
               <span><strong>${place_name}</strong><br>${formatted_address}</span>
               
                <span style="display: flex; align-items: center;">
                        <span class="type-label">${type_name}</span>
                        <span class="info-icon" title="상세 정보"></span>
                 </span>
            </li>
        `)

        $dataList.append(listItem);
       
        listItem.click(() => {    
            map.setCenter({lat, lng});
            map.setZoom(20);
        })

        const markerOptions = {
            position: {lat, lng},
            map: map,
            icon: types[collectionPlaces[idx].type].icon
        }

        const marker = createMarker(markerOptions);
        collectionMarkers.push(marker);
    }
}

function updatePagination(page = 1) {
    currentPage = page;
    totalPages = Math.max(1, Math.ceil(placesGetTotalCount / placesGetLimit)); // 최소 1페이지 보장

    const $pagination = $("#pagination");
    $pagination.empty();

    // 이전 버튼
    if (currentPage > 1) {
        $pagination.append(`
            <button class="pagination-button" onclick="fetchCollectionPlaces(currentRegion.id, 'all', ${currentPage - 1})">이전</button>
        `);
    }

    // 페이지 번호
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        if (i === currentPage) {
            $pagination.append(`
                <button class="pagination-button active">${i}</button>
            `);
        } else {
            $pagination.append(`
                <button class="pagination-button" onclick="fetchCollectionPlaces(currentRegion.id, '${currentType}', ${i})">${i}</button>
            `);
        }
    }

    // 다음 버튼
    if (currentPage < totalPages) {
        $pagination.append(`
            <button class="pagination-button" onclick="fetchCollectionPlaces(currentRegion.id, 'all', ${currentPage + 1})">다음</button>
        `);
    }
}

// Select Box 초기화(지역)
async function initializeRegionSelect() {
    const $regionSelect = $("#regionSelect");
    
    // 지역 데이터 가져오기
    const data = await fetchRegions();
    if(data.success){
        // Select Box 옵션 추가
        data.regions.forEach(region => {
            const options = `<option value=${region.id}>${region.region_name}</option>`
            $regionSelect.append(options);

            // region 데이터 삽입
            places_region.push(region);
        })

        // 첫 번째 항목 자동 선택
        if (data.regions.length > 0) {
            const firstRegionId = data.regions[0].id;
            $regionSelect.val(firstRegionId); // 첫 번째 항목 선택
            $regionSelect.trigger("change"); // 이벤트 트리거
        }
    } else {
        console.error('지역 데이터 가져오기 실패 : ', data.message);
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