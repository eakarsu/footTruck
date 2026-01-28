import { useState, useEffect } from 'react';
import { useTruck } from '../context/TruckContext';
import { eventsAPI } from '../services/api';
import { Clock, CheckCircle, Circle, AlertCircle, Calendar, FileText, CreditCard, MapPin, Plus, X } from 'lucide-react';
import { format, isPast, isFuture, isToday, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

const typeIcons = {
  APPLICATION_DEADLINE: FileText,
  PAYMENT_DUE: CreditCard,
  DOCUMENT_SUBMISSION: FileText,
  SETUP_TIME: MapPin,
  EVENT_START: Calendar,
  EVENT_END: Calendar,
  CUSTOM: Clock
};

const typeColors = {
  APPLICATION_DEADLINE: 'text-purple-600 bg-purple-100',
  PAYMENT_DUE: 'text-green-600 bg-green-100',
  DOCUMENT_SUBMISSION: 'text-blue-600 bg-blue-100',
  SETUP_TIME: 'text-orange-600 bg-orange-100',
  EVENT_START: 'text-indigo-600 bg-indigo-100',
  EVENT_END: 'text-gray-600 bg-gray-100',
  CUSTOM: 'text-gray-600 bg-gray-100'
};

export default function EventTimeline({ eventId, registrationId, showAddButton = false }) {
  const { selectedTruck } = useTruck();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    type: 'CUSTOM'
  });

  useEffect(() => {
    loadTimeline();
  }, [eventId, registrationId, selectedTruck]);

  const loadTimeline = async () => {
    try {
      let res;
      if (eventId) {
        res = await eventsAPI.getTimeline(eventId);
      } else if (registrationId) {
        res = await eventsAPI.getRegistrationTimeline(registrationId);
      } else if (selectedTruck) {
        res = await eventsAPI.getTruckTimeline(selectedTruck.id);
      } else {
        setTimeline([]);
        return;
      }
      setTimeline(res.data);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (item) => {
    // Virtual timeline items (event-start-*, event-end-*) can't be toggled
    if (item.id.startsWith('event-start-') || item.id.startsWith('event-end-')) {
      toast.error('Event start/end dates cannot be marked as complete');
      return;
    }

    try {
      await eventsAPI.updateTimeline(item.id, {
        isCompleted: !item.isCompleted
      });
      toast.success(item.isCompleted ? 'Marked as incomplete' : 'Marked as complete');
      loadTimeline();
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await eventsAPI.createTimeline({
        ...form,
        eventId,
        registrationId
      });
      toast.success('Timeline item added');
      setShowAddModal(false);
      setForm({ title: '', description: '', dueDate: '', type: 'CUSTOM' });
      loadTimeline();
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Delete this timeline item?')) return;
    try {
      await eventsAPI.deleteTimeline(id);
      toast.success('Item deleted');
      loadTimeline();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const getStatusInfo = (item) => {
    if (item.isCompleted) {
      return {
        status: 'completed',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: 'Completed'
      };
    }

    const dueDate = new Date(item.dueDate);

    if (isPast(dueDate) && !isToday(dueDate)) {
      return {
        status: 'overdue',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        label: 'Overdue'
      };
    }

    const daysUntil = differenceInDays(dueDate, new Date());

    if (isToday(dueDate)) {
      return {
        status: 'today',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        label: 'Due Today'
      };
    }

    if (daysUntil <= 3) {
      return {
        status: 'soon',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        label: `${daysUntil} days left`
      };
    }

    return {
      status: 'upcoming',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
      label: `${daysUntil} days left`
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 mb-4">No timeline items yet</p>
        {showAddButton && (
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Timeline Item
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showAddButton && (
        <div className="flex justify-end">
          <button onClick={() => setShowAddModal(true)} className="btn btn-secondary">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        <div className="space-y-4">
          {timeline.map((item, index) => {
            const statusInfo = getStatusInfo(item);
            const TypeIcon = typeIcons[item.type] || Clock;

            return (
              <div key={item.id} className="relative pl-10">
                {/* Timeline dot */}
                <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  item.isCompleted ? 'bg-green-100' : statusInfo.bgColor
                }`}>
                  {item.isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : statusInfo.status === 'overdue' ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <TypeIcon className={`h-5 w-5 ${statusInfo.color}`} />
                  )}
                </div>

                {/* Content - clickable to select and show details */}
                <div
                  className={`card p-4 cursor-pointer hover:shadow-lg transition-all ${item.isCompleted ? 'opacity-60' : ''} ${selectedItemId === item.id ? 'ring-2 ring-primary-500 bg-primary-50' : ''}`}
                  onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-medium ${item.isCompleted ? 'line-through text-gray-500' : ''}`}>
                          {item.title}
                        </h4>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${typeColors[item.type] || typeColors.CUSTOM}`}>
                          {item.type.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">
                          {format(new Date(item.dueDate), 'MMM d, yyyy')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusInfo.bgColor} ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {item.event && (
                          <span className="text-gray-400">
                            {item.event.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Only show toggle for real timeline items (not virtual event-start/end) */}
                      {!item.id.startsWith('event-start-') && !item.id.startsWith('event-end-') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleComplete(item); }}
                          className={`p-2 rounded-lg ${
                            item.isCompleted
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600'
                          }`}
                          title={item.isCompleted ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {item.isCompleted ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </button>
                      )}

                      {item.type === 'CUSTOM' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                          className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Event Details */}
                  {selectedItemId === item.id && item.event && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h5 className="font-medium text-primary-700 mb-3">Event Details</h5>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Event Name</p>
                          <p className="font-medium">{item.event.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Date</p>
                          <p className="font-medium">
                            {format(new Date(item.event.startDate), 'MMM d, yyyy')}
                            {item.event.endDate && item.event.endDate !== item.event.startDate &&
                              ` - ${format(new Date(item.event.endDate), 'MMM d, yyyy')}`}
                          </p>
                        </div>
                        {item.event.venueAddress && (
                          <div>
                            <p className="text-gray-500">Location</p>
                            <p className="font-medium">{item.event.venueAddress}</p>
                          </div>
                        )}
                        {item.event.expectedAttendance && (
                          <div>
                            <p className="text-gray-500">Expected Attendance</p>
                            <p className="font-medium">{item.event.expectedAttendance.toLocaleString()}</p>
                          </div>
                        )}
                        {item.event.vendorFee && (
                          <div>
                            <p className="text-gray-500">Vendor Fee</p>
                            <p className="font-medium">${item.event.vendorFee}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-500">Status</p>
                          <p className="font-medium">{item.event.status}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Add Timeline Item</h2>
              <button onClick={() => setShowAddModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddItem} className="p-4 space-y-4">
              <div>
                <label className="label">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Due Date</label>
                  <input
                    type="datetime-local"
                    value={form.dueDate}
                    onChange={e => setForm({ ...form, dueDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}
                    className="input"
                  >
                    {Object.keys(typeIcons).map(type => (
                      <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
