class CalendarApp {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.events = this.loadEvents();
        this.editingEvent = null;
        this.includeCanaryHolidays = true; // include Canary Islands holidays
        this.holidays = {}; // populated per year
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.holidays = this.buildHolidays(this.currentDate.getFullYear());
        this.renderCalendar();
        this.updateCurrentMonthDisplay();
    }

    bindEvents() {
        // Navigation controls
        document.getElementById('prevMonth').addEventListener('click', () => this.previousMonth());
        document.getElementById('nextMonth').addEventListener('click', () => this.nextMonth());
        document.getElementById('todayBtn').addEventListener('click', () => this.goToToday());

        // Modal controls
        document.getElementById('addEventBtn').addEventListener('click', () => this.showEventModal());
        document.getElementById('closeModal').addEventListener('click', () => this.hideEventModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideEventModal());
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteEvent());

        // Form submission
        document.getElementById('eventForm').addEventListener('submit', (e) => this.saveEvent(e));

        // Close modal when clicking outside
        document.getElementById('eventModal').addEventListener('click', (e) => {
            if (e.target.id === 'eventModal') {
                this.hideEventModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideEventModal();
            }
        });
    }

    renderCalendar() {
        const calendarDays = document.getElementById('calendarDays');
        calendarDays.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Refresh holidays if year changed
        if (!this.holidays || this.holidays.__year !== year) {
            this.holidays = this.buildHolidays(year);
        }

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        // Adjust for Monday-first week (0=Sunday becomes 6, 1=Monday becomes 0, etc.)
        const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

        // Get previous month's last days
        const prevMonth = new Date(year, month - 1, 0);
        const prevMonthDays = prevMonth.getDate();

        // Create calendar grid
        let dayCount = 1;
        let nextMonthDay = 1;

        for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';

            let dayNumber, currentMonth, currentYear;

            if (i < startingDayOfWeek) {
                // Previous month days
                dayNumber = prevMonthDays - startingDayOfWeek + i + 1;
                currentMonth = month - 1;
                currentYear = month === 0 ? year - 1 : year;
                dayElement.classList.add('other-month');
            } else if (dayCount <= daysInMonth) {
                // Current month days
                dayNumber = dayCount;
                currentMonth = month;
                currentYear = year;
                dayCount++;
            } else {
                // Next month days
                dayNumber = nextMonthDay;
                currentMonth = month + 1;
                currentYear = month === 11 ? year + 1 : year;
                dayElement.classList.add('other-month');
                nextMonthDay++;
            }

            // Adjust month for proper date creation
            const adjustedMonth = currentMonth < 0 ? 11 : currentMonth > 11 ? 0 : currentMonth;
            const dateKey = `${currentYear}-${String(adjustedMonth + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;

            // Check if it's today or past
            const today = new Date();
            const currentDateObj = new Date(currentYear, adjustedMonth, dayNumber);
            const todayDateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            
            const isToday = currentYear === today.getFullYear() && 
                           adjustedMonth === today.getMonth() && 
                           dayNumber === today.getDate();
            
            const isPast = currentDateObj < todayDateObj;

            if (isToday && !dayElement.classList.contains('other-month')) {
                dayElement.classList.add('today');
            } else if (isPast && !dayElement.classList.contains('other-month')) {
                dayElement.classList.add('past');
            }

            // Create day content
            const dayNumberEl = document.createElement('div');
            dayNumberEl.className = 'day-number';
            dayNumberEl.textContent = dayNumber;

            const dayEventsEl = document.createElement('div');
            dayEventsEl.className = 'day-events';

            // Add events (user + holidays) for this day
            const dayEvents = this.getCombinedEventsForDate(dateKey);
            dayEvents.slice(0, 3).forEach(event => {
                const eventDot = document.createElement('div');
                eventDot.className = `event-dot ${event.type}`;
                eventDot.textContent = event.title;
                eventDot.title = `${event.time ? event.time + ' - ' : ''}${event.title}`;
                dayEventsEl.appendChild(eventDot);
            });

            if (dayEvents.length > 3) {
                const moreEvents = document.createElement('div');
                moreEvents.className = 'event-dot other';
                moreEvents.textContent = `+${dayEvents.length - 3} más`;
                dayEventsEl.appendChild(moreEvents);
            }

            dayElement.appendChild(dayNumberEl);
            dayElement.appendChild(dayEventsEl);

            // Add click event
            dayElement.addEventListener('click', (e) => {
                this.selectDate(currentYear, adjustedMonth, dayNumber, e.currentTarget);
            });

            calendarDays.appendChild(dayElement);
        }
    }

    selectDate(year, month, day, clickedEl) {
        // Remove previous selection
        document.querySelectorAll('.calendar-day.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Add selection to clicked day
        if (clickedEl) clickedEl.classList.add('selected');

        this.selectedDate = new Date(year, month, day);
        this.updateSelectedDateDisplay();
        this.renderEventsList();
        
        // Show add event button
        document.getElementById('addEventBtn').style.display = 'flex';
    }

    updateCurrentMonthDisplay() {
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        
        const monthYear = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        document.getElementById('currentMonth').textContent = monthYear;
    }

    updateSelectedDateDisplay() {
        if (!this.selectedDate) return;

        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        
        const dateString = this.selectedDate.toLocaleDateString('es-ES', options);
        document.getElementById('selectedDate').textContent = dateString;
    }

    renderEventsList() {
        const eventsList = document.getElementById('eventsList');
        
        if (!this.selectedDate) {
            eventsList.innerHTML = '<p class="no-events">Selecciona un día para ver eventos</p>';
            return;
        }

        const dateKey = this.getDateKey(this.selectedDate);
        const dayEvents = this.getCombinedEventsForDate(dateKey);

        // Sort events by time (holidays first, then by time)
        dayEvents.sort((a, b) => {
            const ah = a.readOnly ? 0 : 1;
            const bh = b.readOnly ? 0 : 1;
            if (ah !== bh) return ah - bh;
            if (!a.time && !b.time) return 0;
            if (!a.time) return 1;
            if (!b.time) return -1;
            return a.time.localeCompare(b.time);
        });

        eventsList.innerHTML = dayEvents.map(event => {
            const isHoliday = !!event.readOnly;
            return `
            <div class="event-item ${event.type}${isHoliday ? ' holiday' : ''}" ${isHoliday ? '' : `data-event-id="${event.id}"`}>
                <div class="event-title">${event.title}${isHoliday ? ' <span class="badge-holiday">Festivo</span>' : ''}</div>
                ${event.time ? `<div class="event-time">${event.time}${event.duration ? ` (${event.duration} min)` : ''}</div>` : ''}
                ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
                ${isHoliday ? '' : `<span class="event-priority ${event.priority}">${this.getPriorityText(event.priority)}</span>`}
            </div>`;
        }).join('');

        // Add click events to edit events (ignore holidays)
        eventsList.querySelectorAll('.event-item').forEach(item => {
            item.addEventListener('click', () => {
                const eventId = item.dataset.eventId;
                if (!eventId) return;
                this.editEvent(eventId);
            });
        });
    }

    getPriorityText(priority) {
        const priorities = {
            'low': 'Baja',
            'medium': 'Media',
            'high': 'Alta'
        };
        return priorities[priority] || 'Media';
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar();
        this.updateCurrentMonthDisplay();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.holidays = this.buildHolidays(this.currentDate.getFullYear());
        this.renderCalendar();
        this.updateCurrentMonthDisplay();
    }

    goToToday() {
        this.currentDate = new Date();
        this.holidays = this.buildHolidays(this.currentDate.getFullYear());
        this.renderCalendar();
        this.updateCurrentMonthDisplay();
    }

    showEventModal(event = null) {
        const modal = document.getElementById('eventModal');
        const form = document.getElementById('eventForm');
        const deleteBtn = document.getElementById('deleteBtn');
        const modalTitle = document.getElementById('modalTitle');

        if (event) {
            // Editing existing event
            modalTitle.textContent = 'Editar Evento';
            deleteBtn.style.display = 'flex';
            this.editingEvent = event;
            this.populateForm(event);
        } else {
            // Creating new event
            modalTitle.textContent = 'Agregar Evento';
            deleteBtn.style.display = 'none';
            this.editingEvent = null;
            form.reset();
        }

        modal.classList.add('show');
        document.getElementById('eventTitle').focus();
    }

    hideEventModal() {
        const modal = document.getElementById('eventModal');
        modal.classList.remove('show');
        this.editingEvent = null;
        document.getElementById('eventForm').reset();
    }

    populateForm(event) {
        document.getElementById('eventTitle').value = event.title;
        document.getElementById('eventType').value = event.type;
        document.getElementById('eventTime').value = event.time || '';
        document.getElementById('eventDuration').value = event.duration || '';
        document.getElementById('eventDescription').value = event.description || '';
        document.getElementById('eventPriority').value = event.priority;
    }

    saveEvent(e) {
        e.preventDefault();

        if (!this.selectedDate) {
            alert('Por favor selecciona un día primero');
            return;
        }

        const formData = new FormData(e.target);
        const eventData = {
            id: this.editingEvent ? this.editingEvent.id : Date.now().toString(),
            title: document.getElementById('eventTitle').value.trim(),
            type: document.getElementById('eventType').value,
            time: document.getElementById('eventTime').value,
            duration: document.getElementById('eventDuration').value,
            description: document.getElementById('eventDescription').value.trim(),
            priority: document.getElementById('eventPriority').value
        };

        if (!eventData.title) {
            alert('El título del evento es obligatorio');
            return;
        }

        if (!eventData.type) {
            alert('Por favor selecciona un tipo de evento');
            return;
        }

        const dateKey = this.getDateKey(this.selectedDate);

        if (!this.events[dateKey]) {
            this.events[dateKey] = [];
        }

        if (this.editingEvent) {
            // Update existing event
            const eventIndex = this.events[dateKey].findIndex(e => e.id === this.editingEvent.id);
            if (eventIndex !== -1) {
                this.events[dateKey][eventIndex] = eventData;
            }
        } else {
            // Add new event
            this.events[dateKey].push(eventData);
        }

        this.saveEvents();
        this.renderCalendar();
        this.renderEventsList();
        this.hideEventModal();
    }

    editEvent(eventId) {
        if (!this.selectedDate) return;

        const dateKey = this.getDateKey(this.selectedDate);
        const event = this.events[dateKey]?.find(e => e.id === eventId);

        if (event) {
            this.showEventModal(event);
        }
    }

    deleteEvent() {
        if (!this.editingEvent || !this.selectedDate) return;

        if (confirm('¿Estás seguro de que quieres eliminar este evento?')) {
            const dateKey = this.getDateKey(this.selectedDate);
            this.events[dateKey] = this.events[dateKey].filter(e => e.id !== this.editingEvent.id);
            
            if (this.events[dateKey].length === 0) {
                delete this.events[dateKey];
            }

            this.saveEvents();
            this.renderCalendar();
            this.renderEventsList();
            this.hideEventModal();
        }
    }

    getDateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    getCombinedEventsForDate(dateKey) {
        const userEvents = this.events[dateKey] || [];
        const holidayEvents = this.holidays[dateKey] || [];
        return [...holidayEvents, ...userEvents];
    }

    loadEvents() {
        try {
            const stored = localStorage.getItem('calendarEvents');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading events:', error);
            return {};
        }
    }

    saveEvents() {
        try {
            localStorage.setItem('calendarEvents', JSON.stringify(this.events));
        } catch (error) {
            console.error('Error saving events:', error);
            alert('Error al guardar los eventos. Por favor, intenta de nuevo.');
        }
    }

    buildHolidays(year) {
        // Spanish National Holidays + Canary Islands (2025)
        // readOnly=true so they cannot be edited
        const map = { __year: year };
        const add = (dateStr, title) => {
            if (!map[dateStr]) map[dateStr] = [];
            map[dateStr].push({ id: `h-${dateStr}-${title}`.toLowerCase(), title, type: 'holiday', priority: 'medium', readOnly: true });
        };

        // Helper to format
        const d = (m, d) => `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

        // Fixed-date National holidays
        add(d(1,1), 'Año Nuevo');
        add(d(1,6), 'Epifanía del Señor');
        add(d(5,1), 'Día del Trabajador');
        add(d(8,15), 'Asunción de la Virgen');
        add(d(10,12), 'Fiesta Nacional de España');
        add(d(11,1), 'Todos los Santos');
        add(d(12,6), 'Día de la Constitución Española');
        add(d(12,8), 'Inmaculada Concepción');
        add(d(12,25), 'Navidad del Señor');

        // Movable National (2025 approximate common dates)
        // For accuracy, these can be computed or loaded from an official source later
        add(d(4,18), 'Viernes Santo');

        // Canary Islands specific
        if (this.includeCanaryHolidays) {
            add(d(5,30), 'Día de Canarias');
            // Add island-wide Jueves Santo (commonly observed)
            add(d(4,17), 'Jueves Santo (Canarias)');
        }

        return map;
    }
}

// Initialize the calendar app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new CalendarApp();
});
