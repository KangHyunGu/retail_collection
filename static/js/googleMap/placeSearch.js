let currentSearchPage = 1;
let cachedResults = []; // 모든 검색 결과 캐싱
let paginationInstance = null; // pagination 인스턴스 저장
const resultsPerPage = 20; // 한 페이지당 결과 수

function isTypeEnabled () {
    const searchType = $('#searchType').val();
        const isText = searchType == 'text';
        $('#keyword').attr('disabled', !isText);
        $('#radius').attr('disabled', isText);
}

// 검색 결과 렌더링
function renderResults(results){
    $('#results').html(''); // 기존 결과 초기화
    clearMarkers(); // 기존 마커 제거

    if (results.length === 0) {
        alert("검색 결과가 없습니다.");
        return;
    }

    // 수집 미완료된 데이터 맨 위로 정렬
    const sortedResults = sortPlacesByUncollectedStatus(results);

    let allCollected = true; // 모든 항목이 수집 완료인지 확인
    isSearch = true;
    sortedResults.forEach((result, index) => {
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
                plus_code_compound: place.plus_code?.compound_code || '',
                plus_code_global: place.plus_code?.global_code || '',
                geometry_lat: place.geometry.location.lat(),
                geometry_lng: place.geometry.location.lng(),
                attributions_url:
                    place.photos != null && place.photos.length
                        ? place.photos[0].getUrl()
                        : null,
                is_collected : place.is_collected,
            },
        };

        // 수집 완료 상태 확인
        const statusHtml = place.is_collected
        ? `<span class="collected-status">수집완료</span>` // 수집 완료
        : ""; // 수집되지 않은 항목은 아무 표시 없음

        if (!place.is_collected) {
            isSearch = false
            allCollected = false; // 하나라도 수집되지 않은 데이터가 있으면 false
        } else {
            // 수집 된 마커가 있을경우
            markerOptions.icon = collectedIcon;
        }

        const marker = createMarker(markerOptions);
        markers.push(marker);

        // 리스트 항목
        const resultHtml = `
        <div class="result-item" data-index="${index}">
            <strong>${place.name}</strong><br>
            ${place.formatted_address || place.vicinity || "주소 없음"}<br>
            ${statusHtml}
        </div>
        `;

        // 마커 클릭 시 리스트 강조
        marker.addListener('click', () => {
            highlightListItem(index);
        });

        $('#results').append(resultHtml);
        // 리스트 클릭 시 마커 강조
        $(`.result-item[data-index="${index}"]`).on('click', () => {
            map.setCenter(marker.getPosition());
            map.setZoom(22);
            highlightListItem(index);
        });

    });

    // 모든 항목이 수집 완료라면 수집 버튼 비활성화
    $("#dataColButton").prop('disabled', allCollected);

    // 첫 번째 결과 위치로 맵 이동
    const firstResultLocation = results[0].geometry.location;
    map.setCenter(firstResultLocation);
    map.setZoom(15); // 적절한 줌

    createPaginationControls();
};

function sortPlacesByUncollectedStatus(places){
    return places.sort((a, b) => {
        // 수집 미완료된 데이터가 먼저 오도록 정렬
        if(!a.is_collected && b.is_collected) return -1;
        if(a.is_collected && b.is_collected) return 1;
        // 수집 상태가 동일하면 순서 유지
        return 0;
    })
};

 // 리스트 목록 강조
function highlightListItem(index){
    $('#results .result-item').removeClass('highlighted');
    $(`#results .result-item[data-index=${index}]`).addClass('highlighted');
}

// 페이지네이션 컨트롤 생성/업데이트
function createPaginationControls(){
    let $paginationControls = $('#pagination-controls');

    if (!$paginationControls.length) {
        $paginationControls = $(`
            <div id="pagination-controls" style="text-align: center; margin-top: 10px;">
                <button id="prev-page" disabled>이전</button>
                <button id="next-page" disabled>다음</button>
            </div>
        `);
        $('#results').append($paginationControls); // 결과 아래에 추가
    }

    const $prevButton = $paginationControls.find('#prev-page');
    const $nextButton = $paginationControls.find('#next-page');

    // 이전 버튼
    $prevButton.off('click').on('click', () => {
        if (currentSearchPage > 1) {
            currentSearchPage--;
            const startIndex = (currentSearchPage - 1) * resultsPerPage;
            const endIndex = Math.min(startIndex + resultsPerPage, cachedResults.length);
            renderResults(cachedResults.slice(startIndex, endIndex));
        }
    });

    // 다음 버튼
    $nextButton.off('click').on('click', () => {
        if (currentSearchPage < Math.ceil(cachedResults.length / resultsPerPage)) {
            currentSearchPage++;
            const startIndex = (currentSearchPage - 1) * resultsPerPage;
            const endIndex = Math.min(startIndex + resultsPerPage, cachedResults.length);
            renderResults(cachedResults.slice(startIndex, endIndex));
        } else if (paginationInstance && paginationInstance.hasNextPage) {
            paginationInstance.nextPage(); // API로 추가 페이지 요청
        }
    });

    updatePaginationButtons();
};

// 페이지네이션 버튼 업데이트
function updatePaginationButtons(){
    const $prevButton = $('#prev-page');
    const $nextButton = $('#next-page');

    $prevButton.prop('disabled', currentSearchPage === 1);
    $nextButton.prop(
        'disabled',
        currentSearchPage >= Math.ceil(cachedResults.length / resultsPerPage) && !(paginationInstance?.hasNextPage)
    );
};

function performSearch({ searchType = "text", query = "", radius = 500, location = map.getCenter(), type = "" }) {
    currentSearchPage = 1;
    cachedResults = []; // 모든 검색 결과 캐싱
    paginationInstance = null; // pagination 인스턴스 저장

    const service = new google.maps.places.PlacesService(map);
    // Google Places API 콜백 처리
    const processResults = async (results, status, pagination) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            const placeIds = results.map(place => place.place_id);
            const collectedPlaceIds = await checkCollectedPlaces(placeIds);
    
             // 수집 여부 추가
            const resultsWithCollectedFlag = results.map(place => ({
                ...place,
                is_collected: collectedPlaceIds.includes(place.place_id),
            }));

            cachedResults = [...cachedResults, ...resultsWithCollectedFlag]; // 결과 캐싱
            paginationInstance = pagination; // pagination 인스턴스 저장

            const startIndex = (currentSearchPage - 1) * resultsPerPage;
            const endIndex = Math.min(startIndex + resultsPerPage, cachedResults.length);

            renderResults(cachedResults.slice(startIndex, endIndex)); // 현재 페이지 결과 렌더링
            createPaginationControls();
        } else {
            alert(`검색 실패: ${status}`);
        }
    };
    // 검색 유형에 따라 API 호출
    if (searchType === "text") {
        service.textSearch({ query }, processResults);
    } else if (searchType === "nearby") {
        service.nearbySearch({ location, radius, type }, processResults);
    }
}