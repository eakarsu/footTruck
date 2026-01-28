import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ordersAPI, menusAPI } from '../services/api';
import { Clock, MapPin, ShoppingCart, Plus, Minus, Check, Search } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import TimeSlotPicker from '../components/TimeSlotPicker';

export default function PreOrder() {
  const { truckId: paramTruckId } = useParams();
  const [searchParams] = useSearchParams();
  const truckId = paramTruckId || searchParams.get('truck');

  const [step, setStep] = useState(1); // 1: Select Slot, 2: Select Items, 3: Customer Info, 4: Confirmation
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [orderResult, setOrderResult] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackedOrder, setTrackedOrder] = useState(null);

  useEffect(() => {
    if (truckId) {
      loadSlots();
      loadMenu();
    }
  }, [truckId]);

  const loadSlots = async () => {
    try {
      const res = await ordersAPI.getPublicSlots(truckId);
      setSlots(res.data);
    } catch (error) {
      console.error('Failed to load slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMenu = async () => {
    try {
      const res = await menusAPI.getPublicItems(truckId);
      setMenuItems(res.data || []);
    } catch (error) {
      console.error('Failed to load menu:', error);
    }
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setStep(2);
  };

  const addToCart = (item) => {
    const existing = cart.find(c => c.menuItemId === item.id);
    if (existing) {
      setCart(cart.map(c =>
        c.menuItemId === item.id
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      setCart([...cart, {
        menuItemId: item.id,
        name: item.name,
        price: item.isSpecial && item.specialPrice ? item.specialPrice : item.price,
        quantity: 1
      }]);
    }
  };

  const removeFromCart = (itemId) => {
    const existing = cart.find(c => c.menuItemId === itemId);
    if (existing && existing.quantity > 1) {
      setCart(cart.map(c =>
        c.menuItemId === itemId
          ? { ...c, quantity: c.quantity - 1 }
          : c
      ));
    } else {
      setCart(cart.filter(c => c.menuItemId !== itemId));
    }
  };

  const getCartTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.08;
    return { subtotal, tax, total: subtotal + tax };
  };

  const handleSubmitOrder = async () => {
    if (!customerInfo.name || (!customerInfo.phone && !customerInfo.email)) {
      toast.error('Please provide your name and contact information');
      return;
    }

    try {
      setLoading(true);
      const res = await ordersAPI.createPreOrder({
        truckId,
        slotId: selectedSlot.id,
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
        items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
        notes: customerInfo.notes
      });
      setOrderResult(res.data);
      setStep(4);
      toast.success('Order placed successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackOrder = async () => {
    if (!trackingNumber) {
      toast.error('Please enter your order number');
      return;
    }

    try {
      const res = await ordersAPI.trackOrder(trackingNumber);
      setTrackedOrder(res.data);
    } catch (error) {
      toast.error('Order not found');
      setTrackedOrder(null);
    }
  };

  const { subtotal, tax, total } = getCartTotal();

  if (!truckId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-6">Track Your Order</h1>
          <div className="card p-6">
            <label className="label">Order Number</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                placeholder="FT-XXXXX-XXX"
                className="input flex-1"
              />
              <button onClick={handleTrackOrder} className="btn btn-primary">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          {trackedOrder && (
            <div className="card p-6 mt-4">
              <h2 className="font-semibold mb-4">Order {trackedOrder.orderNumber}</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-medium px-2 py-0.5 rounded-full text-sm ${
                    trackedOrder.status === 'READY' ? 'bg-green-100 text-green-700' :
                    trackedOrder.status === 'PREPARING' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {trackedOrder.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pickup Time</span>
                  <span>{trackedOrder.scheduledPickup && format(new Date(trackedOrder.scheduledPickup), 'h:mm a')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Location</span>
                  <span>{trackedOrder.pickupWindow?.truckLocation?.location?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total</span>
                  <span className="font-bold">${trackedOrder.total?.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <p className="text-sm text-gray-500 mb-2">Items:</p>
                  {trackedOrder.items?.map((item, idx) => (
                    <p key={idx} className="text-sm">{item.quantity}x {item.menuItem?.name}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading && slots.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Steps */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {['Select Time', 'Choose Items', 'Your Info', 'Confirmation'].map((label, idx) => (
              <div key={idx} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step > idx + 1 ? 'bg-green-500 text-white' :
                  step === idx + 1 ? 'bg-primary-600 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {step > idx + 1 ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span className={`ml-2 text-sm hidden sm:block ${step === idx + 1 ? 'font-medium' : 'text-gray-500'}`}>
                  {label}
                </span>
                {idx < 3 && <div className={`w-8 sm:w-16 h-0.5 mx-2 ${step > idx + 1 ? 'bg-green-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4">
        {/* Step 1: Select Time Slot */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Choose a Pickup Time</h2>
            {slots.length === 0 ? (
              <div className="card p-8 text-center text-gray-500">
                No available time slots at the moment
              </div>
            ) : (
              <TimeSlotPicker
                slots={slots}
                selectedSlot={selectedSlot}
                onSelect={handleSlotSelect}
              />
            )}
          </div>
        )}

        {/* Step 2: Select Menu Items */}
        {step === 2 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Choose Your Items</h2>
              <button onClick={() => setStep(1)} className="text-primary-600 text-sm">
                Change Time
              </button>
            </div>

            {/* Selected Slot Info */}
            <div className="card p-3 mb-4 bg-primary-50 border-primary-200">
              <div className="flex items-center gap-2 text-primary-700">
                <Clock className="h-4 w-4" />
                <span className="font-medium">
                  {format(new Date(selectedSlot.date), 'EEE, MMM d')} at {selectedSlot.slotStart}
                </span>
                <span className="mx-2">|</span>
                <MapPin className="h-4 w-4" />
                <span>{selectedSlot.location?.name}</span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-3">
              {menuItems.map(item => {
                const inCart = cart.find(c => c.menuItemId === item.id);
                return (
                  <div key={item.id} className="card p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-medium">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-gray-500">{item.description}</p>
                      )}
                      <p className="font-bold text-primary-600 mt-1">
                        ${(item.isSpecial && item.specialPrice ? item.specialPrice : item.price).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {inCart ? (
                        <>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{inCart.quantity}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="p-2 bg-primary-100 rounded-full hover:bg-primary-200 text-primary-600"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="btn btn-primary btn-sm"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{cart.reduce((sum, c) => sum + c.quantity, 0)} items</p>
                    <p className="font-bold">${total.toFixed(2)}</p>
                  </div>
                  <button onClick={() => setStep(3)} className="btn btn-primary">
                    Continue <ShoppingCart className="h-4 w-4 ml-2" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Customer Info */}
        {step === 3 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Your Information</h2>
              <button onClick={() => setStep(2)} className="text-primary-600 text-sm">
                Edit Order
              </button>
            </div>

            <div className="card p-6 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={customerInfo.name}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                  className="input"
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  value={customerInfo.phone}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                  className="input"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={customerInfo.email}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                  className="input"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="label">Special Instructions</label>
                <textarea
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Any allergies or special requests?"
                />
              </div>
            </div>

            {/* Order Summary */}
            <div className="card p-6 mt-4">
              <h3 className="font-semibold mb-3">Order Summary</h3>
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.menuItemId} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-2">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={loading}
                className="btn btn-primary w-full mt-4"
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && orderResult && (
          <div className="card p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Order Confirmed!</h2>
            <p className="text-gray-500 mb-6">Your order has been placed successfully</p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500">Order Number</p>
              <p className="text-2xl font-mono font-bold">{orderResult.orderNumber}</p>
            </div>

            <div className="text-left space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                <span>Pickup: {format(new Date(orderResult.scheduledPickup), 'EEE, MMM d \'at\' h:mm a')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-400" />
                <span>{selectedSlot.location?.name}</span>
              </div>
            </div>

            <p className="text-sm text-gray-500 mt-6">
              We'll send you a reminder when your order is ready!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
