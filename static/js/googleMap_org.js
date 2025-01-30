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


$(document).ready(() => {
    let isSidebarVisible = true;
    initsettings()
    
    $('#toggle-button').click(function () {
        if (isSidebarVisible) {
            // 사이드바 숨기기
            $('#right-sidebar').css('transform', 'translateX(100%)');
            $(this).css('right', '0px'); // 화살표 버튼 위치 조정
            $(this).find('span').html('&#x25B6;'); // 오른쪽 화살표로 변경
        } else {
            // 사이드바 보이기
            $('#right-sidebar').css('transform', 'translateX(0)');
            $(this).css('right', '300px'); // 화살표 버튼 위치 조정
            $(this).find('span').html('&#x25C0;'); // 왼쪽 화살표로 변경
        }
        isSidebarVisible = !isSidebarVisible;
    });

  
    $('#searchButton').click(() => {
         // 검색 버튼은 키워드가 text 일때만 허용
        const keyword = $('#keyword').val();
        const radius = Number($('#radius').val());
        const searchType = $('#searchType').val();

        if (!radius) return alert('Please enter a valid radius.');
       
       if(searchType === 'text') {
            keyword ? performTextSearch(keyword) : alert('Please enter a keyword for text search.')
        } else {
            if(currentMapMarker == null){
                alert('검색 할 위치가 선택되지 않았습니다.');
                return;
            }

            const radius = parseInt($('#radius').val()) || 500;
            const placeType = $('#placeType').val();
            const latLng = currentMapMarker.position
            performNearbySearch('', radius, latLng, placeType);
        }
            
    });

    $('#goto').click(() => {
        $('#overlay, #popup').show();
    });

    $('#popup-cancel').click(() => {
        $('#overlay, #popup').hide();
    });

    $('#popup-confirm').click(() => {

        const lat = parseFloat($('#popup-lat').val());
        const lng = parseFloat($('#popup-lng').val());

        if (!isNaN(lat) && !isNaN(lng)) {
            const location = { lat, lng };
            map.setCenter(location);
            map.setZoom(20);

            new google.maps.Marker({
                position: location,
                map,
                icon: currentMapMarkerIcon,
                title: 'Marker at Custom Location',
            });

            alert(`지도 위치가 (${lat}, ${lng})로 이동했습니다.`);
            $('#overlay, #popup').hide();
            $('#popup-lat').val('');
            $('#popup-lng').val('');
        } else {
            alert('올바른 위도와 경도를 입력하세요.');
        }
    });

    $('#searchType').change((event) => {
        isTypeEnabled();
        
        if(currentMapMarker != null){
            currentMapMarker.setMap(null);
        }   
       
        if(circle != null){
            circle.setMap(null);
        }
    })

    $("#dataColButton").click(() => {
        const customDatas = [];
        for(const marker of markers){
            customDatas.push(marker.customData);
        }
        createPlaceCollections(customDatas);
    })

    $('#clear').click(() => {
        // 수집버튼 비활성화
        isSearch = false;
        $("#dataColButton").attr('disabled', true);

        // 검색 된 리스트 제거
        $('#results').html('');

        // 선택 된 마커 제거
        if(currentMapMarker != null){
            currentMapMarker.setMap(null);
        }   

        // circle 제거
        if(circle != null){
            circle.setMap(null);
        }

        // 결과 marker 제거
        clearMarkers();
    })
});

