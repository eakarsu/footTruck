import { useState, useEffect } from 'react';
import { useTruck } from '../context/TruckContext';
import { inventoryAPI } from '../services/api';
import { Package, Plus, Edit2, Trash2, X, AlertTriangle, TrendingDown, Clipboard } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const categories = ['MEAT', 'PRODUCE', 'DAIRY', 'DRY_GOODS', 'BEVERAGES', 'CONDIMENTS', 'PACKAGING', 'CLEANING', 'OTHER'];

export default function Inventory() {
  const { selectedTruck } = useTruck();
  const [items, setItems] = useState([]);
  const [alerts, setAlerts] = useState({ lowStock: [], expiringSoon: [], expired: [] });
  const [prepLists, setPrepLists] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory');
  const [showItemModal, setShowItemModal] = useState(false);
  const [showPrepModal, setShowPrepModal] = useState(false);
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const [itemForm, setItemForm] = useState({
    name: '', category: 'OTHER', quantity: '', unit: '', minQuantity: '', maxQuantity: '', costPerUnit: '', supplier: '', expiryDate: '', notes: ''
  });
  const [prepForm, setPrepForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), notes: '', items: [{ name: '', quantity: '', unit: '' }] });
  const [supplyForm, setSupplyForm] = useState({ name: '', category: 'OTHER', quantity: '', unit: '', unitCost: '', supplier: '', expectedDelivery: '', notes: '' });
  const [wasteForm, setWasteForm] = useState({ quantity: '', unit: '', reason: 'SPOILED', cost: '', notes: '' });

  useEffect(() => {
    if (selectedTruck) loadData();
  }, [selectedTruck]);

  const loadData = async () => {
    try {
      const [itemsRes, alertsRes, prepRes, supplyRes] = await Promise.all([
        inventoryAPI.getByTruck(selectedTruck.id),
        inventoryAPI.getAlerts(selectedTruck.id),
        inventoryAPI.getPrepLists(selectedTruck.id),
        inventoryAPI.getSupplies(selectedTruck.id)
      ]);
      setItems(itemsRes.data);
      setAlerts(alertsRes.data);
      setPrepLists(prepRes.data);
      setSupplies(supplyRes.data);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await inventoryAPI.update(editingItem.id, itemForm);
        toast.success('Item updated');
      } else {
        await inventoryAPI.create({ ...itemForm, truckId: selectedTruck.id });
        toast.success('Item added');
      }
      setShowItemModal(false);
      setEditingItem(null);
      loadData();
    } catch (error) {
      toast.error('Failed to save item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Delete this inventory item?')) return;
    try {
      await inventoryAPI.delete(id);
      toast.success('Item deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleAdjustQuantity = async (item, adjustment) => {
    try {
      await inventoryAPI.adjust(item.id, { adjustment });
      toast.success('Quantity updated');
      loadData();
    } catch (error) {
      toast.error('Failed to adjust quantity');
    }
  };

  const handleSavePrep = async (e) => {
    e.preventDefault();
    try {
      await inventoryAPI.createPrepList({ ...prepForm, truckId: selectedTruck.id });
      toast.success('Prep list created');
      setShowPrepModal(false);
      setPrepForm({ date: format(new Date(), 'yyyy-MM-dd'), notes: '', items: [{ name: '', quantity: '', unit: '' }] });
      loadData();
    } catch (error) {
      toast.error('Failed to create prep list');
    }
  };

  const handleTogglePrepItem = async (itemId) => {
    try {
      await inventoryAPI.togglePrepItem(itemId, 'Staff');
      loadData();
    } catch (error) {
      toast.error('Failed to update prep item');
    }
  };

  const handleSaveSupply = async (e) => {
    e.preventDefault();
    try {
      await inventoryAPI.createSupply({ ...supplyForm, truckId: selectedTruck.id });
      toast.success('Supply order created');
      setShowSupplyModal(false);
      loadData();
    } catch (error) {
      toast.error('Failed to create supply order');
    }
  };

  const handleRecordWaste = async (e) => {
    e.preventDefault();
    try {
      await inventoryAPI.recordWaste({ ...wasteForm, inventoryItemId: selectedItem.id });
      toast.success('Waste recorded');
      setShowWasteModal(false);
      setSelectedItem(null);
      loadData();
    } catch (error) {
      toast.error('Failed to record waste');
    }
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      name: item.name, category: item.category, quantity: item.quantity.toString(),
      unit: item.unit, minQuantity: item.minQuantity.toString(),
      maxQuantity: item.maxQuantity?.toString() || '', costPerUnit: item.costPerUnit?.toString() || '',
      supplier: item.supplier || '', expiryDate: item.expiryDate ? format(new Date(item.expiryDate), 'yyyy-MM-dd') : '',
      notes: item.notes || ''
    });
    setShowItemModal(true);
  };

  const addPrepItem = () => {
    setPrepForm({ ...prepForm, items: [...prepForm.items, { name: '', quantity: '', unit: '' }] });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <div className="flex gap-2">
          <button onClick={() => { setShowPrepModal(true); }} className="btn btn-secondary"><Clipboard className="h-4 w-4 mr-2" />Prep List</button>
          <button onClick={() => { setShowSupplyModal(true); }} className="btn btn-secondary"><Package className="h-4 w-4 mr-2" />Order Supplies</button>
          <button onClick={() => { setEditingItem(null); setItemForm({ name: '', category: 'OTHER', quantity: '', unit: '', minQuantity: '', maxQuantity: '', costPerUnit: '', supplier: '', expiryDate: '', notes: '' }); setShowItemModal(true); }} className="btn btn-primary"><Plus className="h-4 w-4 mr-2" />Add Item</button>
        </div>
      </div>

      {/* Alerts */}
      {(alerts.lowStock?.length > 0 || alerts.expiringSoon?.length > 0) && (
        <div className="card bg-yellow-50 border-yellow-200 p-4">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle className="h-5 w-5 text-yellow-600" /><span className="font-semibold text-yellow-800">Alerts</span></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.lowStock?.length > 0 && (
              <div><p className="text-sm font-medium text-yellow-800 mb-2">Low Stock ({alerts.lowStock.length})</p>
                {alerts.lowStock.slice(0, 3).map(item => (
                  <div key={item.id} className="text-sm text-yellow-700">{item.name}: {item.quantity} {item.unit}</div>
                ))}
              </div>
            )}
            {alerts.expiringSoon?.length > 0 && (
              <div><p className="text-sm font-medium text-yellow-800 mb-2">Expiring Soon ({alerts.expiringSoon.length})</p>
                {alerts.expiringSoon.slice(0, 3).map(item => (
                  <div key={item.id} className="text-sm text-yellow-700">{item.name}: {format(new Date(item.expiryDate), 'MMM d')}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {['inventory', 'prep', 'supplies', 'waste'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 font-medium capitalize ${activeTab === tab ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>{tab === 'prep' ? 'Prep Lists' : tab}</button>
        ))}
      </div>

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Item</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Quantity</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><span className="font-medium">{item.name}</span></td>
                  <td className="px-4 py-3"><span className="text-sm text-gray-500">{item.category.replace('_', ' ')}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleAdjustQuantity(item, -1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200">-</button>
                      <span className="w-16 text-center">{item.quantity} {item.unit}</span>
                      <button onClick={() => handleAdjustQuantity(item, 1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200">+</button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.quantity <= item.minQuantity ? (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">Low Stock</span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">In Stock</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setSelectedItem(item); setWasteForm({ quantity: '', unit: item.unit, reason: 'SPOILED', cost: '', notes: '' }); setShowWasteModal(true); }} className="p-1.5 hover:bg-gray-100 rounded" title="Record Waste"><TrendingDown className="h-4 w-4 text-orange-500" /></button>
                    <button onClick={() => openEditItem(item)} className="p-1.5 hover:bg-gray-100 rounded"><Edit2 className="h-4 w-4 text-gray-500" /></button>
                    <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 hover:bg-gray-100 rounded"><Trash2 className="h-4 w-4 text-red-500" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <div className="p-8 text-center text-gray-500">No inventory items</div>}
        </div>
      )}

      {/* Prep Lists Tab */}
      {activeTab === 'prep' && (
        <div className="space-y-4">
          {prepLists.map(prep => (
            <div key={prep.id} className="card p-4">
              <div className="flex justify-between mb-3">
                <div><h3 className="font-semibold">{format(new Date(prep.date), 'MMM d, yyyy')}</h3><span className={`text-xs px-2 py-0.5 rounded-full ${prep.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : prep.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{prep.status}</span></div>
              </div>
              <div className="space-y-2">
                {prep.items?.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <input type="checkbox" checked={item.isCompleted} onChange={() => handleTogglePrepItem(item.id)} className="rounded" />
                    <span className={item.isCompleted ? 'line-through text-gray-400' : ''}>{item.quantity} {item.unit} {item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {prepLists.length === 0 && <div className="card p-8 text-center text-gray-500">No prep lists</div>}
        </div>
      )}

      {/* Supplies Tab */}
      {activeTab === 'supplies' && (
        <div className="space-y-4">
          {supplies.map(supply => (
            <div key={supply.id} className="card p-4 flex justify-between items-center">
              <div>
                <h3 className="font-semibold">{supply.name}</h3>
                <p className="text-sm text-gray-500">{supply.quantity} {supply.unit} from {supply.supplier}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">${supply.totalCost.toFixed(2)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${supply.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{supply.status}</span>
              </div>
            </div>
          ))}
          {supplies.length === 0 && <div className="card p-8 text-center text-gray-500">No supply orders</div>}
        </div>
      )}

      {/* Waste Tab */}
      {activeTab === 'waste' && (
        <div className="card p-8 text-center text-gray-500">
          <TrendingDown className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Click the waste icon on inventory items to record waste</p>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-semibold">{editingItem ? 'Edit Item' : 'Add Item'}</h2><button onClick={() => setShowItemModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleSaveItem} className="p-4 space-y-4">
              <div><label className="label">Name</label><input type="text" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} className="input" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Category</label><select value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })} className="input">{categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}</select></div>
                <div><label className="label">Unit</label><input type="text" value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} className="input" placeholder="lbs, count, etc" required /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Quantity</label><input type="number" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })} className="input" required /></div>
                <div><label className="label">Min Qty</label><input type="number" value={itemForm.minQuantity} onChange={e => setItemForm({ ...itemForm, minQuantity: e.target.value })} className="input" required /></div>
                <div><label className="label">Max Qty</label><input type="number" value={itemForm.maxQuantity} onChange={e => setItemForm({ ...itemForm, maxQuantity: e.target.value })} className="input" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Cost/Unit ($)</label><input type="number" step="0.01" value={itemForm.costPerUnit} onChange={e => setItemForm({ ...itemForm, costPerUnit: e.target.value })} className="input" /></div>
                <div><label className="label">Expiry Date</label><input type="date" value={itemForm.expiryDate} onChange={e => setItemForm({ ...itemForm, expiryDate: e.target.value })} className="input" /></div>
              </div>
              <div><label className="label">Supplier</label><input type="text" value={itemForm.supplier} onChange={e => setItemForm({ ...itemForm, supplier: e.target.value })} className="input" /></div>
              <div className="flex gap-3"><button type="button" onClick={() => setShowItemModal(false)} className="btn btn-secondary flex-1">Cancel</button><button type="submit" className="btn btn-primary flex-1">{editingItem ? 'Update' : 'Add'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Prep Modal */}
      {showPrepModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-semibold">Create Prep List</h2><button onClick={() => setShowPrepModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleSavePrep} className="p-4 space-y-4">
              <div><label className="label">Date</label><input type="date" value={prepForm.date} onChange={e => setPrepForm({ ...prepForm, date: e.target.value })} className="input" required /></div>
              <div><label className="label">Items</label>
                {prepForm.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input type="text" placeholder="Item name" value={item.name} onChange={e => { const items = [...prepForm.items]; items[idx].name = e.target.value; setPrepForm({ ...prepForm, items }); }} className="input flex-1" required />
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={e => { const items = [...prepForm.items]; items[idx].quantity = e.target.value; setPrepForm({ ...prepForm, items }); }} className="input w-20" required />
                    <input type="text" placeholder="Unit" value={item.unit} onChange={e => { const items = [...prepForm.items]; items[idx].unit = e.target.value; setPrepForm({ ...prepForm, items }); }} className="input w-20" required />
                  </div>
                ))}
                <button type="button" onClick={addPrepItem} className="text-primary-600 text-sm">+ Add Item</button>
              </div>
              <div className="flex gap-3"><button type="button" onClick={() => setShowPrepModal(false)} className="btn btn-secondary flex-1">Cancel</button><button type="submit" className="btn btn-primary flex-1">Create</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Supply Modal */}
      {showSupplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-semibold">Order Supplies</h2><button onClick={() => setShowSupplyModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleSaveSupply} className="p-4 space-y-4">
              <div><label className="label">Item Name</label><input type="text" value={supplyForm.name} onChange={e => setSupplyForm({ ...supplyForm, name: e.target.value })} className="input" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Category</label><select value={supplyForm.category} onChange={e => setSupplyForm({ ...supplyForm, category: e.target.value })} className="input">{categories.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}</select></div>
                <div><label className="label">Supplier</label><input type="text" value={supplyForm.supplier} onChange={e => setSupplyForm({ ...supplyForm, supplier: e.target.value })} className="input" required /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="label">Quantity</label><input type="number" value={supplyForm.quantity} onChange={e => setSupplyForm({ ...supplyForm, quantity: e.target.value })} className="input" required /></div>
                <div><label className="label">Unit</label><input type="text" value={supplyForm.unit} onChange={e => setSupplyForm({ ...supplyForm, unit: e.target.value })} className="input" required /></div>
                <div><label className="label">Unit Cost ($)</label><input type="number" step="0.01" value={supplyForm.unitCost} onChange={e => setSupplyForm({ ...supplyForm, unitCost: e.target.value })} className="input" required /></div>
              </div>
              <div className="flex gap-3"><button type="button" onClick={() => setShowSupplyModal(false)} className="btn btn-secondary flex-1">Cancel</button><button type="submit" className="btn btn-primary flex-1">Order</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Waste Modal */}
      {showWasteModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center"><h2 className="text-lg font-semibold">Record Waste - {selectedItem.name}</h2><button onClick={() => setShowWasteModal(false)}><X className="h-5 w-5" /></button></div>
            <form onSubmit={handleRecordWaste} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">Quantity</label><input type="number" value={wasteForm.quantity} onChange={e => setWasteForm({ ...wasteForm, quantity: e.target.value })} className="input" required /></div>
                <div><label className="label">Unit</label><input type="text" value={wasteForm.unit} onChange={e => setWasteForm({ ...wasteForm, unit: e.target.value })} className="input" required /></div>
              </div>
              <div><label className="label">Reason</label><select value={wasteForm.reason} onChange={e => setWasteForm({ ...wasteForm, reason: e.target.value })} className="input"><option value="EXPIRED">Expired</option><option value="SPOILED">Spoiled</option><option value="OVERCOOKED">Overcooked</option><option value="DROPPED">Dropped</option><option value="QUALITY_ISSUE">Quality Issue</option><option value="OTHER">Other</option></select></div>
              <div><label className="label">Cost ($)</label><input type="number" step="0.01" value={wasteForm.cost} onChange={e => setWasteForm({ ...wasteForm, cost: e.target.value })} className="input" /></div>
              <div className="flex gap-3"><button type="button" onClick={() => setShowWasteModal(false)} className="btn btn-secondary flex-1">Cancel</button><button type="submit" className="btn btn-primary flex-1">Record</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
