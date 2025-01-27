function isTypeEnabled () {
    const searchType = $('#searchType').val();
        const isText = searchType == 'text';
        $('#keyword').attr('disabled', !isText);
        $('#radius').attr('disabled', isText);
}

function performSearch({ searchType = "text", query = "", radius = 500, location = map.getCenter(), type = "" }) {
    const service = new google.maps.places.PlacesService(map);
    const resultsPerPage = 20; // 한 페이지당 결과 수
    let currentPage = 1;
    let cachedResults = []; // 모든 검색 결과 캐싱
    let paginationInstance = null; // pagination 인스턴스 저장

    // 검색 결과 렌더링
    const renderResults = (results) => {
        $('#results').html(''); // 기존 결과 초기화
        clearMarkers(); // 기존 마커 제거

        if (results.length === 0) {
            alert("검색 결과가 없습니다.");
            return;
        }

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
                <div class="result-item">
                    <strong>${place.name}</strong><br>
                    ${place.formatted_address || "주소 없음"}
                </div>
            `;
            $('#results').append(resultHtml);
        });

        // 첫 번째 결과 위치로 맵 이동
        const firstResultLocation = results[0].geometry.location;
        map.setCenter(firstResultLocation);
        map.setZoom(15); // 적절한 줌

        createPaginationControls();
    };

    // 페이지네이션 컨트롤 생성/업데이트
    const createPaginationControls = () => {
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
            if (currentPage > 1) {
                currentPage--;
                const startIndex = (currentPage - 1) * resultsPerPage;
                const endIndex = Math.min(startIndex + resultsPerPage, cachedResults.length);
                renderResults(cachedResults.slice(startIndex, endIndex));
            }
        });

        // 다음 버튼
        $nextButton.off('click').on('click', () => {
            if (currentPage < Math.ceil(cachedResults.length / resultsPerPage)) {
                currentPage++;
                const startIndex = (currentPage - 1) * resultsPerPage;
                const endIndex = Math.min(startIndex + resultsPerPage, cachedResults.length);
                renderResults(cachedResults.slice(startIndex, endIndex));
            } else if (paginationInstance && paginationInstance.hasNextPage) {
                paginationInstance.nextPage(); // API로 추가 페이지 요청
            }
        });

        updatePaginationButtons();
    };

    // 페이지네이션 버튼 업데이트
    const updatePaginationButtons = () => {
        const $prevButton = $('#prev-page');
        const $nextButton = $('#next-page');

        $prevButton.prop('disabled', currentPage === 1);
        $nextButton.prop(
            'disabled',
            currentPage >= Math.ceil(cachedResults.length / resultsPerPage) && !(paginationInstance?.hasNextPage)
        );
    };

    // Google Places API 콜백 처리
    const processResults = (results, status, pagination) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            cachedResults = [...cachedResults, ...results]; // 결과 캐싱
            paginationInstance = pagination; // pagination 인스턴스 저장

            const startIndex = (currentPage - 1) * resultsPerPage;
            const endIndex = Math.min(startIndex + resultsPerPage, cachedResults.length);

            renderResults(cachedResults.slice(startIndex, endIndex)); // 현재 페이지 결과 렌더링
            createPaginationControls();
            if(cachedResults.length){
                isSearch = true;
                $("#dataColButton").prop('disabled', false);
            }
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