const initsettings = () => {
    // 1.서버에서 API 키를 가져와 Google Maps 초기화
    fetch('/api/config', {
        method : 'GET',
    })
    .then((response) => {
        if(!response.ok){
            throw new Error('설정 초기화 중 에러 발생')
        }
        return response.json()
    })
    .then((data) => {
        if(data.success){
            // 2. 서버에서 API 키를 정상적으로 가져온다면 head URL Google Map 라이브러리 스크립트 cdn 생성
            $.getScript(`https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=places`)
            .done(() => {


                //const geocoder = new google.maps.Geocoder();
                // geocoder.geocode({ address: '가미노다' }, (results, status) => {
                //     if (status === "OK") {
                //         const bounds = results[0].geometry.bounds;
                //         map.fitBounds(bounds);
                //         console.log(results[0]);
                //         console.log(results[0].geometry.location.lat(),' ', results[0].geometry.location.lng());
                //     // Bounds를 시각적으로 표시
                //         const rectangle = new google.maps.Rectangle({
                //             bounds: bounds,
                //             strokeColor: "#FF0000",
                //             strokeOpacity: 0.8,
                //             strokeWeight: 2,
                //             fillColor: "#FF0000",
                //             fillOpacity: 0.2,
                //             map: map,
                //         });

                //     } else {
                //         console.error("Geocoding 실패:", status);
                //     }
                // });
                
                // 3. 지도 초기화
                initMap(); 
                // 4.사이드 조정
                adjustSidebarHeight();
                // 5. 검색바 조정
                isTypeEnabled();
                // 6. 수집된 데이타 목록 가져옴
                fetchCollectionPlaces();
                // 7. 즐겨찾기 목록 가져옴
                fetchFavorites();
                // 8. 임시 테스트용
                fetchPlaceLogs();
            })
            .fail(() => {
                console.error('Google Maps API 로드 실패');
                alert('Google Maps API 로드 중 오류가 발생했습니다.');
            });
        }
    })
}

