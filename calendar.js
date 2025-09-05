import { exhibitionsData } from './exhibitions-data.js';

function getTodayGMT8() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const gmt8 = new Date(utc + (3600000 * 8));
    return new Date(Date.UTC(gmt8.getUTCFullYear(), gmt8.getUTCMonth(), gmt8.getUTCDate()));
}

let currentViewDate = getTodayGMT8();
let selectedCalendarDate = null;

function renderCalendar() {
    const calendarDaysContainer = document.getElementById('calendar-days');
    const currentMonthYear = document.getElementById('current-month-year');
    const calendarWrapper = document.getElementById('calendar-wrapper');
    const locale = 'ru-RU';

    calendarDaysContainer.innerHTML = '';
    const isCollapsed = calendarWrapper.classList.contains('calendar-collapsed');
    const today = getTodayGMT8();
    const exhibitionsByDate = groupExhibitionsByDate();

    if (isCollapsed) {
        const startOfWeek = new Date(currentViewDate);
        const dayOfWeek = startOfWeek.getDay() === 0 ? 6 : startOfWeek.getDay() - 1;
        startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        const month = currentViewDate.toLocaleString(locale, { month: 'long' });
        currentMonthYear.textContent = `${month.charAt(0).toUpperCase() + month.slice(1)}, ${currentViewDate.getFullYear()}`;
        const tempDate = new Date(startOfWeek);
        while (tempDate <= endOfWeek) {
            const day = tempDate.getUTCDate();
            const isOutsideMonth = tempDate.getUTCMonth() !== currentViewDate.getUTCMonth();
            const isToday = tempDate.getUTCFullYear() === today.getUTCFullYear() && tempDate.getUTCMonth() === today.getUTCMonth() && tempDate.getUTCDate() === today.getUTCDate();
            calendarDaysContainer.appendChild(createDayElement(day, new Date(tempDate), isOutsideMonth, exhibitionsByDate, isToday));
            tempDate.setUTCDate(tempDate.getUTCDate() + 1);
        }
    } else {
        const firstDayOfMonth = new Date(Date.UTC(currentViewDate.getUTCFullYear(), currentViewDate.getUTCMonth(), 1));
        const month = currentViewDate.toLocaleString(locale, { month: 'long' });
        currentMonthYear.textContent = `${month.charAt(0).toUpperCase() + month.slice(1)}, ${currentViewDate.getFullYear()}`;
        const startingDayOfWeek = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
        for (let i = 0; i < startingDayOfWeek; i++) {
            const prevMonthDate = new Date(Date.UTC(currentViewDate.getUTCFullYear(), currentViewDate.getUTCMonth(), 0 - i));
            const day = prevMonthDate.getUTCDate();
            calendarDaysContainer.appendChild(createDayElement(day, prevMonthDate, true, exhibitionsByDate));
        }
        calendarDaysContainer.innerHTML = calendarDaysContainer.innerHTML.split('</div>').reverse().join('</div>');
        const lastDayOfMonth = new Date(Date.UTC(currentViewDate.getUTCFullYear(), currentViewDate.getUTCMonth() + 1, 0));
        const numDays = lastDayOfMonth.getUTCDate();
        for (let i = 1; i <= numDays; i++) {
            const date = new Date(Date.UTC(currentViewDate.getUTCFullYear(), currentViewDate.getUTCMonth(), i));
            const isToday = date.getUTCFullYear() === today.getUTCFullYear() && date.getUTCMonth() === today.getUTCMonth() && date.getUTCDate() === today.getUTCDate();
            calendarDaysContainer.appendChild(createDayElement(i, date, false, exhibitionsByDate, isToday));
        }
        const totalCells = startingDayOfWeek + numDays;
        const remainingCells = 35 - totalCells;
        for (let i = 1; i <= remainingCells; i++) {
            const nextMonthDate = new Date(Date.UTC(currentViewDate.getUTCFullYear(), currentViewDate.getUTCMonth() + 1, i));
            const day = nextMonthDate.getUTCDate();
            calendarDaysContainer.appendChild(createDayElement(day, nextMonthDate, true, exhibitionsByDate));
        }
    }
}

function groupExhibitionsByDate() {
    const grouped = {};
    exhibitionsData.forEach(exhibition => {
        const [startDay, startMonth, startYear] = exhibition.duration.split('—')[0].split('.').map(Number);
        const [endDay, endMonth, endYear] = exhibition.duration.split('—')[1].trim().split('.').map(Number);
        const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));
        const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay));
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateKey = `${currentDate.getUTCFullYear()}-${String(currentDate.getUTCMonth() + 1).padStart(2, '0')}-${String(currentDate.getUTCDate()).padStart(2, '0')}`;
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(exhibition);
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
    });
    return grouped;
}

