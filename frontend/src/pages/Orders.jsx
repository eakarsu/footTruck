import { useState, useEffect } from 'react';
import { useTruck } from '../context/TruckContext';
import { ordersAPI, menusAPI } from '../services/api';
import {
  ShoppingCart, Plus, X, Clock, Check, ChefHat, Package,
  DollarSign, User, Phone, Mail, AlertCircle, Settings, Calendar, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-orange-100 text-orange-800',
  READY: 'bg-green-100 text-green-800',
  PICKED_UP: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800'
};

const statusIcons = {
  PENDING: Clock,
  CONFIRMED: Check,
  PREPARING: ChefHat,
  READY: Package,
  PICKED_UP: Check,
  CANCELLED: X
};

export default function Orders() {
  const { selectedTruck } = useTruck();
  const [orders, setOrders] = useState([]);
  const [queue, setQueue] = useState({ pending: [], confirmed: [], preparing: [], ready: [] });
  const [stats, setStats] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('queue');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderForm, setOrderForm] = useState({
    type: 'WALK_IN',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    items: [],
    notes: '',
    paymentMethod: 'CASH'
  });
  const [preOrderSettings, setPreOrderSettings] = useState(null);
  const [preOrderWindows, setPreOrderWindows] = useState([]);

  useEffect(() => {
    if (selectedTruck) {
      loadData();
      const interval = setInterval(loadQueue, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedTruck]);

  const loadData = async () => {
    try {
      const [queueRes, statsRes, ordersRes, itemsRes, settingsRes, windowsRes] = await Promise.all([
        ordersAPI.getQueue(selectedTruck.id),
        ordersAPI.getStats(selectedTruck.id),
        ordersAPI.getByTruck(selectedTruck.id),
        menusAPI.getItems(selectedTruck.id),
        ordersAPI.getPreOrderSettings(selectedTruck.id).catch(() => ({ data: null })),
        ordersAPI.getPreOrderSlots(selectedTruck.id).catch(() => ({ data: [] }))
      ]);
      setQueue(queueRes.data);
      setStats(statsRes.data);
      setOrders(ordersRes.data);
      setMenuItems(itemsRes.data);
      setPreOrderSettings(settingsRes.data);
      setPreOrderWindows(windowsRes.data || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQueue = async () => {
    try {
      const [queueRes, statsRes] = await Promise.all([
        ordersAPI.getQueue(selectedTruck.id),
        ordersAPI.getStats(selectedTruck.id)
      ]);
      setQueue(queueRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to refresh queue:', error);
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (orderForm.items.length === 0) {
      toast.error('Add at least one item');
      return;
    }
    try {
      await ordersAPI.create({
        truckId: selectedTruck.id,
        ...orderForm
      });
      toast.success('Order created');
      setShowOrderModal(false);
      setOrderForm({
        type: 'WALK_IN',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        items: [],
        notes: '',
        paymentMethod: 'CASH'
      });
      loadData();
    } catch (error) {
      toast.error('Failed to create order');
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await ordersAPI.updateStatus(orderId, newStatus);
      toast.success(`Order ${newStatus.toLowerCase().replace('_', ' ')}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await ordersAPI.cancel(orderId);
      toast.success('Order cancelled');
      loadData();
    } catch (error) {
      toast.error('Failed to cancel order');
    }
  };

  const handlePayment = async (orderId) => {
    const tip = prompt('Enter tip amount (optional):', '0');
    if (tip === null) return;
    try {
      await ordersAPI.updatePayment(orderId, {
        paymentStatus: 'COMPLETED',
        tip: parseFloat(tip) || 0
      });
      toast.success('Payment recorded');
      loadData();
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const addItemToOrder = (item) => {
    const existingIndex = orderForm.items.findIndex(i => i.menuItemId === item.id);
    if (existingIndex >= 0) {
      const newItems = [...orderForm.items];
      newItems[existingIndex].quantity += 1;
      setOrderForm({ ...orderForm, items: newItems });
    } else {
      setOrderForm({
        ...orderForm,
        items: [...orderForm.items, { menuItemId: item.id, quantity: 1, name: item.name, price: item.price }]
      });
    }
  };

  const removeItemFromOrder = (index) => {
    const newItems = [...orderForm.items];
    newItems.splice(index, 1);
    setOrderForm({ ...orderForm, items: newItems });
  };

  const updateItemQuantity = (index, quantity) => {
    if (quantity < 1) return;
    const newItems = [...orderForm.items];
    newItems[index].quantity = quantity;
    setOrderForm({ ...orderForm, items: newItems });
  };

  const orderTotal = orderForm.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const getNextStatus = (currentStatus) => {
    const flow = {
      PENDING: 'CONFIRMED',
      CONFIRMED: 'PREPARING',
      PREPARING: 'READY',
      READY: 'PICKED_UP'
    };
    return flow[currentStatus];
  };

  const renderOrderCard = (order, showActions = true) => {
    const StatusIcon = statusIcons[order.status] || Clock;
    const nextStatus = getNextStatus(order.status);

    return (
      <div key={order.id} className="card p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">#{order.orderNumber}</span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[order.status]}`}>
                {order.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {format(new Date(order.createdAt), 'h:mm a')}
              {order.customerName && ` - ${order.customerName}`}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">${order.total.toFixed(2)}</p>
            <span className={`text-xs ${
              order.paymentStatus === 'COMPLETED' ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {order.paymentStatus}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3 mb-3">
          {order.items?.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm py-1">
              <span>{item.quantity}x {item.menuItem?.name}</span>
              <span className="text-gray-500">${item.totalPrice.toFixed(2)}</span>
            </div>
          ))}
          {order.notes && (
            <p className="text-sm text-gray-500 mt-2 italic">Note: {order.notes}</p>
          )}
        </div>

        {showActions && order.status !== 'CANCELLED' && order.status !== 'PICKED_UP' && (
          <div className="flex gap-2">
            {nextStatus && (
              <button
                onClick={() => handleUpdateStatus(order.id, nextStatus)}
                className="btn btn-primary flex-1"
              >
                {nextStatus === 'CONFIRMED' && 'Confirm'}
                {nextStatus === 'PREPARING' && 'Start Preparing'}
                {nextStatus === 'READY' && 'Mark Ready'}
                {nextStatus === 'PICKED_UP' && 'Complete'}
              </button>
            )}
            {order.paymentStatus !== 'COMPLETED' && (
              <button
                onClick={() => handlePayment(order.id)}
                className="btn btn-success"
              >
                <DollarSign className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => handleCancelOrder(order.id)}
              className="btn btn-danger"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
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
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <button onClick={() => setShowOrderModal(true)} className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Today's Orders</p>
          <p className="text-2xl font-bold">{stats?.totalOrders || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Today's Revenue</p>
          <p className="text-2xl font-bold text-green-600">${(stats?.totalRevenue || 0).toFixed(2)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Avg Order Value</p>
          <p className="text-2xl font-bold">${(stats?.averageOrderValue || 0).toFixed(2)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">In Queue</p>
          <p className="text-2xl font-bold text-primary-600">{stats?.pendingOrders || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'queue'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Active Queue
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'all'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          All Orders
        </button>
        <button
          onClick={() => setActiveTab('preorder')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'preorder'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Pre-Order Settings
        </button>
      </div>

      {/* Queue View */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {['pending', 'confirmed', 'preparing', 'ready'].map(status => (
            <div key={status}>
              <h3 className="font-semibold mb-3 capitalize flex items-center gap-2">
                {status} <span className="text-sm text-gray-500">({queue[status]?.length || 0})</span>
              </h3>
              <div className="space-y-3">
                {queue[status]?.map(order => renderOrderCard(order))}
                {(!queue[status] || queue[status].length === 0) && (
                  <div className="text-center py-8 text-gray-400">No orders</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Orders */}
      {activeTab === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map(order => renderOrderCard(order, order.status !== 'PICKED_UP' && order.status !== 'CANCELLED'))}
          {orders.length === 0 && (
            <div className="col-span-full text-center py-12">
              <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No orders yet</p>
            </div>
          )}
        </div>
      )}

      {/* Pre-Order Settings */}
      {activeTab === 'preorder' && (
        <div className="space-y-6">
          {/* Settings Card */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Settings className="h-6 w-6 text-primary-600" />
                <h2 className="text-lg font-semibold">Pre-Order Settings</h2>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                preOrderSettings?.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {preOrderSettings?.isEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>

            {preOrderSettings ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Slot Duration</p>
                  <p className="text-xl font-bold">{preOrderSettings.defaultSlotDuration} min</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Max Orders/Slot</p>
                  <p className="text-xl font-bold">{preOrderSettings.maxOrdersPerSlot}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Advance Booking</p>
                  <p className="text-xl font-bold">{preOrderSettings.advanceBookingHours} hrs</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Cutoff Time</p>
                  <p className="text-xl font-bold">{preOrderSettings.cutoffMinutes} min</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Pre-order settings not configured</p>
            )}
          </div>

          {/* Customer Pre-Order Link */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <ExternalLink className="h-5 w-5 text-primary-600" />
              <h3 className="font-semibold">Customer Pre-Order Page</h3>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Share this link with customers so they can place pre-orders:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-gray-100 rounded-lg text-sm">
                {window.location.origin}/pre-order/{selectedTruck?.id}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/pre-order/${selectedTruck?.id}`);
                  toast.success('Link copied!');
                }}
                className="btn btn-secondary"
              >
                Copy
              </button>
              <a
                href={`/pre-order/${selectedTruck?.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                Preview
              </a>
            </div>
          </div>

          {/* Upcoming Time Slots */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-5 w-5 text-primary-600" />
              <h3 className="font-semibold">Upcoming Time Slots</h3>
            </div>
            {preOrderWindows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Time</th>
                      <th className="text-left py-2">Orders</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preOrderWindows.slice(0, 10).map(slot => (
                      <tr key={slot.id} className="border-b">
                        <td className="py-2">{format(new Date(slot.date), 'MMM d, yyyy')}</td>
                        <td className="py-2">{slot.slotStart} - {slot.slotEnd}</td>
                        <td className="py-2">{slot.currentOrders} / {slot.maxOrders}</td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            slot.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {slot.isAvailable ? 'Available' : 'Full'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No upcoming time slots configured</p>
            )}
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">New Order</h2>
              <button onClick={() => setShowOrderModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Menu Items */}
                <div>
                  <h3 className="font-semibold mb-3">Menu Items</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {menuItems.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addItemToOrder(item)}
                        disabled={item.isSoldOut}
                        className={`w-full p-3 text-left rounded-lg border ${
                          item.isSoldOut
                            ? 'bg-gray-100 cursor-not-allowed opacity-50'
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-primary-600">${item.price.toFixed(2)}</span>
                        </div>
                        {item.categoryName && (
                          <span className="text-xs text-gray-500">{item.categoryName}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Order Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-3">Order Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Order Type</label>
                        <select
                          value={orderForm.type}
                          onChange={e => setOrderForm({ ...orderForm, type: e.target.value })}
                          className="input"
                        >
                          <option value="WALK_IN">Walk-in</option>
                          <option value="MOBILE">Mobile Order</option>
                          <option value="PRE_ORDER">Pre-order</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Payment Method</label>
                        <select
                          value={orderForm.paymentMethod}
                          onChange={e => setOrderForm({ ...orderForm, paymentMethod: e.target.value })}
                          className="input"
                        >
                          <option value="CASH">Cash</option>
                          <option value="CREDIT_CARD">Credit Card</option>
                          <option value="DEBIT_CARD">Debit Card</option>
                          <option value="APPLE_PAY">Apple Pay</option>
                          <option value="GOOGLE_PAY">Google Pay</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="label">Customer Name</label>
                    <input
                      type="text"
                      value={orderForm.customerName}
                      onChange={e => setOrderForm({ ...orderForm, customerName: e.target.value })}
                      className="input"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Phone</label>
                      <input
                        type="tel"
                        value={orderForm.customerPhone}
                        onChange={e => setOrderForm({ ...orderForm, customerPhone: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input
                        type="email"
                        value={orderForm.customerEmail}
                        onChange={e => setOrderForm({ ...orderForm, customerEmail: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Notes</label>
                    <textarea
                      value={orderForm.notes}
                      onChange={e => setOrderForm({ ...orderForm, notes: e.target.value })}
                      className="input"
                      rows={2}
                    />
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="font-semibold mb-3">Order Items</h3>
                    {orderForm.items.length > 0 ? (
                      <div className="space-y-2">
                        {orderForm.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <span>{item.name}</span>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => updateItemQuantity(idx, item.quantity - 1)}
                                  className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center">{item.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateItemQuantity(idx, item.quantity + 1)}
                                  className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300"
                                >
                                  +
                                </button>
                              </div>
                              <span className="w-16 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                              <button
                                type="button"
                                onClick={() => removeItemFromOrder(idx)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-400">
                        Click items to add to order
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Subtotal</span>
                      <span>${orderTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Tax (8%)</span>
                      <span>${(orderTotal * 0.08).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold mt-2">
                      <span>Total</span>
                      <span className="text-primary-600">${(orderTotal * 1.08).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowOrderModal(false)} className="btn btn-secondary flex-1">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary flex-1">
                      Create Order
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