const fetchPlaceLogs = async () => {
    const area_name = 3;
    const response = await fetch(`/api/places/getPlaceLogs/${area_name}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if(!response.ok){return}

    const data = await response.json();
   
    const placeLogs = data.placeLogs;
    for(const log of placeLogs){
        const lat = log.geometry_lat;
        const lng = log.geometry_lng;
        const markerOptions = {
            position: {lat,lng},
            map,
            title: log.place_name,
            icon: vcCheckIcon,
        }

        const marker = createMarker(markerOptions)
         // InfoWindow에 표시할 내용
            const infoWindowContent = `
                <p>거리: ${log.distance.toFixed(2)} m</p>
                <p>시간: ${formatTimestampCustom(log.time_stamp)}</p>
        `;

        const infoWindow = new google.maps.InfoWindow({
            content: infoWindowContent,
        });

            // 마커 클릭 시 말풍선 표시
        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });
    }
}

const adjustSidebarHeight = () => {
    // 스트리트뷰 버튼 DOM 요소 선택
    const $streetViewControl = $('.gmnoprint.gm-bundled-control');

    if ($streetViewControl.length) {
        // 스트리트뷰 버튼의 상단 위치 계산
        const streetViewTop = $streetViewControl.offset().top;

        // 사이드바 CSS 설정
        $('#right-sidebar').css({
            top: '50px', // 상단 전체 맞춤
            bottom: `calc(100% - ${streetViewTop - 10}px)`, // 스트리트뷰 버튼 바로 위
            height: 'auto', // 높이는 자동으로 조정
            position: 'absolute',
            right: '10px', // 오른쪽 위치
            width: '300px' // 사이드바 너비
        });
    }

    // 창 크기가 변경될 때 높이 재조정
    $(window).resize(adjustSidebarHeight);

    // 구글 맵이 로드되었을 때 높이 조정 (비동기 로딩 고려)
    setTimeout(adjustSidebarHeight, 500); // 구글맵 로딩 완료 후 실행

 }

const isTypeEnabled = () => {
    const searchType = $('#searchType').val();
        const isText = searchType == 'text';
        $('#keyword').attr('disabled', !isText);
        $('#radius').attr('disabled', isText);
}

const initMap = () => {

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

const fetchCollectionPlaces = async (page = 1, limit = 10) => {
    fetch(`/api/places/getPlaces?page=${page}&limit=${limit}`, {
        method : 'GET',
        headers : {
            'Content-Type' : 'application/json'
        }
    })
    .then ((response) => {
        if(!response.ok){
            throw new Error('장소 데이터 가져오는 중 오류가 발생했습니다.')
        }
        return response.json()
    })
    .then((data) => {
        if(data.success && data.places.length){
            console.log('data : ', data);
            const places = data.places;
            for(const place of places){
                collectionPlaces.push(place);
            }
            updatePlacesCollectionList()
        }
    })
}

const fetchFavorites = async (page = 1, limit = 10) => {
    fetch(`/api/places/favorite_list?page=${page}&limit=${limit}`, {
        method : 'GET',
        headers : {
            'Content-Type' : 'application/json'
        },
    })
    .then((response) => {
        if(!response.ok){
            throw new Error('즐겨찾기 데이터 가져오는 중 오류가 발생했습니다.');
        }
        return response.json()
    })
    .then((data) => {
        for(favorite of data){
            favorites.push(favorite)
        }
        updateFavoriteList()
    })
    .catch((error) => {
        console.error(error);
    })
}

const showFavoritePopup = (position) => {
   
    $('#favorite-popup').show();

     // 위도와 경도를 입력 필드에 자동으로 채우기
    $('#favorite-lat').val(position.lat());
    $('#favorite-lng').val(position.lng());


    $('#save-favorite').off('click').on('click', () => {
        const title = $('#favorite-title').val();
        const content = $('#favorite-content').val();
        
        if (!title || !content) {
            alert('제목과 내용을 입력하세요.');
            return;
        }

        // 즐겨찾기 DB 데이터 처리
        const payload = {
            title,
            content,
            geometry_lat: position.lat(),
            geometry_lng: position.lng()
        }

        createFavorite(payload)

        // 즐겨찾기 추가
        // const favorite = { title, content, lat, lng };
        // favorites.push(favorite);
        
        $('#favorite-popup').hide();
       
    });

    // 취소 버튼 클릭시 이벤트
    $('#cancel-favorite').off('click').on('click', () => {
        closeFavoritePopup()
    });
}

// 팝업 닫기
const closeFavoritePopup = () => {
    $('#favorite-popup').hide();
};

const updatePlacesCollectionList = () => {
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
        const type = types[collectionPlaces[idx].type].title || "기타";
        const lat = collectionPlaces[idx].geometry_lat;
        const lng = collectionPlaces[idx].geometry_lng;

        const listItem = $(`
            <li>
               <span><strong>${place_name}</strong><br>${formatted_address}</span>
               
                <span style="display: flex; align-items: center;">
                        <span class="type-label">${type}</span>
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

// 즐겨찾기 등록 처리
const createFavorite = (payload) => {
    fetch('/api/places/create_favorite',  {
        method: 'POST',
        headers: {'Content-Type' : 'application/json'},
        body: JSON.stringify(payload)
    })
    .then((response) => {
        if(!response.ok){ 
            throw new Error('즐겨찾기 저장 실패');
        }
        return response.json()
       
    })
    .then((data) => {
        const favorite = data.data;
        alert(`${favorite.title}이(가) 즐겨찾기에 추가되었습니다!`);
        favorites.unshift(favorite);
        updateFavoriteList(); // 목록 업데이트
    })
    .catch((error) => {
        console.error(error);
        alert('즐겨찾기 저장 중 오류가 발생했습니다.');
    })
};

// 즐겨찾기 삭제 처리
const deleteFavorite = (favorite) => {
    fetch(`/api/places/delete_favorite/${favorite.id}`,  {
        method : 'DELETE',
    })
    .then((response) => {
        if(!response.ok) {
            throw new Error('즐겨찾기 삭제 실패');
        }
        return response.json()
    })
    .then((data) => {
         // 삭제 성공 시 배열 및 목록 업데이트
        if(data.success){
            const findIndex = favorites.findIndex((item) => item.id == favorite.id)
            if(findIndex != -1){
                if(favorite.marker){
                    //해당 마커 삭제
                    favorite.marker.setMap(null);
                }
                favorites.splice(findIndex, 1);
            }
            alert(`해당 즐겨찾기(${favorite.title})가 삭제되었습니다.`);
            updateFavoriteList();
        }
    }) 
    .catch((error) => {
        alert(`즐겨찾기 삭제 처리 도중 에러가 발생했습니다 ${error}`);
    })
}

// 즐겨찾기 목록 업데이트 함수
const updateFavoriteList = () => {
    const list = $('#favorite-items');
    list.empty();

    favorites.forEach((favorite, index) => {
        const item = $(`
           <li class="favorite-item">
                <div>
                    <span class="favorite-item-title">${favorite.title}</span>
                    <p class="favorite-item-content">${favorite.content}</p>
                </div>
                <span class="delete-icon" data-id="${favorite.id || 0}">✖</span>
            </li>
        `);

        const lat = favorite.geometry_lat;
        const lng = favorite.geometry_lng;

        const markerOptions = {
            position: {lat, lng},
            map,
            title: favorite.title,
            id: favorite.id,
            content: favorite.content,
            geometry_lat: lat,
            geometry_lng: lng,
            icon: favoriteIcon
        }

        const marker = createMarker(markerOptions)
        favorite["marker"] = marker;

        // 즐겨찾기 항목 클릭 시 해당 위치로 이동
        item.click(() => {
            map.setCenter({ lat, lng });
            map.setZoom(20);
        });

        
        item.find('.delete-icon').click((event) => {
            event.stopPropagation();
            if(confirm(`해당 즐겨찾기(${favorite.title})을 삭제하시겠습니까?`)){
                deleteFavorite(favorite);
            }
        })

        list.append(item);

    });
};

const createMarker = (markerOptions) => {
    const marker = new google.maps.Marker(markerOptions);

    marker.addListener('rightclick', (event) => {
        // 마우스 오른쪽 클릭 이벤트
        showContextMenu(event, marker);
    })

    return marker;
}

const createCircle = (lat, lng, radius) => {
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
    })

}

