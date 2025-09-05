import { exhibitionsData } from './exhibitions-data.js';

let map = null;
let selectedDate = null;
let selectedVenue = null;

function getTodayGMT8() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const gmt8 = new Date(utc + (3600000 * 8));
    return new Date(Date.UTC(gmt8.getUTCFullYear(), gmt8.getUTCMonth(), gmt8.getUTCDate()));
}

export function expandMap() {
    const mapContainer = document.getElementById('map-container');
    mapContainer.classList.remove('map-collapsed');
    mapContainer.classList.add('map-expanded');
    if (map) {
        map.invalidateSize();
    }
}

export function collapseMap() {
    const mapContainer = document.getElementById('map-container');
    mapContainer.classList.remove('map-expanded');
    mapContainer.classList.add('map-collapsed');
    if (map) {
        map.invalidateSize();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const listContainer = document.getElementById('exhibitions-list');
    const showPastExhibitionsCheckbox = document.getElementById('show-past-exhibitions');
    const sortBySelect = document.getElementById('sort-by');
    const activeFiltersContainer = document.getElementById('active-filters-container');
    const exhibitionModal = document.getElementById('exhibition-modal');
    const modalContentInner = document.getElementById('modal-content-inner');
    const closeButton = document.querySelector('.close-button');
    const mapContainer = document.getElementById('map-container');
    let markers = [];
    const defaultIcon = new L.Icon({
        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    const pastIcon = new L.Icon({
        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    const fuseOptions = {
        keys: ['title_ru', 'title_en', 'city', 'industry', 'description', 'venue_ru', 'venue_en'],
        threshold: 0.3
    };
    map = L.map('map-container').setView([35.8617, 104.1954], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    window.addEventListener('dateSelected', (event) => {
        selectedDate = event.detail;
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        selectedVenue = null;
        updateDisplay();
    });

    function renderExhibitions(exhibitions) {
        listContainer.innerHTML = '';
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        if (exhibitions.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-gray-500 mt-10">По вашему запросу ничего не найдено.</p>';
            return;
        }
        const today = getTodayGMT8();
        exhibitions.sort((a, b) => {
            const sortBy = sortBySelect.value;
            const dateAparts = a.duration.split('—')[1].trim().split('.');
            const dateBparts = b.duration.split('—')[1].trim().split('.');
            const dateA = new Date(Date.UTC(dateAparts[2], dateAparts[1] - 1, dateAparts[0]));
            const dateB = new Date(Date.UTC(dateBparts[2], dateBparts[1] - 1, dateBparts[0]));
            return sortBy === 'date-asc' ? dateA - dateB : dateB - dateA;
        });
        exhibitions.forEach(exhibition => {
            const exhibitionEndDateParts = exhibition.duration.split('—')[1].trim().split('.');
            const exhibitionEndDate = new Date(Date.UTC(exhibitionEndDateParts[2], exhibitionEndDateParts[1] - 1, exhibitionEndDateParts[0]));
            const isPast = exhibitionEndDate < today;
            const icon = isPast ? pastIcon : defaultIcon;
            const marker = L.marker([exhibition.lat, exhibition.lng], { icon: icon, exhibitionData: exhibition }).addTo(map);
            marker.on('click', () => { selectedVenue = exhibition.venue_ru; updateDisplay(); });
            markers.push(marker);
        });
        exhibitions.forEach(exhibition => {
            const exhibitionEndDateParts = exhibition.duration.split('—')[1].trim().split('.');
            const exhibitionEndDate = new Date(Date.UTC(exhibitionEndDateParts[2], exhibitionEndDateParts[1] - 1, exhibitionEndDateParts[0]));
            const isPast = exhibitionEndDate < today;
            const exhibitionCard = document.createElement('div');
            exhibitionCard.className = `bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-shadow duration-300 cursor-pointer ${isPast ? 'opacity-60' : ''}`;
            exhibitionCard.innerHTML = `
                <h2 class="text-lg font-semibold text-gray-800">${exhibition.title_ru}</h2>
                <p class="text-sm text-gray-600 mt-1">${exhibition.city}, ${exhibition.venue_ru}</p>
                <p class="text-xs text-gray-500 mt-2">${exhibition.duration}</p>
            `;
            exhibitionCard.dataset.venue = exhibition.venue_ru;
            listContainer.appendChild(exhibitionCard);
            const marker = markers.find(m => m.options.exhibitionData === exhibition);
            if (marker) {
                exhibitionCard.addEventListener('click', () => {
                    openModal(exhibition);
                });
                exhibitionCard.addEventListener('mouseover', () => {
                    marker._icon.style.filter = 'brightness(1.5)';
                    exhibitionCard.classList.add('highlighted-card');
                });
                exhibitionCard.addEventListener('mouseout', () => {
                    marker._icon.style.filter = '';
                    exhibitionCard.classList.remove('highlighted-card');
                });
                marker.on('mouseover', () => {
                    exhibitionCard.classList.add('highlighted-card');
                });
                marker.on('mouseout', () => {
                    exhibitionCard.classList.remove('highlighted-card');
                });
            }
        });
    }

    function renderActiveFilters() {
        activeFiltersContainer.innerHTML = '';
        if (selectedVenue) {
            createFilterTag('Выставочный центр: ' + selectedVenue, 'venue');
        }
        if (searchInput.value.trim()) {
            createFilterTag('Поиск: ' + searchInput.value.trim(), 'search');
        }
        if (selectedDate) {
            createFilterTag('Дата: ' + selectedDate.toLocaleDateString('ru-RU'), 'date');
        }
    }

    function createFilterTag(text, type) {
        const tag = document.createElement('span');
        tag.className = 'bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center space-x-1 cursor-pointer';
        tag.innerHTML = `
            <span>${text}</span>
            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        `;
        tag.addEventListener('click', () => {
            if (type === 'venue') selectedVenue = null;
            if (type === 'search') searchInput.value = '';
            if (type === 'date') selectedDate = null;
            updateDisplay();
        });
        activeFiltersContainer.appendChild(tag);
    }

    function openModal(exhibition) {
        modalContentInner.innerHTML = `
            <h2 class="text-2xl font-bold text-gray-800 mb-2">${exhibition.title_ru}</h2>
            <h3 class="text-xl text-gray-600 mb-4">${exhibition.city}, ${exhibition.venue_ru}</h3>
            <p class="text-gray-500 mb-4">${exhibition.duration}</p>
            <p class="text-gray-700 mb-4">${exhibition.description}</p>
            <p class="text-gray-600 font-medium">Отрасль: ${exhibition.industry}</p>
        `;
        exhibitionModal.style.display = 'flex';
    }

    function closeModal() {
        exhibitionModal.style.display = 'none';
    }

    closeButton.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === exhibitionModal) {
            closeModal();
        }
    });

    function debounce(func, timeout = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => { func.apply(this, args); }, timeout);
        };
    }

    function updateDisplay() {
        let exhibitionsToDisplay = [...exhibitionsData];
        const today = getTodayGMT8();
        const bounds = map.getBounds();
        if (selectedDate) {
            const selectedDateUTC = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate()));
            exhibitionsToDisplay = exhibitionsToDisplay.filter(exhibition => {
                const dates = exhibition.duration.split('—').map(d => d.trim().split('.'));
                const startDateParts = dates[0];
                const endDateParts = dates[1];
                const startDate = new Date(Date.UTC(startDateParts[2], startDateParts[1] - 1, startDateParts[0]));
                const endDate = new Date(Date.UTC(endDateParts[2], endDateParts[1] - 1, endDateParts[0]));
                return selectedDateUTC >= startDate && selectedDateUTC <= endDate;
            });
        }
        if (!selectedDate && !showPastExhibitionsCheckbox.checked) {
            exhibitionsToDisplay = exhibitionsToDisplay.filter(exhibition => {
                const dateParts = exhibition.duration.split('—')[1].trim().split('.');
                const exhibitionEndDate = new Date(Date.UTC(dateParts[2], dateParts[1] - 1, dateParts[0]));
                return exhibitionEndDate >= today;
            });
        }
        exhibitionsToDisplay = exhibitionsToDisplay.filter(exhibition => {
            return bounds.contains([exhibition.lat, exhibition.lng]);
        });
        if (selectedVenue) {
            exhibitionsToDisplay = exhibitionsToDisplay.filter(exhibition => exhibition.venue_ru === selectedVenue);
        }
        const query = searchInput.value.trim();
        if (query) {
            const fuse = new Fuse(exhibitionsToDisplay, fuseOptions);
            const result = fuse.search(query);
            exhibitionsToDisplay = result.map(item => item.item);
        }
        renderExhibitions(exhibitionsToDisplay);
        renderActiveFilters();
    }

    map.on('click', (e) => {
        if (!e.originalEvent || !e.originalEvent.target.classList.contains('leaflet-marker-icon')) {
            selectedVenue = null;
            selectedDate = null;
            window.dispatchEvent(new CustomEvent('dateFilterCleared'));
            updateDisplay();
        }
    });
    map.on('moveend', updateDisplay);
    map.on('zoomend', updateDisplay);
    showPastExhibitionsCheckbox.addEventListener('change', updateDisplay);
    sortBySelect.addEventListener('change', updateDisplay);
    const debouncedUpdateDisplay = debounce(updateDisplay, 300);
    searchInput.addEventListener('input', () => {
        selectedVenue = null;
        selectedDate = null;
        debouncedUpdateDisplay();
    });
    mapContainer.addEventListener('click', () => {
        expandMap();
    });
    updateDisplay();
});