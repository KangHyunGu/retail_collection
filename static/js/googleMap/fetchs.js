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
        console.log('수집된 장소:', data.data);
    } catch (error) {
        alert('데이터 수집 중 오류가 발생했습니다.');
    }
}

// place Log VC용
async function fetchPlaceLogs() {
    try {
        const areaName = 3;
        const data = await apiRequest(`/api/places/getPlaceLogs/${areaName}`, 'GET');

        const placeLogs = data.placeLogs;
        placeLogs.forEach((log) => {
            const markerOptions = {
                position: { lat: log.geometry_lat, lng: log.geometry_lng },
                map,
                title: log.place_name,
                icon: vcCheckIcon,
            };

            const marker = createMarker(markerOptions);

            // InfoWindow에 표시할 내용
            const infoWindowContent = `
                <p>거리: ${log.distance.toFixed(2)} m</p>
                <p>시간: ${formatTimestampCustom(log.time_stamp)}</p>
            `;
            const infoWindow = new google.maps.InfoWindow({ content: infoWindowContent });

            // 마커 클릭 시 InfoWindow 표시
            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });
        });
    } catch (error) {
        console.error('장소 로그 가져오기 실패:', error.message);
    }
}

// 수집 된 지도 목록
async function fetchCollectionPlaces(page = 1, limit = 10) {
    try {
        const data = await apiRequest(`/api/places/getPlaces?page=${page}&limit=${limit}`, 'GET');
        if (data.success && data.places.length) {
            collectionPlaces = [...collectionPlaces, ...data.places];
            updatePlacesCollectionList();
        }
    } catch (error) {
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