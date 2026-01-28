import { useState, useMemo } from 'react';
import { format, isSameDay, parseISO } from 'date-fns';
import { Clock, MapPin, Users } from 'lucide-react';

export default function TimeSlotPicker({ slots, selectedSlot, onSelect }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const groups = {};
    slots.forEach(slot => {
      const dateKey = format(new Date(slot.date), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(slot);
    });
    return groups;
  }, [slots]);

  // Get unique dates
  const availableDates = Object.keys(slotsByDate).sort();

  // Get unique locations for selected date
  const locationsForDate = useMemo(() => {
    if (!selectedDate) return [];
    const slotsForDate = slotsByDate[selectedDate] || [];
    const locationMap = {};
    slotsForDate.forEach(slot => {
      if (slot.location && !locationMap[slot.location.id]) {
        locationMap[slot.location.id] = slot.location;
      }
    });
    return Object.values(locationMap);
  }, [selectedDate, slotsByDate]);

  // Get time slots for selected date and location
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    let slotsForDate = slotsByDate[selectedDate] || [];
    if (selectedLocation) {
      slotsForDate = slotsForDate.filter(s => s.location?.id === selectedLocation);
    }
    return slotsForDate.sort((a, b) => a.slotStart.localeCompare(b.slotStart));
  }, [selectedDate, selectedLocation, slotsByDate]);

  // Auto-select first date if none selected
  if (!selectedDate && availableDates.length > 0) {
    setSelectedDate(availableDates[0]);
  }

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div>
        <h3 className="font-medium mb-3">Select Date</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {availableDates.map(dateKey => {
            const date = new Date(dateKey);
            const isSelected = selectedDate === dateKey;
            return (
              <button
                key={dateKey}
                onClick={() => {
                  setSelectedDate(dateKey);
                  setSelectedLocation(null);
                }}
                className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-colors ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="text-xs text-gray-500">{format(date, 'EEE')}</p>
                <p className="text-lg font-bold">{format(date, 'd')}</p>
                <p className="text-xs text-gray-500">{format(date, 'MMM')}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Location Selection (if multiple locations) */}
      {locationsForDate.length > 1 && (
        <div>
          <h3 className="font-medium mb-3">Select Location</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {locationsForDate.map(location => {
              const isSelected = selectedLocation === location.id;
              return (
                <button
                  key={location.id}
                  onClick={() => setSelectedLocation(isSelected ? null : location.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">{location.name}</p>
                      <p className="text-sm text-gray-500">{location.address}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Time Slots */}
      {selectedDate && (
        <div>
          <h3 className="font-medium mb-3">Select Time</h3>
          {availableTimeSlots.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No available time slots</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {availableTimeSlots.map(slot => {
                const isSelected = selectedSlot?.id === slot.id;
                const isFull = slot.availableSpots <= 0;

                return (
                  <button
                    key={slot.id}
                    onClick={() => !isFull && onSelect(slot)}
                    disabled={isFull}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      isFull
                        ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                        : isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{slot.slotStart}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xs">
                      <Users className="h-3 w-3" />
                      <span className={isFull ? 'text-red-500' : 'text-gray-500'}>
                        {isFull ? 'Full' : `${slot.availableSpots} spots`}
                      </span>
                    </div>
                    {locationsForDate.length === 1 && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {slot.location?.name}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
