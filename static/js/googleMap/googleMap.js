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


