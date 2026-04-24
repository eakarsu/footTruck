import { useState, useEffect, useCallback } from 'react';
import { useTruck } from '../context/TruckContext';
import { eventsAPI, locationsAPI } from '../services/api';
import { Calendar, Plus, X, MapPin, Users, DollarSign, Clock, Grid3X3, ListFilter, LayoutGrid, Download, FileDown, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import EventCalendar from '../components/EventCalendar';
import EventTimeline from '../components/EventTimeline';
import RegistrationWizard from '../components/RegistrationWizard';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import RowDetailModal from '../components/RowDetailModal';

const eventDetailFields = [
  { key: 'name', label: 'Event Name' },
  { key: 'description', label: 'Description' },
  { key: 'startDate', label: 'Start Date', render: (v) => v ? format(new Date(v), 'MMM d, yyyy') : '-' },
  { key: 'endDate', label: 'End Date', render: (v) => v ? format(new Date(v), 'MMM d, yyyy') : '-' },
  { key: 'venueAddress', label: 'Venue' },
  { key: 'expectedAttendance', label: 'Expected Attendance', render: (v) => v ? v.toLocaleString() : '-' },
  { key: 'vendorFee', label: 'Vendor Fee', render: (v) => v ? `$${v}` : '-' },
  { key: 'applicationDeadline', label: 'Application Deadline', render: (v) => v ? format(new Date(v), 'MMM d, yyyy') : '-' },
  { key: 'status', label: 'Status' }
];

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function Events() {
  const { selectedTruck } = useTruck();
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('calendar');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showEventModal, setShowEventModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    venueAddress: '',
    expectedAttendance: '',
    vendorFee: '',
    applicationDeadline: '',
    locationId: ''
  });

  // Search, pagination, bulk selection state
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Detail modal state
  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  // Confirm dialog state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Registration search state
  const [regSearch, setRegSearch] = useState('');

  useEffect(() => {
    if (selectedTruck) loadData();
  }, [selectedTruck]);

  // Reload events when search or page changes
  useEffect(() => {
    if (selectedTruck) loadEvents();
  }, [search, page]);

  // Reset page to 1 when search changes
  const handleSearchChange = useCallback((val) => {
    setSearch(val);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const loadEvents = async () => {
    try {
      const eventsRes = await eventsAPI.getAll({ page, limit: 20, search, upcoming: true });
      setEvents(eventsRes.data);
      if (eventsRes.pagination) {
        setPage(eventsRes.pagination.page);
        setTotalPages(eventsRes.pagination.totalPages);
        setTotal(eventsRes.pagination.total);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const loadData = async () => {
    try {
      const [eventsRes, regsRes, locsRes] = await Promise.all([
        eventsAPI.getAll({ page, limit: 20, search, upcoming: true }),
        eventsAPI.getRegistrations(selectedTruck.id),
        locationsAPI.getAll()
      ]);
      setEvents(eventsRes.data);
      if (eventsRes.pagination) {
        setPage(eventsRes.pagination.page);
        setTotalPages(eventsRes.pagination.totalPages);
        setTotal(eventsRes.pagination.total);
      }
      setRegistrations(regsRes.data);
      setLocations(locsRes.data);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await eventsAPI.create(eventForm);
      toast.success('Event created');
      setShowEventModal(false);
      setEventForm({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        venueAddress: '',
        expectedAttendance: '',
        vendorFee: '',
        applicationDeadline: '',
        locationId: ''
      });
      loadData();
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  const handleCancelRegistration = (regId) => {
    setConfirmAction({
      title: 'Cancel Registration',
      message: 'Are you sure you want to cancel this registration? This action cannot be undone.',
      variant: 'danger',
      confirmLabel: 'Cancel Registration',
      action: async () => {
        try {
          await eventsAPI.cancelRegistration(regId);
          toast.success('Registration cancelled');
          loadData();
        } catch (error) {
          toast.error('Failed to cancel registration');
        }
      }
    });
    setShowConfirm(true);
  };

  const openRegisterWizard = (event) => {
    setSelectedEvent(event);
    setShowWizard(true);
  };

  const handleSelectCalendarEvent = (calEvent) => {
    const fullEvent = events.find(e => e.id === calEvent.id);
    if (fullEvent) {
      setSelectedEvent(fullEvent);
    }
  };

  // Row detail modal handler
  const handleRowClick = (event) => {
    setDetailItem(event);
    setShowDetail(true);
  };

  // Bulk selection handlers
  const toggleSelectEvent = (eventId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === events.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(events.map(e => e.id)));
    }
  };

  // Bulk delete
  const handleBulkDelete = () => {
    setConfirmAction({
      title: 'Delete Selected Events',
      message: `Are you sure you want to delete ${selectedIds.size} selected event(s)? This action cannot be undone.`,
      variant: 'danger',
      confirmLabel: 'Delete',
      action: async () => {
        try {
          await eventsAPI.bulkDelete([...selectedIds]);
          toast.success(`${selectedIds.size} event(s) deleted`);
          setSelectedIds(new Set());
          loadData();
        } catch (error) {
          toast.error('Failed to delete events');
        }
      }
    });
    setShowConfirm(true);
  };

  // Export handlers
  const handleExportCSV = async () => {
    try {
      const blob = await eventsAPI.exportCSV();
      downloadBlob(blob, 'events.csv');
      toast.success('CSV exported');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  const handleExportPDF = async () => {
    try {
      const blob = await eventsAPI.exportPDF();
      downloadBlob(blob, 'events.pdf');
      toast.success('PDF exported');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  // Confirm dialog handlers
  const handleConfirm = async () => {
    if (confirmAction?.action) {
      await confirmAction.action();
    }
    setShowConfirm(false);
    setConfirmAction(null);
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
    setConfirmAction(null);
  };

  const isRegistered = (eventId) => registrations.some(r => r.eventId === eventId);
  const getRegistration = (eventId) => registrations.find(r => r.eventId === eventId);

  // Filter registrations by search
  const filteredRegistrations = regSearch
    ? registrations.filter(r =>
        r.event?.name?.toLowerCase().includes(regSearch.toLowerCase()) ||
        r.event?.venueAddress?.toLowerCase().includes(regSearch.toLowerCase()) ||
        r.status?.toLowerCase().includes(regSearch.toLowerCase())
      )
    : registrations;

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
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <button
          onClick={() => setShowEventModal(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex">
          {[
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            { id: 'browse', label: 'Browse Events', icon: LayoutGrid },
            { id: 'registrations', label: `My Registrations (${registrations.length})`, icon: ListFilter },
            { id: 'timeline', label: 'Timeline', icon: Clock }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'browse' && (
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <ListFilter className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Calendar View */}
      {activeTab === 'calendar' && (
        <EventCalendar onSelectEvent={handleSelectCalendarEvent} />
      )}

      {/* Browse Events */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="Search events by name, venue, status..."
          />

          {/* Toolbar: selection info, bulk actions, exports */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  selectedIds.size === events.length && events.length > 0
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <CheckSquare className="h-4 w-4" />
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected`
                  : 'Select all'
                }
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="btn bg-red-600 text-white hover:bg-red-700 text-sm px-3 py-1.5"
                >
                  Delete Selected ({selectedIds.size})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <FileDown className="h-4 w-4" />
                PDF
              </button>
            </div>
          </div>

          {/* Event Cards */}
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-4'
          }>
            {events.map(event => {
              const reg = getRegistration(event.id);
              const isSelected = selectedIds.has(event.id);

              return viewMode === 'grid' ? (
                <div
                  key={event.id}
                  className={`card overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
                    isSelected ? 'ring-2 ring-primary-500' : ''
                  }`}
                  onClick={() => handleRowClick(event)}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => { e.stopPropagation(); toggleSelectEvent(event.id); }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <h3 className="font-semibold text-lg">{event.name}</h3>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        event.status === 'UPCOMING'
                          ? 'bg-blue-100 text-blue-700'
                          : event.status === 'ONGOING'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}>
                        {event.status}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>
                    )}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(event.startDate), 'MMM d, yyyy')}
                        {event.endDate !== event.startDate && ` - ${format(new Date(event.endDate), 'MMM d')}`}
                      </div>
                      {event.venueAddress && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="h-4 w-4" />
                          {event.venueAddress}
                        </div>
                      )}
                      {event.expectedAttendance && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="h-4 w-4" />
                          {event.expectedAttendance.toLocaleString()} expected
                        </div>
                      )}
                      {event.vendorFee && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          ${event.vendorFee} vendor fee
                        </div>
                      )}
                      {event.applicationDeadline && (
                        <div className="flex items-center gap-2 text-yellow-600">
                          <Clock className="h-4 w-4" />
                          Apply by {format(new Date(event.applicationDeadline), 'MMM d')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 border-t">
                    {reg ? (
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          reg.status === 'APPROVED'
                            ? 'bg-green-100 text-green-700'
                            : reg.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {reg.status}
                        </span>
                        {reg.boothNumber && (
                          <span className="text-sm text-gray-500">
                            Booth: {reg.boothNumber}
                          </span>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); openRegisterWizard(event); }}
                        className="btn btn-primary w-full"
                      >
                        Register
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  key={event.id}
                  className={`card p-4 flex items-center justify-between hover:shadow-lg transition-shadow cursor-pointer ${
                    isSelected ? 'ring-2 ring-primary-500' : ''
                  }`}
                  onClick={() => handleRowClick(event)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => { e.stopPropagation(); toggleSelectEvent(event.id); }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold">{event.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          event.status === 'UPCOMING'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {event.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(event.startDate), 'MMM d, yyyy')}
                        </span>
                        {event.venueAddress && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.venueAddress}
                          </span>
                        )}
                        {event.vendorFee && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${event.vendorFee}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {reg ? (
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      reg.status === 'APPROVED'
                        ? 'bg-green-100 text-green-700'
                        : reg.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {reg.status}
                    </span>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); openRegisterWizard(event); }}
                      className="btn btn-primary"
                    >
                      Register
                    </button>
                  )}
                </div>
              );
            })}
            {events.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No upcoming events</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={(p) => { setPage(p); setSelectedIds(new Set()); }}
          />
        </div>
      )}

      {/* My Registrations */}
      {activeTab === 'registrations' && (
        <div className="space-y-4">
          {/* Registration Search */}
          <SearchBar
            value={regSearch}
            onChange={setRegSearch}
            placeholder="Search registrations by event name, venue, status..."
          />

          {filteredRegistrations.map(reg => (
            <div key={reg.id} className="card p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => { setSelectedEvent(reg.event); setShowWizard(true); }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{reg.event?.name}</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {format(new Date(reg.event?.startDate), 'MMMM d, yyyy')}
                    {reg.event?.venueAddress && ` \u2022 ${reg.event.venueAddress}`}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      reg.status === 'APPROVED'
                        ? 'bg-green-100 text-green-700'
                        : reg.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : reg.status === 'REJECTED'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                    }`}>
                      {reg.status}
                    </span>

                    {reg.booth && (
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Grid3X3 className="h-4 w-4" />
                        Booth {reg.booth.boothNumber}
                      </span>
                    )}

                    {reg.paymentStatus && (
                      <span className={`text-sm flex items-center gap-1 ${
                        reg.paymentStatus === 'PAID'
                          ? 'text-green-600'
                          : 'text-yellow-600'
                      }`}>
                        <DollarSign className="h-4 w-4" />
                        {reg.paymentStatus}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCancelRegistration(reg.id); }}
                    className="btn btn-danger text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredRegistrations.length === 0 && registrations.length > 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No registrations match your search</p>
            </div>
          )}
          {registrations.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No registrations yet</p>
              <button
                onClick={() => setActiveTab('browse')}
                className="btn btn-primary"
              >
                Browse Events
              </button>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {activeTab === 'timeline' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Event Timeline</h2>
          <EventTimeline showAddButton />
        </div>
      )}

      {/* Create Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Add Event</h2>
              <button onClick={() => setShowEventModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-4 space-y-4">
              <div>
                <label className="label">Event Name</label>
                <input
                  type="text"
                  value={eventForm.name}
                  onChange={e => setEventForm({ ...eventForm, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date</label>
                  <input
                    type="date"
                    value={eventForm.startDate}
                    onChange={e => setEventForm({ ...eventForm, startDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input
                    type="date"
                    value={eventForm.endDate}
                    onChange={e => setEventForm({ ...eventForm, endDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Venue Address</label>
                <input
                  type="text"
                  value={eventForm.venueAddress}
                  onChange={e => setEventForm({ ...eventForm, venueAddress: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Location (optional)</label>
                <select
                  value={eventForm.locationId}
                  onChange={e => setEventForm({ ...eventForm, locationId: e.target.value })}
                  className="input"
                >
                  <option value="">Select a location</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Expected Attendance</label>
                  <input
                    type="number"
                    value={eventForm.expectedAttendance}
                    onChange={e => setEventForm({ ...eventForm, expectedAttendance: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Vendor Fee ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={eventForm.vendorFee}
                    onChange={e => setEventForm({ ...eventForm, vendorFee: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="label">Application Deadline</label>
                <input
                  type="date"
                  value={eventForm.applicationDeadline}
                  onChange={e => setEventForm({ ...eventForm, applicationDeadline: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registration Wizard */}
      {showWizard && selectedEvent && (
        <RegistrationWizard
          event={selectedEvent}
          onClose={() => {
            setShowWizard(false);
            setSelectedEvent(null);
          }}
          onSuccess={() => {
            loadData();
          }}
        />
      )}

      {/* Event Detail Modal */}
      <RowDetailModal
        isOpen={showDetail}
        title={detailItem?.name || 'Event Details'}
        data={detailItem}
        fields={eventDetailFields}
        onClose={() => { setShowDetail(false); setDetailItem(null); }}
        onEdit={(event) => {
          setShowDetail(false);
          setDetailItem(null);
          openRegisterWizard(event);
        }}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        title={confirmAction?.title || 'Confirm'}
        message={confirmAction?.message || 'Are you sure?'}
        confirmLabel={confirmAction?.confirmLabel || 'Confirm'}
        variant={confirmAction?.variant || 'danger'}
        onConfirm={handleConfirm}
        onCancel={handleCancelConfirm}
      />
    </div>
  );
}
