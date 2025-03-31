function updateFavoriteList() {
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
            map.setZoom(18);
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

// 즐겨찾기 팝업 등록 open
function showFavoritePopup(position) {
     
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

// 즐겨찾기 팝업 등록 close
const closeFavoritePopup = () => {
    $('#favorite-popup').hide();
};