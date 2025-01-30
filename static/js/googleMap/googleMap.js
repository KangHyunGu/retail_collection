function initMap() {
    const defaultLocation = { lat: 37.5665, lng: 126.9780 }; // 서울 시청

    map = new google.maps.Map(document.getElementById('map'), {
        center: defaultLocation,
        zoom: 15,
    });

    infoWindow = new google.maps.InfoWindow();

    map.addListener('click', (event) => {
        closeContextMenu();
        closeFavoritePopup();
        const {lat, lng} = event.latLng.toJSON();

        if(currentMapMarker != null) {
            currentMapMarker.setMap(null);
        }

        const markerOptions = {
            position: {lat, lng},
            map: map,
            icon: currentMapMarkerIcon //파란마커 지정
        }

        currentMapMarker = createMarker(markerOptions)

        const searchType = $('#searchType').val();
        if(searchType == 'nearby'){
            const radius = Number($("#radius").val()) || 500;
            createCircle(lat, lng, radius)
        }
    });

    favoriteIcon = {
        url: "https://img.icons8.com/flat-round/36/star--v1.png",
        scaledSize: new google.maps.Size(36, 36), // 크기 조정
        anchor: new google.maps.Point(20, 20), // 기준점
    };
}

function createMarker(markerOptions){
    const marker = new google.maps.Marker(markerOptions);

    marker.addListener('rightclick', (event) => {
        // 마우스 오른쪽 클릭 이벤트
        OpenContextMenu(event, marker);
    })

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

function drawRegionBounds(region) {
    // 기존 경계 삭제 (이미 bounds로 그려진 경우)
    if(currentRegionRectangle){
        currentRegionRectangle.setMap(null);
    }

    // region 객체에서 동서남북 좌표를 추출
    const {offset_south_lat, 
           offset_north_lat, 
           offset_east_lng, 
           offset_west_lng} = region;

    const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(offset_south_lat, offset_west_lng), // 남서 좌표
        new google.maps.LatLng(offset_north_lat, offset_east_lng)  // 북동 좌표
    )

    map.fitBounds(bounds);

    currentRegionRectangle = new google.maps.Rectangle({
        bounds: bounds,
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#FF0000",
        fillOpacity: 0.2,
        map: map,
    });

    // Rectangle 클릭 이벤트 추가
    currentRegionRectangle.addListener("click", (event) => {
        console.log('bounds click');
        google.maps.event.trigger(map, "click", {
            latLng: event.latLng
        });
    });
}

