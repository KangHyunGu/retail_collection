function initMap() {
    const defaultLocation = { lat: 37.5665, lng: 126.9780 }; // 서울 시청

    map = new google.maps.Map(document.getElementById('map'), {
        center: defaultLocation,
        zoom: 18,
        minZoom: 5,  // 최소 zoom 레벨
    });

    infoWindow = new google.maps.InfoWindow();

    map.addListener('click', (event) => {
        closeContextMenu();
        closeFavoritePopup();
        const {lat, lng} = event.latLng.toJSON();

        if(currentMapMarker != null) {
            currentMapMarker.setMap(null);
        }

        const zoom = map.getZoom();
        if(zoom <= 13){
            return;
        }

        const markerOptions = {
            position: {lat, lng},
            map: map,
            icon: currentMapMarkerIcon //파란마커 지정
        }

        currentMapMarker = createMarker(markerOptions)

        //const searchType = $('#searchType').val();
        const radius = Number($("#radius").val()) || 500;
        createCircle(lat, lng, radius);
        $('#search-current-region-btn').attr('disabled', false);
       
        // if(searchType == 'nearby'){
        //     const radius = Number($("#radius").val()) || 500;
        //     createCircle(lat, lng, radius)
        // }
    });
    // 줌 변경 이벤트 리스너 추가
    map.addListener("zoom_changed", () => {
        const zoom = map.getZoom();
        const bounds = map.getBounds();
        const north = bounds.getNorthEast().lat();  // 북쪽 위도
        const east  = bounds.getNorthEast().lng();  // 동쪽 경도
        const south = bounds.getSouthWest().lat();  // 남쪽 위도
        const west  = bounds.getSouthWest().lng();  // 서쪽 경도
        const center_lat = bounds.getCenter().lat();
        const center_lng = bounds.getCenter().lng();
    
        //console.log('zoom level : ', zoom);
        //console.log("북쪽: " + north + ", 동쪽: " + east + ", 남쪽: " + south + ", 서쪽: " + west);
        //console.log('중심_lat : ', center_lat, ", 중심_lng : ", center_lng);
    
        // 1. zoom level이 10 이하인 경우 : 기존 region polygon 유지
        if (zoom <= 10) {
            // region polygon이 없으면 그리기
            // 시 데이터와 개별 마커 숨기기 (혹은 별도로 관리)
            loadPreFecTure();
            hideCityCircles();
            hideIndividualMarkers();
            displayRightSideControl(false);
            $('#search-current-region-btn').attr('disabled', true);
        }
        // 2. zoom level이 10 ~ 12인 경우 : 시 데이터 불러오기 및 표시
        else if (zoom >= 11 && zoom <= 12) {
            // region polygon은 숨김
            for (const regionPolygon of RegionPolygons) {
                regionPolygon.setVisible(false);
                regionPolygon.labelMarker.setVisible(false);
            }
            // 개별 마커 숨김 (필요시)
            hideIndividualMarkers();
            // 시 데이터를 현재 지도 영역 기준으로 불러오기
            hideCityCircles();
            displayRightSideControl(false);
           
            cityDatas = loadCity(north, south, east, west, center_lat, center_lng, zoom);
            $('#search-current-region-btn').attr('disabled', true);
           
        }
        // 3. zoom level이 13 이상인 경우 : 개별 데이터 마커 표시
        else if (zoom >= 13) {
            // region polygon과 시 데이터 마커 숨김
            for (const regionPolygon of RegionPolygons) {
                regionPolygon.setVisible(false);
                regionPolygon.labelMarker.setVisible(false);
            }
            hideCityCircles();
            displayRightSideControl(true);

            // if(!collectionMarkers.length){
            //     loadCollectionPlaces();
            // }
           
            collectionMarkers.forEach(marker => {
                marker.setVisible(true);
            });
        }
    
        // 아이콘 크기 조정 (기존 로직)
        let newSize = 30;
        if (zoom >= 13 && zoom <= 14) {
            newSize = 30;
        } else if (zoom >= 15) {
            newSize = 50;
        }
    
        collectionMarkers.forEach(marker => {
            if (zoom <= 12) {
                hideIndividualMarkers();
            } else {
                marker.setVisible(true);
                let icon = marker.getIcon();
                if (typeof icon === "string") {
                    const newIconUrl = getHighResIconUrl(icon, newSize);
                    //console.log("마커 아이콘 업데이트:", newIconUrl);
                    marker.setIcon(newIconUrl);
                }
            }
        });
    
        // 타입별 아이콘 업데이트
        const typeKeys = Object.keys(types);
        for (const key of typeKeys) {
            types[key].icon = getHighResIconUrl(types[key].icon, newSize);
        }
    });

    favoriteIcon = {
        url: "https://img.icons8.com/flat-round/36/star--v1.png",
        scaledSize: new google.maps.Size(36, 36), // 크기 조정
        anchor: new google.maps.Point(20, 20), // 기준점
    };
}

