import { useState, useEffect } from 'react';
import { useTruck } from '../context/TruckContext';
import { permitsAPI } from '../services/api';
import { FileText, Plus, Edit2, Trash2, X, AlertTriangle, RefreshCw, Check } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

const permitTypes = ['HEALTH', 'BUSINESS', 'PARKING', 'FIRE', 'MOBILE_VENDOR', 'SPECIAL_EVENT'];

export default function Permits() {
  const { selectedTruck } = useTruck();
  const [permits, setPermits] = useState([]);
  const [alerts, setAlerts] = useState({ expired: [], expiringSoon: [], active: [] });
  const [loading, setLoading] = useState(true);
  const [showPermitModal, setShowPermitModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [editingPermit, setEditingPermit] = useState(null);
  const [selectedPermit, setSelectedPermit] = useState(null);
  const [permitForm, setPermitForm] = useState({ permitNumber: '', type: 'HEALTH', issuingAuthority: '', issueDate: '', expiryDate: '', cost: '', notes: '' });
  const [renewForm, setRenewForm] = useState({ newExpiryDate: '', newCost: '', newPermitNumber: '' });

  useEffect(() => {
    if (selectedTruck) loadData();
  }, [selectedTruck]);

  const loadData = async () => {
    try {
      const [permitsRes, alertsRes] = await Promise.all([
        permitsAPI.getByTruck(selectedTruck.id),
        permitsAPI.getAlerts(selectedTruck.id)
      ]);
      setPermits(permitsRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error('Failed to load permits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePermit = async (e) => {
    e.preventDefault();
    try {
      if (editingPermit) {
        await permitsAPI.update(editingPermit.id, permitForm);
        toast.success('Permit updated');
      } else {
        await permitsAPI.create({ ...permitForm, truckId: selectedTruck.id });
        toast.success('Permit added');
      }
      setShowPermitModal(false);
      setEditingPermit(null);
      loadData();
    } catch (error) {
      toast.error('Failed to save permit');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this permit?')) return;
    try {
      await permitsAPI.delete(id);
      toast.success('Permit deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete permit');
    }
  };

  const handleRenew = async (e) => {
    e.preventDefault();
    try {
      await permitsAPI.renew(selectedPermit.id, renewForm);
      toast.success('Permit renewed');
      setShowRenewModal(false);
      setSelectedPermit(null);
      loadData();
    } catch (error) {
      toast.error('Failed to renew permit');
    }
  };

  const openEditPermit = (permit) => {
    setEditingPermit(permit);
    setPermitForm({
      permitNumber: permit.permitNumber,
      type: permit.type,
      issuingAuthority: permit.issuingAuthority,
      issueDate: format(new Date(permit.issueDate), 'yyyy-MM-dd'),
      expiryDate: format(new Date(permit.expiryDate), 'yyyy-MM-dd'),
      cost: permit.cost?.toString() || '',
      notes: permit.notes || ''
    });
    setShowPermitModal(true);
  };

  const openRenewPermit = (permit) => {
    setSelectedPermit(permit);
    setRenewForm({
      newExpiryDate: '',
      newCost: permit.cost?.toString() || '',
      newPermitNumber: permit.permitNumber
    });
    setShowRenewModal(true);
  };

  const getStatusBadge = (permit) => {
    const daysUntilExpiry = differenceInDays(new Date(permit.expiryDate), new Date());
    if (daysUntilExpiry < 0) return <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">Expired</span>;
    if (daysUntilExpiry <= 30) return <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">Expiring Soon</span>;
    return <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Active</span>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Permits</h1>
        <button onClick={() => { setEditingPermit(null); setPermitForm({ permitNumber: '', type: 'HEALTH', issuingAuthority: '', issueDate: '', expiryDate: '', cost: '', notes: '' }); setShowPermitModal(true); }} className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" />Add Permit
        </button>
      </div>

      {/* Alerts */}
      {(alerts.expired?.length > 0 || alerts.expiringSoon?.length > 0) && (
        <div className="card bg-yellow-50 border-yellow-200 p-4">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle className="h-5 w-5 text-yellow-600" /><span className="font-semibold text-yellow-800">Permit Alerts</span></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.expired?.length > 0 && (
              <div className="bg-red-50 p-3 rounded-lg"><p className="text-sm font-medium text-red-800 mb-2">Expired ({alerts.expired.length})</p>
                {alerts.expired.map(p => <div key={p.id} className="text-sm text-red-700">{p.type} - Expired {format(new Date(p.expiryDate), 'MMM d')}</div>)}
              </div>
            )}
            {alerts.expiringSoon?.length > 0 && (
              <div className="bg-yellow-50 p-3 rounded-lg"><p className="text-sm font-medium text-yellow-800 mb-2">Expiring Soon ({alerts.expiringSoon.length})</p>
                {alerts.expiringSoon.map(p => <div key={p.id} className="text-sm text-yellow-700">{p.type} - Expires {format(new Date(p.expiryDate), 'MMM d')}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4"><p className="text-sm text-gray-500">Total Permits</p><p className="text-2xl font-bold">{permits.length}</p></div>
        <div className="card p-4"><p className="text-sm text-gray-500">Active</p><p className="text-2xl font-bold text-green-600">{alerts.active?.length || 0}</p></div>
        <div className="card p-4"><p className="text-sm text-gray-500">Expiring Soon</p><p className="text-2xl font-bold text-yellow-600">{alerts.expiringSoon?.length || 0}</p></div>
        <div className="card p-4"><p className="text-sm text-gray-500">Expired</p><p className="text-2xl font-bold text-red-600">{alerts.expired?.length || 0}</p></div>
      </div>

      {/* Permits List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {permits.map(permit => {
          const daysUntilExpiry = differenceInDays(new Date(permit.expiryDate), new Date());
          return (
            <div key={permit.id} className={`card p-4 ${daysUntilExpiry < 0 ? 'border-red-200 bg-red-50' : daysUntilExpiry <= 30 ? 'border-yellow-200 bg-yellow-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center"><FileText className="h-5 w-5 text-primary-600" /></div>
                  <div><h3 className="font-semibold">{permit.type.replace('_', ' ')}</h3><p className="text-xs text-gray-500">{permit.permitNumber}</p></div>
                </div>
                {getStatusBadge(permit)}
              </div>
              <div className="space-y-1 text-sm text-gray-600 mb-3">
                <p>Issuer: {permit.issuingAuthority}</p>
                <p>Issue Date: {format(new Date(permit.issueDate), 'MMM d, yyyy')}</p>
                <p className={daysUntilExpiry < 0 ? 'text-red-600 font-medium' : daysUntilExpiry <= 30 ? 'text-yellow-600 font-medium' : ''}>
                  Expiry: {format(new Date(permit.expiryDate), 'MMM d, yyyy')}
                  {daysUntilExpiry > 0 ? ` (${daysUntilExpiry} days)` : daysUntilExpiry === 0 ? ' (Today!)' : ` (${Math.abs(daysUntilExpiry)} days ago)`}
                </p>
                {permit.cost && <p>Cost: ${permit.cost.toFixed(2)}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => openRenewPermit(permit)} className="btn btn-primary flex-1 text-sm"><RefreshCw className="h-4 w-4 mr-1" />Renew</button>
                <button onClick={() => openEditPermit(permit)} className="btn btn-secondary text-sm"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(permit.id)} className="btn btn-danger text-sm"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          );
        })}
        {permits.length === 0 && (
          <div className="col-span-full text-center py-12"><FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No permits added yet</p></div>
        )}
      </div>

      {/* Permit Modal */}
      {showPermitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-semibold">{editingPermit ? 'Edit Permit' : 'Add Permit'}</h2><button onClick={() => setShowPermitModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleSavePermit} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Permit Type</label><select value={permitForm.type} onChange={e => setPermitForm({ ...permitForm, type: e.target.value })} className="input">{permitTypes.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}</select></div>
                <div><label className="label">Permit Number</label><input type="text" value={permitForm.permitNumber} onChange={e => setPermitForm({ ...permitForm, permitNumber: e.target.value })} className="input" required /></div>
              </div>
              <div><label className="label">Issuing Authority</label><input type="text" value={permitForm.issuingAuthority} onChange={e => setPermitForm({ ...permitForm, issuingAuthority: e.target.value })} className="input" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Issue Date</label><input type="date" value={permitForm.issueDate} onChange={e => setPermitForm({ ...permitForm, issueDate: e.target.value })} className="input" required /></div>
                <div><label className="label">Expiry Date</label><input type="date" value={permitForm.expiryDate} onChange={e => setPermitForm({ ...permitForm, expiryDate: e.target.value })} className="input" required /></div>
              </div>
              <div><label className="label">Cost ($)</label><input type="number" step="0.01" value={permitForm.cost} onChange={e => setPermitForm({ ...permitForm, cost: e.target.value })} className="input" /></div>
              <div><label className="label">Notes</label><textarea value={permitForm.notes} onChange={e => setPermitForm({ ...permitForm, notes: e.target.value })} className="input" rows={2} /></div>
              <div className="flex gap-3"><button type="button" onClick={() => setShowPermitModal(false)} className="btn btn-secondary flex-1">Cancel</button><button type="submit" className="btn btn-primary flex-1">{editingPermit ? 'Update' : 'Add'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      {showRenewModal && selectedPermit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-semibold">Renew Permit</h2><button onClick={() => setShowRenewModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleRenew} className="p-4 space-y-4">
              <p className="text-gray-600">Renewing: <strong>{selectedPermit.type.replace('_', ' ')}</strong></p>
              <div><label className="label">New Permit Number</label><input type="text" value={renewForm.newPermitNumber} onChange={e => setRenewForm({ ...renewForm, newPermitNumber: e.target.value })} className="input" /></div>
              <div><label className="label">New Expiry Date</label><input type="date" value={renewForm.newExpiryDate} onChange={e => setRenewForm({ ...renewForm, newExpiryDate: e.target.value })} className="input" required /></div>
              <div><label className="label">Renewal Cost ($)</label><input type="number" step="0.01" value={renewForm.newCost} onChange={e => setRenewForm({ ...renewForm, newCost: e.target.value })} className="input" /></div>
              <div className="flex gap-3"><button type="button" onClick={() => setShowRenewModal(false)} className="btn btn-secondary flex-1">Cancel</button><button type="submit" className="btn btn-primary flex-1">Renew Permit</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
