function updatePlacesCollectionList() {
    const totalItems = collectionPlaces.length;
    const itemsPerPage = 10
    const totalPages = Math.ceil(totalItems / itemsPerPage)

    if(currentPlaceListPage > totalPages || currentPlaceListPage < 1){
        return [];
    }

    const startIndex = (currentPlaceListPage - 1) * itemsPerPage
    let endIndex = Math.min(startIndex + itemsPerPage, collectionPlaces.length);

    // 추가 조건: 데이터가 한 페이지에 다 들어올 경우
    if (collectionPlaces.length <= itemsPerPage) {
        endIndex = collectionPlaces.length;
    }

    const $dataList = $('#data-list');
    $dataList.empty();

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

function processPlacesCreate(){
    const customDatas = [];
    const type = $("#placeType").val();
    for(const marker of markers){
        const customData = marker.customData;
        const geometry_lat = customData.geometry_lat;
        const geometry_lng = customData.geometry_lng;
        const offsetData = calculateOffset(geometry_lat, geometry_lng);
        customDatas.push({...customData, ...offsetData, type});
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