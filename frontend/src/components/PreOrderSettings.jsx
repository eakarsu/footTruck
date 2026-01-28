import { useState, useEffect } from 'react';
import { ordersAPI, locationsAPI } from '../services/api';
import { Settings, Clock, Users, Calendar, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function PreOrderSettings({ truckId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [slots, setSlots] = useState([]);
  const [upcomingLocations, setUpcomingLocations] = useState([]);
  const [generatingSlots, setGeneratingSlots] = useState(null);

  useEffect(() => {
    loadData();
  }, [truckId]);

  const loadData = async () => {
    try {
      const [settingsRes, slotsRes, locationsRes] = await Promise.all([
        ordersAPI.getPreOrderSettings(truckId),
        ordersAPI.getPreOrderSlots(truckId),
        locationsAPI.getCalendar(truckId, {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
      ]);
      setSettings(settingsRes.data);
      setSlots(slotsRes.data);
      setUpcomingLocations(locationsRes.data.filter(l =>
        ['SCHEDULED', 'CONFIRMED'].includes(l.status)
      ));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await ordersAPI.updatePreOrderSettings(truckId, settings);
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSlots = async (truckLocationId) => {
    setGeneratingSlots(truckLocationId);
    try {
      await ordersAPI.generateSlots(truckId, { truckLocationId });
      toast.success('Time slots generated');
      loadData();
    } catch (error) {
      toast.error('Failed to generate slots');
    } finally {
      setGeneratingSlots(null);
    }
  };

  const toggleEnabled = () => {
    setSettings({ ...settings, isEnabled: !settings.isEnabled });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-400" />
            Pre-Order Settings
          </h3>
          <button
            onClick={toggleEnabled}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              settings?.isEnabled
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {settings?.isEnabled ? (
              <>
                <ToggleRight className="h-4 w-4" />
                Enabled
              </>
            ) : (
              <>
                <ToggleLeft className="h-4 w-4" />
                Disabled
              </>
            )}
          </button>
        </div>

        {settings && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Slot Duration (minutes)
              </label>
              <select
                value={settings.defaultSlotDuration}
                onChange={(e) => setSettings({ ...settings, defaultSlotDuration: parseInt(e.target.value) })}
                className="input"
              >
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>

            <div>
              <label className="label flex items-center gap-1">
                <Users className="h-4 w-4" />
                Max Orders Per Slot
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={settings.maxOrdersPerSlot}
                onChange={(e) => setSettings({ ...settings, maxOrdersPerSlot: parseInt(e.target.value) })}
                className="input"
              />
            </div>

            <div>
              <label className="label flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Advance Booking (hours)
              </label>
              <input
                type="number"
                min={1}
                max={168}
                value={settings.advanceBookingHours}
                onChange={(e) => setSettings({ ...settings, advanceBookingHours: parseInt(e.target.value) })}
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">How far in advance customers can order</p>
            </div>

            <div>
              <label className="label">Cutoff Time (minutes)</label>
              <input
                type="number"
                min={5}
                max={120}
                value={settings.cutoffMinutes}
                onChange={(e) => setSettings({ ...settings, cutoffMinutes: parseInt(e.target.value) })}
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum time before pickup to place order</p>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.autoGenerateSlots}
                  onChange={(e) => setSettings({ ...settings, autoGenerateSlots: e.target.checked })}
                  className="rounded"
                />
                <span>Auto-generate slots for new location bookings</span>
              </label>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Upcoming Locations */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4">Upcoming Locations</h3>
        <p className="text-sm text-gray-500 mb-4">
          Generate time slots for your upcoming location visits
        </p>

        {upcomingLocations.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No upcoming locations scheduled</p>
        ) : (
          <div className="space-y-3">
            {upcomingLocations.map(loc => {
              const existingSlots = slots.filter(s => s.truckLocationId === loc.id);
              return (
                <div
                  key={loc.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{loc.location?.name}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(loc.date), 'EEE, MMM d')} | {loc.startTime} - {loc.endTime}
                    </p>
                    {existingSlots.length > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        {existingSlots.length} slots generated
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleGenerateSlots(loc.id)}
                    disabled={generatingSlots === loc.id}
                    className="btn btn-secondary btn-sm"
                  >
                    {generatingSlots === loc.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : existingSlots.length > 0 ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Regenerate
                      </>
                    ) : (
                      'Generate Slots'
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Current Slots Overview */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4">Active Time Slots</h3>

        {slots.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No time slots created yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Location</th>
                  <th className="pb-2">Orders</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {slots.slice(0, 20).map(slot => (
                  <tr key={slot.id}>
                    <td className="py-2">{format(new Date(slot.date), 'MMM d')}</td>
                    <td className="py-2">{slot.slotStart} - {slot.slotEnd}</td>
                    <td className="py-2 text-sm">{slot.truckLocation?.location?.name}</td>
                    <td className="py-2">
                      <span className={`font-medium ${
                        slot.currentOrders >= slot.maxOrders ? 'text-red-600' : 'text-gray-700'
                      }`}>
                        {slot.currentOrders}/{slot.maxOrders}
                      </span>
                    </td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        !slot.isAvailable || slot.currentOrders >= slot.maxOrders
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {!slot.isAvailable ? 'Disabled' : slot.currentOrders >= slot.maxOrders ? 'Full' : 'Available'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {slots.length > 20 && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                And {slots.length - 20} more slots...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
