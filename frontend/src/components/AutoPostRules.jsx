import { useState, useEffect } from 'react';
import { useTruck } from '../context/TruckContext';
import { socialAPI } from '../services/api';
import { Zap, Plus, Edit2, Trash2, X, ToggleLeft, ToggleRight, MapPin, Calendar, Clock, Instagram, Facebook, Twitter } from 'lucide-react';
import toast from 'react-hot-toast';

const platforms = ['FACEBOOK', 'INSTAGRAM', 'TWITTER', 'TIKTOK'];

const triggerTypes = [
  {
    value: 'ARRIVAL_AT_LOCATION',
    label: 'Arrival at Location',
    description: 'Auto-post when you start broadcasting from a new location',
    icon: MapPin
  },
  {
    value: 'BOOKING_CONFIRMED',
    label: 'Booking Confirmed',
    description: 'Auto-post when a location booking is confirmed',
    icon: Calendar
  },
  {
    value: 'DAILY_SCHEDULE',
    label: 'Daily Schedule',
    description: 'Auto-post daily at a scheduled time',
    icon: Clock
  }
];

export default function AutoPostRules() {
  const { selectedTruck } = useTruck();
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState({
    triggerType: 'ARRIVAL_AT_LOCATION',
    platforms: ['INSTAGRAM'],
    templateId: '',
    delayMinutes: 0
  });

  useEffect(() => {
    if (selectedTruck) {
      loadData();
    }
  }, [selectedTruck]);

  const loadData = async () => {
    try {
      const [rulesRes, templatesRes] = await Promise.all([
        socialAPI.getAutoRules(selectedTruck.id),
        socialAPI.getTemplates(selectedTruck.id)
      ]);
      setRules(rulesRes.data);
      setTemplates(templatesRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingRule) {
        await socialAPI.updateAutoRule(editingRule.id, form);
        toast.success('Rule updated');
      } else {
        await socialAPI.createAutoRule(selectedTruck.id, form);
        toast.success('Rule created');
      }
      setShowModal(false);
      setEditingRule(null);
      loadData();
    } catch (error) {
      toast.error('Failed to save rule');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this automation rule?')) return;
    try {
      await socialAPI.deleteAutoRule(id);
      toast.success('Rule deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const handleToggle = async (rule) => {
    try {
      await socialAPI.toggleAutoRule(rule.id);
      toast.success(rule.isActive ? 'Rule paused' : 'Rule activated');
      loadData();
    } catch (error) {
      toast.error('Failed to toggle rule');
    }
  };

  const handleTriggerArrival = async () => {
    try {
      await socialAPI.triggerArrival(selectedTruck.id, {
        locationName: 'Test Location',
        address: '123 Test Street'
      });
      toast.success('Arrival posts triggered');
    } catch (error) {
      toast.error('Failed to trigger posts');
    }
  };

  const openEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      triggerType: rule.triggerType,
      platforms: rule.platforms || [],
      templateId: rule.templateId || '',
      delayMinutes: rule.delayMinutes || 0
    });
    setShowModal(true);
  };

  const openNew = () => {
    setEditingRule(null);
    setForm({
      triggerType: 'ARRIVAL_AT_LOCATION',
      platforms: ['INSTAGRAM'],
      templateId: '',
      delayMinutes: 0
    });
    setShowModal(true);
  };

  const togglePlatform = (platform) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'INSTAGRAM': return <Instagram className="h-4 w-4" />;
      case 'FACEBOOK': return <Facebook className="h-4 w-4" />;
      case 'TWITTER': return <Twitter className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getTriggerInfo = (type) => {
    return triggerTypes.find(t => t.value === type) || triggerTypes[0];
  };

  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Automation Rules</h2>
          <p className="text-sm text-gray-500">Set up automatic posting based on triggers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleTriggerArrival} className="btn btn-secondary">
            Test Arrival
          </button>
          <button onClick={openNew} className="btn btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {rules.map(rule => {
          const trigger = getTriggerInfo(rule.triggerType);
          const TriggerIcon = trigger.icon;

          return (
            <div key={rule.id} className={`card p-4 ${!rule.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${rule.isActive ? 'bg-primary-100' : 'bg-gray-100'}`}>
                    <TriggerIcon className={`h-6 w-6 ${rule.isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                  </div>

                  <div>
                    <h3 className="font-medium flex items-center gap-2">
                      {trigger.label}
                      {!rule.isActive && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">Paused</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">{trigger.description}</p>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {(rule.platforms || []).map(platform => (
                        <span key={platform} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {getPlatformIcon(platform)}
                          {platform}
                        </span>
                      ))}
                    </div>

                    {rule.template && (
                      <p className="text-xs text-gray-500">
                        Using template: <span className="font-medium">{rule.template.name}</span>
                      </p>
                    )}

                    {rule.delayMinutes > 0 && (
                      <p className="text-xs text-gray-500">
                        Delay: {rule.delayMinutes} minutes
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(rule)}
                    className={`p-2 rounded-lg ${rule.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}
                    title={rule.isActive ? 'Pause rule' : 'Activate rule'}
                  >
                    {rule.isActive ? (
                      <ToggleRight className="h-6 w-6" />
                    ) : (
                      <ToggleLeft className="h-6 w-6" />
                    )}
                  </button>
                  <button onClick={() => openEdit(rule)} className="p-2 hover:bg-gray-100 rounded">
                    <Edit2 className="h-4 w-4 text-gray-400" />
                  </button>
                  <button onClick={() => handleDelete(rule.id)} className="p-2 hover:bg-gray-100 rounded">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {rules.length === 0 && (
          <div className="card p-8 text-center">
            <Zap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No automation rules set up yet</p>
            <button onClick={openNew} className="btn btn-primary">
              Create Your First Rule
            </button>
          </div>
        )}
      </div>

      {/* Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="label">Trigger Type</label>
                <div className="space-y-2">
                  {triggerTypes.map(trigger => {
                    const TriggerIcon = trigger.icon;
                    return (
                      <label
                        key={trigger.value}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
                          form.triggerType === trigger.value
                            ? 'bg-primary-50 border-primary-300'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="triggerType"
                          value={trigger.value}
                          checked={form.triggerType === trigger.value}
                          onChange={e => setForm({ ...form, triggerType: e.target.value })}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <TriggerIcon className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{trigger.label}</span>
                          </div>
                          <p className="text-sm text-gray-500">{trigger.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label">Post to Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {platforms.map(platform => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${
                        form.platforms.includes(platform)
                          ? 'bg-primary-50 border-primary-300 text-primary-700'
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      {getPlatformIcon(platform)}
                      {platform}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Use Template (Optional)</label>
                <select
                  value={form.templateId}
                  onChange={e => setForm({ ...form, templateId: e.target.value })}
                  className="input"
                >
                  <option value="">Use default content</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.type.replace(/_/g, ' ')})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Delay (minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={form.delayMinutes}
                  onChange={e => setForm({ ...form, delayMinutes: parseInt(e.target.value) || 0 })}
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Set to 0 for immediate posting, or add a delay to review before publishing
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