async function loadCity(north, south, east, west, center_lat, center_lng, zoom){

    cityDatas = await fetchLoadCityData(north, south, east, west, center_lat, center_lng, zoom);
  
    for(const city of cityDatas){
        const cityCircle = drawCityCircle(city)
        cityRegionPolygons.push(cityCircle);
    }
}

async function loadPreFecTure(){
    const zoom = map.getZoom();
    if(!RegionPolygons.length){
        for(const prefecture of preFecTureDatas){
            const RegionPolygon = drawPreFecTureCircle(prefecture);
            RegionPolygons.push(RegionPolygon)
        }
    }

    for (const regionPolygon of RegionPolygons) {
        if (zoom <= 7) {
            const isVisible = regionPolygon.radius >= 10000;
            regionPolygon.setVisible(isVisible);
            regionPolygon.labelMarker.setVisible(isVisible);
        } else {
            regionPolygon.setVisible(true);
            regionPolygon.labelMarker.setVisible(true);
        }
    }
}

async function loadCollectionPlaces(){
    
    await fetchCollectionPlaces('all', 1);
}

// 지도에 그려진 도시 원을 모두 제거하는 함수
function hideCityCircles() {
    cityRegionPolygons.forEach(circle => {
        circle.setMap(null);
        if (circle.labelMarker) {
            circle.labelMarker.setMap(null);
        }
    });
    cityRegionPolygons = [];
}

// 개별 데이터 마커(collectionMarkers)를 숨기는 함수
function hideIndividualMarkers() {
    //console.log('hideIndividualMarkers');
    collectionMarkers.forEach((marker) => {
        marker.setVisible(false)
    });
}

function createMarker(markerOptions){
    const marker = new google.maps.Marker(markerOptions);

    marker.addListener('rightclick', (event) => {
        // 마우스 오른쪽 클릭 이벤트
        OpenContextMenu(event, marker);
    })

    if(map.getZoom() <= 11){
        hideIndividualMarkers();
    }

    return marker;
}

function createCircle(lat, lng, radius) {
     // 기존 원이 있다면 제거
     if(circle){
        circle.setMap(null);
    }

    // 반경 원 생성
    circle = new google.maps.Circle({
        map: map,
        center: {lat, lng},
        radius: radius, // 반경 (미터 단위)
        strokeColor: "#007bff", // 원 테두리 색상
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#007bff", // 원 내부 색상
        fillOpacity: 0.2,
        clickable: false, // 클릭 이벤트 차단 해제
        zIndex: 100
    })
    // const center = circle.getCenter();
    // const earthRadius = 6378137; // 지구 반지름 (미터)

    // // 위도 차이 계산 (위아래)
    // const latOffset = (radius / earthRadius) * (180 / Math.PI);
    // // 경도 차이 계산 (좌우, 위도에 따른 보정 적용)
    // const lngOffset = (radius / (earthRadius * Math.cos((center.lat() * Math.PI) / 180))) * (180 / Math.PI);

    // const offset = {
    //     north: center.lat() + latOffset,  // 북쪽
    //     south: center.lat() - latOffset,  // 남쪽
    //     east: center.lng() + lngOffset,   // 동쪽
    //     west: center.lng() - lngOffset    // 서쪽
    // };

    // console.log('center lat : ', center.lat(), ' == ', 'center lng : ', center.lng());
    // console.log('rad : ', radius);
    // console.log('offset : ', offset);
    // console.log('circle : ', circle);
}

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

function OpenContextMenu (event, marker) {
    contextMenuMarker = marker;

    const menu = document.getElementById('context-menu');
    menu.style.left = `${event.domEvent.pageX}px`; // 마우스 위치에 메뉴 표시
    menu.style.top = `${event.domEvent.pageY}px`;
    menu.style.display = 'block';

    // "즐겨찾기 추가" 클릭 이벤트
    $('#add-favorite').off('click').on('click', () => {
        showFavoritePopup(marker.getPosition());
        closeContextMenu();
    });
}