function createDayElement(day, date, isOutsideMonth, exhibitionsByDate, isToday = false) {
    const dayElement = document.createElement('div');
    dayElement.className = `p-2 border border-gray-200 text-center transition-all duration-300 hover:bg-gray-100 min-h-[70px] flex flex-col justify-between items-center calendar-day`;
    if (isOutsideMonth) {
        dayElement.classList.add('bg-gray-50', 'text-gray-400');
    } else {
        dayElement.classList.add('text-gray-900');
        if (selectedCalendarDate && selectedCalendarDate.getUTCFullYear() === date.getUTCFullYear() && selectedCalendarDate.getUTCMonth() === date.getUTCMonth() && selectedCalendarDate.getUTCDate() === date.getUTCDate()) {
            dayElement.classList.add('bg-blue-200');
        }
    }
    dayElement.innerHTML = `<span class="text-xs font-semibold ${isToday ? 'bg-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center' : 'w-7 h-7 flex items-center justify-center'}">${day}</span>`;
    const dateKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    const events = exhibitionsByDate[dateKey];
    if (events && events.length > 0) {
        const eventDotsContainer = document.createElement('div');
        eventDotsContainer.className = 'flex flex-wrap gap-1 mt-1 justify-center';
        events.forEach(event => {
            const dot = document.createElement('span');
            dot.className = 'w-2 h-2 rounded-full bg-blue-500';
            dot.title = event.title_ru;
            eventDotsContainer.appendChild(dot);
        });
        dayElement.appendChild(eventDotsContainer);
    }
    dayElement.addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedCalendarDate && selectedCalendarDate.getUTCFullYear() === date.getUTCFullYear() && selectedCalendarDate.getUTCMonth() === date.getUTCMonth() && selectedCalendarDate.getUTCDate() === date.getUTCDate()) {
            selectedCalendarDate = null;
        } else {
            selectedCalendarDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        }
        renderCalendar();
        window.dispatchEvent(new CustomEvent('dateSelected', { detail: selectedCalendarDate }));
    });
    return dayElement;
}

function expandCalendar() {
    const calendarWrapper = document.getElementById('calendar-wrapper');
    const collapseIcon = document.getElementById('collapse-icon');
    calendarWrapper.classList.remove('calendar-collapsed');
    calendarWrapper.classList.add('calendar-expanded');
    collapseIcon.classList.add('chevron-up'); // Исправлено: используем chevron-up вместо rotate-180
    renderCalendar();
}

function collapseCalendar() {
    const calendarWrapper = document.getElementById('calendar-wrapper');
    const collapseIcon = document.getElementById('collapse-icon');
    calendarWrapper.classList.remove('calendar-expanded');
    calendarWrapper.classList.add('calendar-collapsed');
    collapseIcon.classList.remove('chevron-up'); // Исправлено: используем chevron-up вместо rotate-180
    renderCalendar();
}

document.addEventListener('DOMContentLoaded', () => {
    const calendarWrapper = document.getElementById('calendar-wrapper');
    const collapseIcon = document.getElementById('collapse-icon');
    const prevMonthButton = document.getElementById('prev-month-button');
    const nextMonthButton = document.getElementById('next-month-button');

    window.addEventListener('dateFilterCleared', () => {
        selectedCalendarDate = null;
        renderCalendar();
    });

    collapseIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (calendarWrapper.classList.contains('calendar-collapsed')) {
            expandCalendar();
        } else {
            collapseCalendar();
        }
    });

    calendarWrapper.addEventListener('click', (e) => {
        if (calendarWrapper.classList.contains('calendar-collapsed') && e.target !== collapseIcon && !e.target.closest('#prev-month-button') && !e.target.closest('#next-month-button')) {
            expandCalendar();
        }
    });

    prevMonthButton.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedCalendarDate = null;
        const isCollapsed = calendarWrapper.classList.contains('calendar-collapsed');
        if (isCollapsed) {
            currentViewDate.setDate(currentViewDate.getDate() - 7);
        } else {
            currentViewDate.setMonth(currentViewDate.getMonth() - 1);
        }
        renderCalendar();
        window.dispatchEvent(new CustomEvent('dateSelected', { detail: null }));
    });

    nextMonthButton.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedCalendarDate = null;
        const isCollapsed = calendarWrapper.classList.contains('calendar-collapsed');
        if (isCollapsed) {
            currentViewDate.setDate(currentViewDate.getDate() + 7);
        } else {
            currentViewDate.setMonth(currentViewDate.getMonth() + 1);
        }
        renderCalendar();
        window.dispatchEvent(new CustomEvent('dateSelected', { detail: null }));
    });

    renderCalendar();
});