const clearMarkers = () => {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
};

const showContextMenu = (event, marker) => {
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

const closeContextMenu = () => {
    document.getElementById('context-menu').style.display = 'none';
}

const performTextSearch = (query) => {
    const service = new google.maps.places.PlacesService(map);
    service.textSearch({ query, fields: ['next_page_token'] }, (results, status, pagination) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            clearMarkers();
            $('#results').html('');

            if(results.length) {
                isSearch = true;
                $("#searchButton").attr('disabled', false);
            }

            results.forEach((result) => {
                const markerOptions = {
                    position: result.geometry.location,
                    map,
                    title: result.name,

                }
                
                const marker = createMarker(markerOptions)
                markers.push(marker);
                $('#results').append(`<div><strong>${result.name}</strong><br>${result.formatted_address}</div>`);
            });
    
            map.setCenter(results[0].geometry.location);
        } else {
            alert(`Text search failed: ${status}`);
        }
    });
};

const performNearbySearch = (keyword, radius, location = map.getCenter(), type = '') => {
    const service = new google.maps.places.PlacesService(map);

    // 페이지네이션 관련 변수
    const resultsPerPage = 20; // 한 페이지당 결과 수
    let currentPage = 1;       // 현재 페이지
    let cachedResults = [];    // 모든 검색 결과를 저장할 배열

    const renderResults = (results) => {
        // 결과 초기화 (페이징 컨트롤 제외)
        $('#results').html('');
        clearMarkers();
        // 결과 렌더링
        results.forEach((result) => {
            const place = result;
            const markerOptions = {
                position: place.geometry.location,
                map,
                title: place.name,
                customData: {
                    place_name: place.name,
                    place_id: place.place_id,
                    business_status: place.business_status,
                    formatted_address: place.formatted_address || place.vicinity,
                    icon_url: place.icon,
                    icon_background_color: place.icon_background_color,
                    plus_code_compound: place.plus_code?.compound_code,
                    plus_code_global: place.plus_code?.global_code,
                    geometry_lat: place.geometry.location.lat(),
                    geometry_lng: place.geometry.location.lng(),
                    attributions_url:
                        place.photos != null && place.photos.length
                            ? place.photos[0].getUrl()
                            : null,
                },
            };
            const marker = createMarker(markerOptions);
            markers.push(marker);

            const resultHtml = `
                <div>
                    <strong>${place.name}</strong><br>
                    ${place.formatted_address || place.vicinity}
                </div>`;
            $('#results').append(resultHtml);
        });

        // 페이징 컨트롤 업데이트
        createPaginationControls();
    };

    const createPaginationControls = () => {
        let $paginationControls = $('#pagination-controls');

        // 컨트롤 초기화
        if (!$paginationControls.length) {
            $paginationControls = $(`
                <div id="pagination-controls" style="text-align: center; margin-top: 10px;">
                    <button id="prev-page" disabled>이전</button>
                    <button id="next-page" disabled>다음</button>
                </div>
            `);
            $('#results').append($paginationControls);
        }

        const $prevButton = $paginationControls.find('#prev-page');
        const $nextButton = $paginationControls.find('#next-page');

        // "이전" 버튼 클릭 이벤트
        $prevButton.off('click').on('click', () => {
            if (currentPage > 1) {
                currentPage--;
                const startIndex = (currentPage - 1) * resultsPerPage;
                const endIndex = Math.min(startIndex + resultsPerPage, cachedResults.length);
                const pageResults = cachedResults.slice(startIndex, endIndex);
                renderResults(pageResults);
            }
        });

        // "다음" 버튼 클릭 이벤트
        $nextButton.off('click').on('click', () => {
            if (currentPage < Math.ceil(cachedResults.length / resultsPerPage)) {
                currentPage++;
                const startIndex = (currentPage - 1) * resultsPerPage;
                const endIndex = Math.min(startIndex + resultsPerPage, cachedResults.length);
                const pageResults = cachedResults.slice(startIndex, endIndex);
                renderResults(pageResults);
            } else {
                pagination.nextPage();
            }
        });

        updatePaginationButtons();
    };

    const updatePaginationButtons = () => {
        const $prevButton = $('#prev-page');
        const $nextButton = $('#next-page');

        $prevButton.prop('disabled', currentPage === 1);
        $nextButton.prop(
            'disabled',
            currentPage >= Math.ceil(cachedResults.length / resultsPerPage)
        );
    };

    const fetchNextPage = (pagination) => {
        if (pagination.hasNextPage) {
            pagination.nextPage();
        } else {
            // 모든 결과 로드 완료 후 첫 페이지 렌더링
            const startIndex = (currentPage - 1) * resultsPerPage;
            const endIndex = Math.min(startIndex + resultsPerPage, cachedResults.length);
            const pageResults = cachedResults.slice(startIndex, endIndex);

            renderResults(pageResults);
            createPaginationControls();
        }
    };

    // 첫 번째 검색 호출
    service.nearbySearch({ location, radius, type: type || undefined }, (results, status, pagination) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            cachedResults = [...cachedResults, ...results];

            // 첫 번째 페이지 결과 렌더링
            const startIndex = (currentPage - 1) * resultsPerPage;
            const endIndex = Math.min(startIndex + resultsPerPage, cachedResults.length);
            const pageResults = cachedResults.slice(startIndex, endIndex);

            renderResults(pageResults);
            createPaginationControls();

            // 추가 페이지 로드
            fetchNextPage(pagination);

            // 검색 결과가 있을경우 "수집" 버튼 활성화
            if(cachedResults.length){
                isSearch = true;
                $("#dataColButton").prop('disabled', !isSearch)
            }
        } else {
            alert(`Nearby search failed: ${status}`);
        }
    });
};

const createPlaceCollections= (payload) => {
    fetch('/api/places/create_place_collections',  {
        method: 'POST',
        headers: {'Content-Type' : 'application/json'},
        body: JSON.stringify(payload)
    })
    .then((response) => {
        if(!response.ok){ 
            throw new Error('데이터 수집 실패');
        }
        return response.json()
    })
    .then((data) => {
        const places = data.data;
        console.log('places : ', places);
    })
    .catch((error) => {
        console.error(error);
        alert('즐겨찾기 저장 중 오류가 발생했습니다.');
    })
}

const formatTimestampCustom = (timestamp) => {
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