function closeContextMenu () {
    document.getElementById('context-menu').style.display = 'none';
}

function drawPreFecTureCircle(region, isGoto = false) {
    

    const total_places = region.total_places;
    // 1) 중심점 계산
    const centerLat = region.major_city_lat;
    const centerLng = region.major_city_lng;
    const center = new google.maps.LatLng(centerLat, centerLng);
  
    // 2) 반지름 계산
    // 기준: 예를 들어, 기준 장소 수를 5000으로 설정하고,
    // 해당 기준에 대해 기본 반지름을 100미터로 정의
    // 실제 반지름은 (places_cnt / 기준 장소수) * 기본 반지름으로 산출
    const baseCount = 10000;  // 기준 장소 수
    const baseRadius = 20000;  // 기준 장소 수에 해당하는 반지름 (미터)
    const radius = Math.round(baseRadius * (total_places / baseCount)) >= 7000
        ? Math.round(baseRadius * (total_places / baseCount))
        : 7000
  
    // 3) 원의 좌표 배열 생성 (부드러운 원을 위해 60 포인트)
    const steps = 60;
    const circleCoords = [];
    for (let i = 0; i < steps; i++) {
      // 각도는 0~360도를 균일하게 분할
      const heading = i * (360 / steps);
      // 중심에서 radius(미터)만큼 떨어진 좌표 계산
      const point = google.maps.geometry.spherical.computeOffset(center, radius, heading);
      circleCoords.push(point);
    }
  
    // 4) 구글 맵 Polygon 객체 생성 (원 형태)
    const countCircle = new google.maps.Polygon({
      paths: circleCoords,
      strokeColor: "#FF0000",
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: "#FF0000",
      fillOpacity: 0.5,
      map: map
    });

    countCircle.radius = Number(radius);

    // 5) 클릭 이벤트 추가 (필요한 경우)
    countCircle.addListener("click", (event) => {
        //console.log('region.id : ', region.id);
        $('#regionSelect').val(`${region.id}`);
        $("#regionSelect").trigger('change');
    });


    // 원의 중심 좌표 계산 (이미 center 변수에 저장되어 있음)
    const markerCenter = new google.maps.LatLng(centerLat, centerLng);

    // 숫자를 표시하는 Marker 생성 (투명한 아이콘 사용)
    const labelMarker = new google.maps.Marker({
    position: markerCenter,
    map: map,
    // 아이콘을 투명하게 하여 마커 아이콘은 보이지 않고 label만 보이게 함
    icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 0, // 아이콘 크기를 0으로 설정
    },
    label: {
        text: `${total_places}`,  // 표시할 숫자 (예: 지역의 장소 개수)
        color: "white",         // 텍스트 색상
        fontSize: "14px",
        fontWeight: "bold"
    },
    clickable: false  // 클릭 이벤트를 Marker 대신 Polygon에 위임하는 경우
    });

    countCircle.labelMarker = labelMarker;

    if(isGoto){
        map.setCenter({lat: centerLat, lng: centerLng});
        map.setZoom(11);
    }

    const zoom = map.getZoom();
    if(zoom > 10){
        countCircle.setVisible(false);
        countCircle.labelMarker.setVisible(false);
    }
  
    return countCircle;
  }

function drawCityCircle(city, latGrid, lngGrid) {
    const count = city.total_places;
    // 1) 중심점 계산
    //const centerLat = city.group_lat * latGrid + (latGrid / 2);
    //const centerLng = city.group_lng * lngGrid + (lngGrid / 2);
    const centerLat = city.center_lat;
    const centerLng = city.center_lng;
    //const centerLat = city.grid_center_lat;
    //const centerLng = city.grid_center_lng;
    const center = new google.maps.LatLng(centerLat, centerLng);
    
    // 2) 반지름 계산
    // 예를 들어, 기준 도시 수치를 50000으로 잡고, 기본 반지름을 15000미터로 정의
    const baseCount = 1000;     // 기준 도시 수치
    const baseRadius = 1500;    // 기준 도시 수치에 해당하는 반지름 (미터)
    const calcRadius = Math.round(baseRadius * (count / baseCount));
    const radius = calcRadius >= 1500 ? calcRadius : 1500; // 최소 반지름 2500

    // 3) 원의 좌표 배열 생성 (부드러운 원을 위해 60 포인트)
    const steps = 60;
    const circleCoords = [];
    for (let i = 0; i < steps; i++) {
        const heading = i * (360 / steps);
        const point = google.maps.geometry.spherical.computeOffset(center, radius, heading);
        circleCoords.push(point);
    }
    
    // 4) 구글 맵 Polygon 객체 생성 (도시 원 형태)
    const cityCircle = new google.maps.Polygon({
        paths: circleCoords,
        strokeColor: "#FF0000",   // 예시: 초록색
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.5,
        map: map
    });
    cityCircle.radius = Number(radius);
    
    // 5) 클릭 이벤트 추가 (필요에 따라)
    cityCircle.addListener("click", () => {
        // 예: $('#citySelect').val(city.id);
        //     $("#citySelect").trigger('change');
    });
    
    // 6) 라벨 마커 생성 (도시 이름 또는 수치 표시)
    const labelMarker = new google.maps.Marker({
        position: center,
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 0
        },
        label: {
            text: count.toString(),    // 혹은 city_cnt.toString() 등 원하는 텍스트
            color: "white",
            fontSize: "14px",
            fontWeight: "bold"
        },
        clickable: false
    });
    cityCircle.labelMarker = labelMarker;
    
    return cityCircle;
}


