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


    $('#radius').on('input', function() {
        if(!currentMapMarker) return;
        const location = currentMapMarker?.position;
        const lat = location.lat();
        const lng = location.lng();
        const radius = Number($(this).val()) || 1;
        createCircle(lat, lng, radius);
    })

  
    $('#searchButton').click(() => {
        const searchType = $("#searchType").val();
        const keyword = $("#keyword").val();
        const radius = parseInt($("#radius").val()) || 500;
        const type = $("#placeType").val();
        const location = currentMapMarker?.position || map.getCenter();

        if (searchType === "text" && keyword) {
            performSearch({ query: keyword, searchType: "text" });
        } else if (searchType === "nearby") {
            performSearch({ radius, location, type, searchType: "nearby" });
        } else {
            alert("Invalid search type or missing parameters.");
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
        processPlacesCreate();
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
            currentMapMarker = null;
        }   

        // circle 제거
        if(circle != null){
            circle.setMap(null);
            circle = null;
        }

        // 결과 marker 제거
        clearMarkers();
    })

    // Select(지역) 변경 시 이벤트 처리
    $('#regionSelect').change(() => {
        // 구역 선택이 바뀔 경우 초기화처리
        collectionPlaces = [];
        placesGetTotalCount = 0;

        const selectedRegionId = $('#regionSelect').val(); // 선택된 지역 ID
        currentRegion = places_region.find((item) => item.id == selectedRegionId);
        
        drawRegionBounds(currentRegion);

        if(currentMapMarker){
            currentMapMarker.setMap(null);
            currentMapMarker = null;
        }

        // 검색 된 리스트 제거
        $('#results').html('');

        // 기존 활성화된 필터 버튼 해제
        $("#filter-buttons .filter-btn").removeClass("active");

        fetchCollectionPlaces(selectedRegionId, "all", 1, 50);
    });

    // 타입(약국,편의점,백화점 그 외..) 버튼 클릭시 이벤트 처리
    $("#filter-buttons").on("click", ".filter-btn", function (event) {
        event.stopPropagation(); // 빈 영역 클릭 이벤트 방지
        const $this = $(this);
        const selectedType = $this.data("type");
        collectionPlaces = [];
        placesGetTotalCount = 0;
        if ($this.hasClass("active")) {
            // 이미 활성화된 버튼을 다시 클릭하면 해제
            $this.removeClass("active");
            currentType = "all";
            fetchCollectionPlaces(currentRegion.id, "all", 1, 50); // 전체 데이터 다시 불러오기
        } else {
            // 다른 버튼이 클릭된 경우
            $(".filter-btn").removeClass("active");
            $this.addClass("active");
            currentType = selectedType;
            fetchCollectionPlaces(currentRegion.id, selectedType, 1, 50);
        }
    });


    $("#vcLogs").change(() => {
        const areaName = $("#vcLogs").val();
        fetchPlaceLogs(areaName);
    })
});

function initsettings() {
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
            //2. 서버에서 API 키를 정상적으로 가져온다면 head URL Google Map 라이브러리 스크립트 cdn 생성
            $.getScript(`https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=places`)
            .done(() => {
                // const geocoder = new google.maps.Geocoder();
                // geocoder.geocode({ address: '일본 효고현 히메지시' }, (results, status) => {
                //     if (status === "OK") {
                //         const bounds = results[0].geometry.bounds;
                //         console.log(bounds);
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

                //          // Rectangle 클릭 이벤트 추가
                //         rectangle.addListener("click", (event) => {
                //             console.log('bounds click');
                //             google.maps.event.trigger(map, "click", {
                //                 latLng: event.latLng
                //             });
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
                // 6. 지역 초기화
                initializeRegionSelect();
                // 7. 수집된 데이타 목록 가져옴
                //fetchCollectionPlaces();
                // 8. 즐겨찾기 목록 가져옴
                fetchFavorites();
                // 9. 임시 테스트용
                fetchPlaceLogs();

                // 창 크기가 변경될 때마다 함수 호출 (반응형 처리) (사이드바)
                $(window).on('resize', adjustSidebarHeight);
            })
            
        }
    })
}

function adjustSidebarHeight() {
    // 거리뷰 버튼과 전체화면 버튼 선택
    const $streetViewControl = $('.gm-svpc');
    const $fullscreenControl = $('.gm-control-active.gm-fullscreen-control');

    console.log('Street View Button:', $streetViewControl);
    console.log('Fullscreen Button:', $fullscreenControl);

    if ($streetViewControl.length && $fullscreenControl.length) {
        // 버튼 위치 계산
        
        const streetViewTop = $streetViewControl.offset().top;
        const fullscreenBottom = $fullscreenControl.offset().top + $fullscreenControl.outerHeight();

        // 창 너비에 따른 반응형 조정
        const windowWidth = $(window).width();
        let sidebarWidth = '300px';
        let rightPosition = '10px';

        if (windowWidth < 768) {
            sidebarWidth = '90%';   // 작은 화면에서는 너비를 90%로 변경
            rightPosition = '5%';    // 오른쪽 여백을 5%로 설정
        }

        // 사이드바 CSS 설정
        $('#right-sidebar').css({
            top: `${fullscreenBottom + 10}px`, // 전체화면 버튼 바로 아래
            bottom: `calc(100% - ${streetViewTop - 10}px)`, // 스트리트뷰 버튼 바로 위
            height: `calc(${streetViewTop - fullscreenBottom - 40}px)`, // 버튼 사이의 높이
            position: 'fixed', // 화면에 고정
            right: rightPosition, // 반응형에 따른 오른쪽 위치
            width: sidebarWidth, // 반응형에 따른 너비
            overflowY: 'auto'
        });
    } else {
        // 사이드바 초기 CSS
        $('#right-sidebar').css({
            top: '60px',
            bottom: '200px',
            height: 'auto'
        })
    }
}

