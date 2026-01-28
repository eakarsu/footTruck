import { useState, useEffect } from 'react';
import { useTruck } from '../context/TruckContext';
import { socialAPI } from '../services/api';
import { FileText, Plus, Edit2, Trash2, X, Copy, Check, Star, Instagram, Facebook, Twitter } from 'lucide-react';
import toast from 'react-hot-toast';

const platforms = ['FACEBOOK', 'INSTAGRAM', 'TWITTER', 'TIKTOK'];
const postTypes = [
  { value: 'LOCATION_ANNOUNCEMENT', label: 'Location Announcement' },
  { value: 'DAILY_MENU', label: 'Daily Menu' },
  { value: 'SPECIAL_PROMOTION', label: 'Special Promotion' },
  { value: 'PHOTO_SHARE', label: 'Photo Share' },
  { value: 'CUSTOMER_ENGAGEMENT', label: 'Customer Engagement' },
  { value: 'EVENT_ANNOUNCEMENT', label: 'Event Announcement' }
];

const templateVariables = [
  { name: 'truckName', description: 'Your truck name' },
  { name: 'locationName', description: 'Current location name' },
  { name: 'address', description: 'Full address' },
  { name: 'date', description: 'Formatted date' },
  { name: 'startTime', description: 'Start time' },
  { name: 'endTime', description: 'End time' },
  { name: 'cuisineType', description: 'Your cuisine type' },
  { name: 'specialItem', description: 'Featured item' }
];

const defaultTemplates = {
  LOCATION_ANNOUNCEMENT: `Find {{truckName}} today at {{locationName}}!

{{date}}
{{startTime}} - {{endTime}}
{{address}}

Come hungry!`,
  ARRIVAL_AT_LOCATION: `{{truckName}} just arrived at {{locationName}}!

{{address}}

Come grab your favorite food while we're here!`,
  DAILY_MENU: `Good morning! {{truckName}} is serving up delicious {{cuisineType}} today!

Check out our menu and find us at {{locationName}}.`,
  SPECIAL_PROMOTION: `SPECIAL OFFER from {{truckName}}!

Visit us at {{locationName}} to take advantage of this limited-time deal!`
};

export default function SocialTemplateEditor() {
  const { selectedTruck } = useTruck();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [copiedVar, setCopiedVar] = useState(null);
  const [form, setForm] = useState({
    name: '',
    type: 'LOCATION_ANNOUNCEMENT',
    template: '',
    platforms: ['INSTAGRAM'],
    isDefault: false
  });

  useEffect(() => {
    if (selectedTruck) loadTemplates();
  }, [selectedTruck]);

  const loadTemplates = async () => {
    try {
      const res = await socialAPI.getTemplates(selectedTruck.id);
      setTemplates(res.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await socialAPI.updateTemplate(editingTemplate.id, form);
        toast.success('Template updated');
      } else {
        await socialAPI.createTemplate(selectedTruck.id, form);
        toast.success('Template created');
      }
      setShowModal(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await socialAPI.deleteTemplate(id);
      toast.success('Template deleted');
      loadTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const openEdit = (template) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      type: template.type,
      template: template.template,
      platforms: template.platforms || [],
      isDefault: template.isDefault
    });
    setShowModal(true);
  };

  const openNew = (type = 'LOCATION_ANNOUNCEMENT') => {
    setEditingTemplate(null);
    setForm({
      name: '',
      type,
      template: defaultTemplates[type] || '',
      platforms: ['INSTAGRAM'],
      isDefault: false
    });
    setShowModal(true);
  };

  const copyVariable = (varName) => {
    navigator.clipboard.writeText(`{{${varName}}}`);
    setCopiedVar(varName);
    setTimeout(() => setCopiedVar(null), 2000);
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
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Post Templates</h2>
          <p className="text-sm text-gray-500">Create reusable templates for your social media posts</p>
        </div>
        <button onClick={() => openNew()} className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </button>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(template => (
          <div key={template.id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-600" />
                <div>
                  <h3 className="font-medium flex items-center gap-2">
                    {template.name}
                    {template.isDefault && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </h3>
                  <p className="text-xs text-gray-500">{template.type.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(template)} className="p-1 hover:bg-gray-100 rounded">
                  <Edit2 className="h-4 w-4 text-gray-400" />
                </button>
                <button onClick={() => handleDelete(template.id)} className="p-1 hover:bg-gray-100 rounded">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-4">{template.template}</p>
            </div>

            <div className="flex flex-wrap gap-1">
              {(template.platforms || []).map(platform => (
                <span key={platform} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs">
                  {getPlatformIcon(platform)}
                  {platform}
                </span>
              ))}
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-2 card p-8 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No templates created yet</p>
            <div className="flex flex-wrap justify-center gap-2">
              {Object.keys(defaultTemplates).map(type => (
                <button
                  key={type}
                  onClick={() => openNew(type)}
                  className="btn btn-secondary text-sm"
                >
                  Create {type.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Template Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="input"
                    placeholder="e.g., Morning Location Post"
                    required
                  />
                </div>
                <div>
                  <label className="label">Post Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({
                      ...form,
                      type: e.target.value,
                      template: form.template || defaultTemplates[e.target.value] || ''
                    })}
                    className="input"
                  >
                    {postTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Template Content</label>
                <textarea
                  value={form.template}
                  onChange={e => setForm({ ...form, template: e.target.value })}
                  className="input font-mono text-sm"
                  rows={8}
                  placeholder="Write your template content here..."
                  required
                />
              </div>

              {/* Variable Helper */}
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Available Variables</p>
                <div className="flex flex-wrap gap-2">
                  {templateVariables.map(v => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => copyVariable(v.name)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded text-xs hover:bg-gray-50"
                      title={v.description}
                    >
                      {copiedVar === v.name ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3 text-gray-400" />
                      )}
                      {`{{${v.name}}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Platforms</label>
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

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700">
                  Set as default template for this type
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
