function updatePlacesCollectionList() {
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