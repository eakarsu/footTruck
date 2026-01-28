import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTruck } from '../context/TruckContext';
import { authAPI } from '../services/api';
import { Settings as SettingsIcon, User, Truck, Lock, Plus, Edit2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const [searchParams] = useSearchParams();
  const { user, updateUser } = useAuth();
  const { trucks, createTruck, updateTruck, deleteTruck } = useTruck();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [loading, setLoading] = useState(false);
  const [showTruckModal, setShowTruckModal] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [truckForm, setTruckForm] = useState({ name: '', description: '', phone: '', email: '', cuisineType: '' });

  useEffect(() => {
    if (searchParams.get('tab')) {
      setActiveTab(searchParams.get('tab'));
    }
  }, [searchParams]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.updateProfile(profileForm);
      updateUser(res.data);
      toast.success('Profile updated');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      toast.success('Password changed');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTruck = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingTruck) {
        await updateTruck(editingTruck.id, truckForm);
        toast.success('Truck updated');
      } else {
        await createTruck(truckForm);
        toast.success('Truck created');
      }
      setShowTruckModal(false);
      setEditingTruck(null);
      setTruckForm({ name: '', description: '', phone: '', email: '', cuisineType: '' });
    } catch (error) {
      toast.error('Failed to save truck');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTruck = async (id) => {
    if (!confirm('Delete this truck? This will also delete all associated data.')) return;
    try {
      await deleteTruck(id);
      toast.success('Truck deleted');
    } catch (error) {
      toast.error('Failed to delete truck');
    }
  };

  const openEditTruck = (truck) => {
    setEditingTruck(truck);
    setTruckForm({
      name: truck.name,
      description: truck.description || '',
      phone: truck.phone || '',
      email: truck.email || '',
      cuisineType: truck.cuisineType || ''
    });
    setShowTruckModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8 text-gray-400" />
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="card p-2">
            <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${activeTab === 'profile' ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'}`}>
              <User className="h-5 w-5" />Profile
            </button>
            <button onClick={() => setActiveTab('trucks')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${activeTab === 'trucks' ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'}`}>
              <Truck className="h-5 w-5" />Trucks
            </button>
            <button onClick={() => setActiveTab('security')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${activeTab === 'security' ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50'}`}>
              <Lock className="h-5 w-5" />Security
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Profile */}
          {activeTab === 'profile' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-6">Profile Settings</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                <div>
                  <label className="label">Full Name</label>
                  <input type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="input" required />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input type="email" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} className="input" required />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* Trucks */}
          {activeTab === 'trucks' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">My Trucks</h2>
                <button onClick={() => { setEditingTruck(null); setTruckForm({ name: '', description: '', phone: '', email: '', cuisineType: '' }); setShowTruckModal(true); }} className="btn btn-primary">
                  <Plus className="h-4 w-4 mr-2" />Add Truck
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trucks.map(truck => (
                  <div key={truck.id} className="card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Truck className="h-6 w-6 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{truck.name}</h3>
                          {truck.cuisineType && <p className="text-sm text-gray-500">{truck.cuisineType}</p>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEditTruck(truck)} className="p-2 hover:bg-gray-100 rounded"><Edit2 className="h-4 w-4 text-gray-500" /></button>
                        <button onClick={() => handleDeleteTruck(truck.id)} className="p-2 hover:bg-gray-100 rounded"><Trash2 className="h-4 w-4 text-red-500" /></button>
                      </div>
                    </div>
                    {truck.description && <p className="text-sm text-gray-600 mb-2">{truck.description}</p>}
                    <div className="text-sm text-gray-500">
                      {truck.phone && <p>Phone: {truck.phone}</p>}
                      {truck.email && <p>Email: {truck.email}</p>}
                    </div>
                  </div>
                ))}
                {trucks.length === 0 && (
                  <div className="col-span-full card p-8 text-center">
                    <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">No trucks yet</p>
                    <button onClick={() => setShowTruckModal(true)} className="btn btn-primary">Add Your First Truck</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-6">Change Password</h2>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="label">Current Password</label>
                  <input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="input" required />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="input" required minLength={6} />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="input" required />
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Truck Modal */}
      {showTruckModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">{editingTruck ? 'Edit Truck' : 'Add Truck'}</h2>
              <button onClick={() => setShowTruckModal(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveTruck} className="p-4 space-y-4">
              <div>
                <label className="label">Truck Name</label>
                <input type="text" value={truckForm.name} onChange={e => setTruckForm({ ...truckForm, name: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea value={truckForm.description} onChange={e => setTruckForm({ ...truckForm, description: e.target.value })} className="input" rows={2} />
              </div>
              <div>
                <label className="label">Cuisine Type</label>
                <input type="text" value={truckForm.cuisineType} onChange={e => setTruckForm({ ...truckForm, cuisineType: e.target.value })} className="input" placeholder="e.g., Mexican, BBQ, Fusion" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone</label>
                  <input type="tel" value={truckForm.phone} onChange={e => setTruckForm({ ...truckForm, phone: e.target.value })} className="input" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={truckForm.email} onChange={e => setTruckForm({ ...truckForm, email: e.target.value })} className="input" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowTruckModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary flex-1">{loading ? 'Saving...' : editingTruck ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
