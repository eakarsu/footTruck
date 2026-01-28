import { useState, useEffect } from 'react';
import { useTruck } from '../context/TruckContext';
import { eventsAPI } from '../services/api';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Users, DollarSign, CheckCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';

export default function EventCalendar({ onSelectEvent }) {
  const { selectedTruck } = useTruck();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalendarEvents();
  }, [currentDate, selectedTruck]);

  const loadCalendarEvents = async () => {
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);

      const res = await eventsAPI.getCalendar({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        truckId: selectedTruck?.id
      });
      setEvents(res.data);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const firstDayOfMonth = startOfMonth(currentDate).getDay();
  const emptyDays = Array(firstDayOfMonth).fill(null);

  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return day >= eventStart.setHours(0, 0, 0, 0) && day <= eventEnd.setHours(23, 59, 59, 999);
    });
  };

  const getStatusColor = (event) => {
    if (event.isRegistered) {
      switch (event.registrationStatus) {
        case 'APPROVED': return 'bg-green-100 border-green-300 text-green-800';
        case 'PENDING': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
        case 'REJECTED': return 'bg-red-100 border-red-300 text-red-800';
        default: return 'bg-blue-100 border-blue-300 text-blue-800';
      }
    }
    return 'bg-gray-100 border-gray-300 text-gray-700';
  };

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary-600" />
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm hover:bg-gray-100 rounded-lg"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 card p-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {emptyDays.map((_, i) => (
              <div key={`empty-${i}`} className="h-24 bg-gray-50 rounded" />
            ))}

            {/* Day cells */}
            {days.map(day => {
              const dayEvents = getEventsForDay(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`h-24 p-1 rounded cursor-pointer transition-colors ${
                    !isSameMonth(day, currentDate) ? 'bg-gray-50 text-gray-400' :
                    isSelected ? 'bg-primary-50 ring-2 ring-primary-500' :
                    isToday(day) ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday(day) ? 'text-blue-600' : ''
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        className={`text-xs px-1 py-0.5 rounded truncate border ${getStatusColor(event)}`}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500 px-1">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
              <span>Approved</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300" />
              <span>Not Registered</span>
            </div>
          </div>
        </div>

        {/* Event Details Panel */}
        <div className="card p-4">
          <h3 className="font-semibold mb-4">
            {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
          </h3>

          {selectedDate && selectedDayEvents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No events on this day</p>
            </div>
          )}

          <div className="space-y-4">
            {selectedDayEvents.map(event => (
              <div
                key={event.id}
                className={`p-4 rounded-lg border ${getStatusColor(event)} cursor-pointer`}
                onClick={() => onSelectEvent?.(event)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{event.title}</h4>
                  {event.isRegistered && (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  )}
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(event.start), 'MMM d')}
                      {event.start !== event.end && ` - ${format(new Date(event.end), 'MMM d')}`}
                    </span>
                  </div>

                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}

                  {event.expectedAttendance && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{event.expectedAttendance.toLocaleString()} expected</span>
                    </div>
                  )}

                  {event.vendorFee && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      <span>${event.vendorFee} vendor fee</span>
                    </div>
                  )}
                </div>

                {event.isRegistered && (
                  <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                    <span className="text-xs font-medium">
                      Status: {event.registrationStatus}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
