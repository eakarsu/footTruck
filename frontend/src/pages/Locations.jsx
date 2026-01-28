import { useState, useEffect } from 'react';
import { useTruck } from '../context/TruckContext';
import { locationsAPI } from '../services/api';
import {
  MapPin, Plus, Calendar, Clock, DollarSign, Users,
  Edit2, Trash2, X, Check, ChevronLeft, ChevronRight
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import toast from 'react-hot-toast';

export default function Locations() {
  const { selectedTruck } = useTruck();
  const [locations, setLocations] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [history, setHistory] = useState({ history: [], stats: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('calendar');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [editingBooking, setEditingBooking] = useState(null);
  const [locationForm, setLocationForm] = useState({
    name: '', address: '', city: '', state: '', zipCode: '', type: 'STREET', notes: ''
  });
  const [bookingForm, setBookingForm] = useState({
    locationId: '', date: '', startTime: '', endTime: '', notes: ''
  });

  useEffect(() => {
    if (selectedTruck) {
      loadData();
    }
  }, [selectedTruck, currentWeek]);

  const loadData = async () => {
    try {
      const [locRes, calRes, histRes] = await Promise.all([
        locationsAPI.getAll(),
        locationsAPI.getCalendar(selectedTruck.id, {
          startDate: startOfWeek(currentWeek).toISOString(),
          endDate: endOfWeek(currentWeek).toISOString()
        }),
        locationsAPI.getHistory(selectedTruck.id)
      ]);
      setLocations(locRes.data);
      setCalendar(calRes.data);
      setHistory(histRes.data);
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentWeek),
    end: endOfWeek(currentWeek)
  });

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    try {
      if (editingLocation) {
        await locationsAPI.update(editingLocation.id, locationForm);
        toast.success('Location updated');
      } else {
        await locationsAPI.create(locationForm);
        toast.success('Location created');
      }
      setShowLocationModal(false);
      setEditingLocation(null);
      setLocationForm({ name: '', address: '', city: '', state: '', zipCode: '', type: 'STREET', notes: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to save location');
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      await locationsAPI.delete(id);
      toast.success('Location deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete location');
    }
  };

  const handleSaveBooking = async (e) => {
    e.preventDefault();
    try {
      if (editingBooking) {
        await locationsAPI.updateBooking(editingBooking.id, bookingForm);
        toast.success('Booking updated');
      } else {
        await locationsAPI.bookLocation(selectedTruck.id, bookingForm);
        toast.success('Location booked');
      }
      setShowBookingModal(false);
      setEditingBooking(null);
      setBookingForm({ locationId: '', date: '', startTime: '', endTime: '', notes: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to save booking');
    }
  };

  const handleDeleteBooking = async (id) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await locationsAPI.deleteBooking(id);
      toast.success('Booking cancelled');
      loadData();
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  const handleCompleteBooking = async (booking) => {
    const revenue = prompt('Enter revenue for this location:', '0');
    const customerCount = prompt('Enter customer count:', '0');
    if (revenue === null) return;

    try {
      await locationsAPI.updateBooking(booking.id, {
        status: 'COMPLETED',
        revenue: parseFloat(revenue),
        customerCount: parseInt(customerCount)
      });
      toast.success('Booking completed');
      loadData();
    } catch (error) {
      toast.error('Failed to complete booking');
    }
  };

  const openEditLocation = (loc) => {
    setEditingLocation(loc);
    setLocationForm({
      name: loc.name,
      address: loc.address,
      city: loc.city,
      state: loc.state,
      zipCode: loc.zipCode,
      type: loc.type,
      notes: loc.notes || ''
    });
    setShowLocationModal(true);
  };

  const openEditBooking = (booking) => {
    setEditingBooking(booking);
    setBookingForm({
      locationId: booking.locationId,
      date: format(new Date(booking.date), 'yyyy-MM-dd'),
      startTime: booking.startTime,
      endTime: booking.endTime,
      notes: booking.notes || ''
    });
    setShowBookingModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingLocation(null);
              setLocationForm({ name: '', address: '', city: '', state: '', zipCode: '', type: 'STREET', notes: '' });
              setShowLocationModal(true);
            }}
            className="btn btn-secondary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </button>
          <button
            onClick={() => {
              setEditingBooking(null);
              setBookingForm({ locationId: '', date: '', startTime: '', endTime: '', notes: '' });
              setShowBookingModal(true);
            }}
            className="btn btn-primary"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Book Location
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {['calendar', 'locations', 'history'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize ${
              activeTab === tab
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Calendar View */}
      {activeTab === 'calendar' && (
        <div className="card">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="font-semibold">
              {format(startOfWeek(currentWeek), 'MMM d')} - {format(endOfWeek(currentWeek), 'MMM d, yyyy')}
            </h2>
            <button
              onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 divide-x divide-gray-200">
            {weekDays.map(day => (
              <div key={day.toISOString()} className="min-h-[150px]">
                <div className={`p-2 text-center border-b ${
                  isSameDay(day, new Date()) ? 'bg-primary-50' : 'bg-gray-50'
                }`}>
                  <p className="text-xs text-gray-500">{format(day, 'EEE')}</p>
                  <p className={`font-semibold ${
                    isSameDay(day, new Date()) ? 'text-primary-600' : 'text-gray-900'
                  }`}>
                    {format(day, 'd')}
                  </p>
                </div>
                <div className="p-2 space-y-1">
                  {calendar
                    .filter(b => isSameDay(new Date(b.date), day))
                    .map(booking => (
                      <div
                        key={booking.id}
                        className={`p-2 rounded text-xs cursor-pointer ${
                          booking.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'CONFIRMED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                        onClick={() => openEditBooking(booking)}
                      >
                        <p className="font-medium truncate">{booking.location?.name}</p>
                        <p>{booking.startTime} - {booking.endTime}</p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locations List */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(loc => (
            <div key={loc.id} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{loc.name}</h3>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {loc.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditLocation(loc)}
                    className="p-1.5 hover:bg-gray-100 rounded"
                  >
                    <Edit2 className="h-4 w-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDeleteLocation(loc.id)}
                    className="p-1.5 hover:bg-gray-100 rounded"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600">{loc.address}</p>
              <p className="text-sm text-gray-500">{loc.city}, {loc.state} {loc.zipCode}</p>
            </div>
          ))}
          {locations.length === 0 && (
            <div className="col-span-full text-center py-12">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No locations added yet</p>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.stats?.map(stat => (
              <div key={stat.location?.id} className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3">{stat.location?.name}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Visits</p>
                    <p className="font-semibold">{stat.visits}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Revenue</p>
                    <p className="font-semibold text-green-600">${stat.totalRevenue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Avg Revenue</p>
                    <p className="font-semibold">${stat.averageRevenue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Avg Customers</p>
                    <p className="font-semibold">{Math.round(stat.averageCustomers)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold">Recent History</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {history.history?.slice(0, 10).map(h => (
                <div key={h.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{h.location?.name}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(h.date), 'MMM d, yyyy')} | {h.startTime} - {h.endTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">${(h.revenue || 0).toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{h.customerCount || 0} customers</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingLocation ? 'Edit Location' : 'Add Location'}
              </h2>
              <button onClick={() => setShowLocationModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveLocation} className="p-4 space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={locationForm.name}
                  onChange={e => setLocationForm({ ...locationForm, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Address</label>
                <input
                  type="text"
                  value={locationForm.address}
                  onChange={e => setLocationForm({ ...locationForm, address: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">City</label>
                  <input
                    type="text"
                    value={locationForm.city}
                    onChange={e => setLocationForm({ ...locationForm, city: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">State</label>
                  <input
                    type="text"
                    value={locationForm.state}
                    onChange={e => setLocationForm({ ...locationForm, state: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Zip Code</label>
                  <input
                    type="text"
                    value={locationForm.zipCode}
                    onChange={e => setLocationForm({ ...locationForm, zipCode: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Type</label>
                <select
                  value={locationForm.type}
                  onChange={e => setLocationForm({ ...locationForm, type: e.target.value })}
                  className="input"
                >
                  <option value="STREET">Street</option>
                  <option value="PARKING_LOT">Parking Lot</option>
                  <option value="PRIVATE_PROPERTY">Private Property</option>
                  <option value="EVENT_VENUE">Event Venue</option>
                  <option value="FOOD_COURT">Food Court</option>
                  <option value="MARKET">Market</option>
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  value={locationForm.notes}
                  onChange={e => setLocationForm({ ...locationForm, notes: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowLocationModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingLocation ? 'Update' : 'Create'} Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingBooking ? 'Edit Booking' : 'Book Location'}
              </h2>
              <button onClick={() => setShowBookingModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveBooking} className="p-4 space-y-4">
              <div>
                <label className="label">Location</label>
                <select
                  value={bookingForm.locationId}
                  onChange={e => setBookingForm({ ...bookingForm, locationId: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select a location</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  value={bookingForm.date}
                  onChange={e => setBookingForm({ ...bookingForm, date: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Time</label>
                  <input
                    type="time"
                    value={bookingForm.startTime}
                    onChange={e => setBookingForm({ ...bookingForm, startTime: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">End Time</label>
                  <input
                    type="time"
                    value={bookingForm.endTime}
                    onChange={e => setBookingForm({ ...bookingForm, endTime: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  value={bookingForm.notes}
                  onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                {editingBooking && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDeleteBooking(editingBooking.id)}
                      className="btn btn-danger"
                    >
                      Cancel Booking
                    </button>
                    {editingBooking.status !== 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowBookingModal(false);
                          handleCompleteBooking(editingBooking);
                        }}
                        className="btn btn-success"
                      >
                        Complete
                      </button>
                    )}
                  </>
                )}
                <button type="button" onClick={() => setShowBookingModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingBooking ? 'Update' : 'Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
