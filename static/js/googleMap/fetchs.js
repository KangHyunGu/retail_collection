async function apiRequest(url, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`API 요청 실패: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`API 호출 에러: ${error.message}`);
        throw error;
    }
}

// 즐겨찾기 등록 처리
async function createFavorite(payload) {
    try {
        const data = await apiRequest('/api/places/create_favorite', 'POST', payload);
        const favorite = data.data;
        alert(`${favorite.title}이(가) 즐겨찾기에 추가되었습니다!`);
        favorites.unshift(favorite);
        updateFavoriteList(); // 목록 업데이트
    } catch (error) {
        alert('즐겨찾기 저장 중 오류가 발생했습니다.');
    }
}

// 즐겨찾기 삭제 처리
async function deleteFavorite(favorite) {
    try {
        const data = await apiRequest(`/api/places/delete_favorite/${favorite.id}`, 'DELETE');
        if (data.success) {
            const index = favorites.findIndex((item) => item.id === favorite.id);
            if (index !== -1) {
                if (favorite.marker) {
                    favorite.marker.setMap(null);
                }
                favorites.splice(index, 1);
            }
            alert(`해당 즐겨찾기(${favorite.title})가 삭제되었습니다.`);
            updateFavoriteList();
        }
    } catch (error) {
        alert(`즐겨찾기 삭제 처리 도중 에러가 발생했습니다: ${error.message}`);
    }
}

// 검색 결과 데이터 수집 처리
async function createPlaceCollections(payload) {
    try {
        const data = await apiRequest('/api/places/create_place_collections', 'POST', payload);
        if(data.success){
            alert('데이터 수집 처리가 완료되었습니다.');
            const $regionSelect = $("#regionSelect");
            $regionSelect.trigger("change"); // 이벤트 트리거
             // 수집 여부 추가
             const resultsWithCollectedFlag = cachedResults.map(place => ({
                ...place,
                is_collected: true,
            }));
            renderResults(resultsWithCollectedFlag);
        }
    } catch (error) {
        alert('데이터 수집 중 오류가 발생했습니다.');
    }
}

// place Log VC용
async function fetchPlaceLogs(areaName = 1) {
    try {
        const data = await apiRequest(`/api/places/getPlaceLogs/${areaName}`, 'GET');

        const placeLogs = data.placeLogs;
        places_vc_logs.forEach(log_marker => {
            log_marker.setMap(null);
        });

        places_vc_logs = [];

        placeLogs.forEach((log) => {
            const markerOptions = {
                position: { lat: log.geometry_lat, lng: log.geometry_lng },
                map,
                title: log.place_name,
                icon: vcCheckIcon,
                distance: log.distance.toFixed(2),
            };

            const marker = createMarker(markerOptions);

            // InfoWindow에 표시할 내용
            const infoWindowContent = `
                <h3>${log.place_name}</h3>
                <p>거리: ${log.distance.toFixed(2)} m</p>
                <p>시간: ${formatTimestampCustom(log.time_stamp)}</p>
            `;
            const infoWindow = new google.maps.InfoWindow({ content: infoWindowContent });

            // 마커 클릭 시 InfoWindow 표시
            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });

            places_vc_logs.push(marker);
        });
    } catch (error) {
        console.error('장소 로그 가져오기 실패:', error.message);
    }
}

async function fetchRegions() {
    try {
        const data = await apiRequest(`/api/places/getRegions`, 'GET')
        return data;
    } catch (error) {
        console.error('지역 데이터 가져오는 중 오류 발생 : ', error)
        throw error;
    }
}

// 수집 된 지도 목록
async function fetchCollectionPlaces(
    type = "all",
    page = 1,
    limit = 50,
    city_id = 0
) {

    const $active = $("#filter-buttons").find(".filter-btn.active");
    if($active.length){
        $active.removeClass('active');
    }

    const currentPosition = currentMapMarker.getPosition()
    const current_lat = currentPosition.lat();
    const current_lng = currentPosition.lng();
    const radius = (circle.radius / 1000.0);

     let API_URL = '{1}'
     API_URL += `current_lat=${current_lat}`;
     API_URL += `&current_lng=${current_lng}`;
     API_URL += `&radius=${radius}`;
     API_URL += `&page=${page}`;
     API_URL += `&limit=${limit}`;
     API_URL += `&city_id=${city_id}`;
    try {
        //TODO: 첫 페이지 요청 시, 총 데이터 개수 확인
        // if(page == 1 && placesGetTotalCount == 0){
        //     API_URL = API_URL.replaceAll('{1}', '/api/places/getTotalCount?');
        //     const countData = await apiRequest(API_URL, 'GET');
        //     if(countData.success){
        //         placesGetTotalCount = countData.total;
        //     }
        // }

        //TODO:
        //console.log(`총 데이터 개수: ${placesGetTotalCount}, 검색 필터: ${type}, 페이지: ${page}`);

        //let apiUrl = `/api/places/getPlaces?places_region_id=${places_region_id}&page=${page}&limit=${limit}`
        API_URL = API_URL.replaceAll('{1}', '/api/places/getPlaces?');
        if(type != "all"){
            API_URL += `&type=${type}`;
        }

        // 데이터 가져오기
      
        const data = await apiRequest(API_URL, 'GET');
        if (data.success) {
            // 새로운 데이터를 기존 데이터에 추가
            collectionPlaces = data.places;
            filteredPlacesCache = [];
            // 데이터 목록 업데이트
            updatePlacesListEvent(type, page);

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

            $("#search-current-region-btn").attr('disabled', true);

            //updatePagination(type, page);
            

            // TODO: 히트맵 데이터 처리
            // const heatmapData = []
            // console.log('collectionPlaces : ', collectionPlaces);
            // for(const place of collectionPlaces){
            //     heatmapData.push(new google.maps.LatLng(place.geometry_lat, place.geometry_lng));
            // }
        
            // const heatmap = new google.maps.visualization.HeatmapLayer({
            //     data: heatmapData,
            //     dissipating: true,  // true: 줌 레벨에 따라 점이 퍼짐
            //     radius: 20,         // 점 반경
            //     map: map,
            //   });
        
            //   console.log(heatmap);
        }
    } catch (error) {
        console.error(error);
        alert('장소 데이터 가져오는 중 오류가 발생했습니다.');
    }
}

// 즐겨찾기 목록 가져오기
async function fetchFavorites(page = 1, limit = 10) {
    try {
        const data = await apiRequest(`/api/places/favorite_list?page=${page}&limit=${limit}`, 'GET');
        favorites = data; // 목록 업데이트
        updateFavoriteList();
    } catch (error) {
        alert('즐겨찾기 데이터 가져오는 중 오류가 발생했습니다.');
    }
}

// 이미 수집된 데이터 확인 API
async function checkCollectedPlaces(placeIds) {
    try {
        const data = await apiRequest(`/api/places/check_collected`, 'POST', {place_ids : placeIds});
        if(data.success) {
            return data.collected.map((place) => place.place_id);
        }
    } catch(error) {
        console.error('수집된 데이터 확인 중 오류 발생 : ', error.message);
        return [];
    }
}

// City 데이터
async function fetchLoadCityData(north, south, east, west, center_lat, center_lng, zoom){
    try{
        const data = await apiRequest(`/api/places/getCity?offset_north_lat=${north}&offset_south_lat=${south}&offset_east_lng=${east}&offset_west_lng=${west}&center_lat=${center_lat}&center_lng=${center_lng}&zoom=${zoom}`, 'GET');
        if(data.success){
            return data.citys;
        }
    } catch(error){
        console.log('error : ', error);
        console.error('도시 데이터 로드 중 오류 발생 : '. error.message);
    }
    return [];
}

async function fetchLoadPreFecTure(){
    try{
        const data = await apiRequest('/api/places/getPreFecTure', 'GET');
        if(data.success){
            return data.prefectures;
        }
    } catch(error){
        console.error('메인 경계 데이터 로드 중 오류 발생 : ', error.message);
    }
}