// // currentRegionRectangle
// function drawRegionBounds(region, isGoto = false) {
    
//     // region 객체에서 동‧서‧남‧북 좌표 추출
//     const {
//         offset_south_lat: S,
//         offset_north_lat: N,
//         offset_east_lng: E,
//         offset_west_lng: W
//     } = region;

//     // 1) 중심점 계산
//     const centerLat = (N + S) / 2;
//     const centerLng = (E + W) / 2;
//     const center = new google.maps.LatLng(centerLat, centerLng);

//     // 2) 위도, 경도 범위 차이 (단순 각도 차이)
//     const latRange = N - S;
//     const lngRange = E - W;

//     // 3) 실제 거리(미터)로 반지름 계산  
//     //    - 중심에서 서쪽 좌표까지의 거리(horizontalDistance)  
//     //    - 중심에서 남쪽 좌표까지의 거리(verticalDistance)  
//     //    - 동, 서, 남, 북 모두 포함하려면 더 큰 거리를 반지름으로 채택
//     const westPoint = new google.maps.LatLng(centerLat, centerLng - lngRange / 2);
//     const southPoint = new google.maps.LatLng(centerLat - latRange / 2, centerLng);

//     const horizontalDistance = google.maps.geometry.spherical.computeDistanceBetween(center, westPoint);
//     const verticalDistance = google.maps.geometry.spherical.computeDistanceBetween(center, southPoint);

//     // 동, 서, 남, 북 중 가장 멀리 있는 지점을 포함하도록 반지름 설정 (미터 단위)
//     const radius = Math.max(horizontalDistance, verticalDistance);

//     // 4) 원의 좌표 배열 생성 (60포인트 정도로 부드럽게)
//     const steps = 60;
//     const circleCoords = [];
//     for (let i = 0; i < steps; i++) {
//         // 각도(heading)는 0~360도로, 매 스텝마다 일정 간격
//         const heading = i * (360 / steps);
//         // 중심에서 radius(미터)만큼 이동한 좌표 계산 (실제 미터 단위 원)
//         const point = google.maps.geometry.spherical.computeOffset(center, radius, heading);
//         circleCoords.push(point);
//     }

//     // 5) 구글 맵 Polygon 객체 생성 (원 형태)
//     const RegionPolygon = new google.maps.Polygon({
//         paths: circleCoords,
//         strokeColor: "#FF0000",
//         strokeOpacity: 0.8,
//         strokeWeight: 2,
//         fillColor: "#FF0000",
//         fillOpacity: 0.2,
//         map: map
//     });

//     // 6) 원의 경계에 맞춰 지도 조정
//     const bounds = new google.maps.LatLngBounds();
//     circleCoords.forEach(coord => bounds.extend(coord));
//     if(isGoto){
//         map.fitBounds(bounds);
//         map.setZoom(10);
//     }
    
//     // 7) 필요한 경우 클릭 이벤트 추가
//     RegionPolygon.addListener("click", (event) => {
//         console.log("circle click");
//         google.maps.event.trigger(map, "click", {
//             latLng: event.latLng
//         });
//     });

//     RegionPolygon.setVisible(false);

//     return RegionPolygon
// }

function getHighResIconUrl(url, size) {
    // URL에서 "/숫자/" 패턴을 찾아 원하는 크기로 변경
    return url.replace(/\/\d+\//, `/${size}/`);
  }
