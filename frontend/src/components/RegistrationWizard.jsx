import { useState, useEffect } from 'react';
import { useTruck } from '../context/TruckContext';
import { eventsAPI } from '../services/api';
import { X, ChevronRight, ChevronLeft, Calendar, MapPin, Users, DollarSign, Grid3X3, FileText, CreditCard, Check } from 'lucide-react';
import { format } from 'date-fns';
import BoothMap from './BoothMap';
import toast from 'react-hot-toast';

const steps = [
  { id: 'details', label: 'Event Details', icon: Calendar },
  { id: 'booth', label: 'Select Booth', icon: Grid3X3 },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'confirm', label: 'Confirm', icon: Check }
];

export default function RegistrationWizard({ event, onClose, onSuccess }) {
  const { selectedTruck } = useTruck();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [booths, setBooths] = useState([]);
  const [form, setForm] = useState({
    selectedBooth: null,
    notes: '',
    documents: {},
    agreedToTerms: false
  });

  useEffect(() => {
    if (event?.id) {
      loadBooths();
    }
  }, [event]);

  const loadBooths = async () => {
    try {
      const res = await eventsAPI.getBooths(event.id);
      setBooths(res.data);
    } catch (error) {
      console.error('Failed to load booths:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Register for event
      const regRes = await eventsAPI.register(event.id, {
        truckId: selectedTruck.id,
        notes: form.notes
      });

      // Assign booth if selected
      if (form.selectedBooth) {
        await eventsAPI.assignBooth(regRes.data.id, form.selectedBooth.id);
      }

      toast.success('Successfully registered for event!');
      onSuccess?.(regRes.data);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (steps[currentStep].id) {
      case 'details':
        return true;
      case 'booth':
        return booths.length === 0 || form.selectedBooth !== null;
      case 'documents':
        return true; // Optional step
      case 'payment':
        return true; // Payment processed separately
      case 'confirm':
        return form.agreedToTerms;
      default:
        return true;
    }
  };

  const availableBooths = booths.filter(b => b.isAvailable);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Register for Event</h2>
            <p className="text-sm text-gray-500">{event.name}</p>
          </div>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center ${index > 0 ? 'flex-1' : ''}`}>
                    {index > 0 && (
                      <div className={`h-0.5 w-8 sm:w-16 ${isCompleted ? 'bg-primary-500' : 'bg-gray-300'}`} />
                    )}
                    <div className={`flex flex-col items-center ${index > 0 ? 'ml-2' : ''}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive
                          ? 'bg-primary-500 text-white'
                          : isCompleted
                            ? 'bg-primary-100 text-primary-600'
                            : 'bg-gray-200 text-gray-500'
                      }`}>
                        {isCompleted ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <StepIcon className="h-5 w-5" />
                        )}
                      </div>
                      <span className={`text-xs mt-1 hidden sm:block ${isActive ? 'font-medium' : 'text-gray-500'}`}>
                        {step.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Event Details */}
          {steps[currentStep].id === 'details' && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">{event.name}</h3>
                {event.description && (
                  <p className="text-gray-600 mb-4">{event.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">Date</p>
                      <p className="text-gray-600">
                        {format(new Date(event.startDate), 'MMM d, yyyy')}
                        {event.endDate !== event.startDate && ` - ${format(new Date(event.endDate), 'MMM d')}`}
                      </p>
                    </div>
                  </div>

                  {event.venueAddress && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-gray-600">{event.venueAddress}</p>
                      </div>
                    </div>
                  )}

                  {event.expectedAttendance && (
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Expected Attendance</p>
                        <p className="text-gray-600">{event.expectedAttendance.toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {event.vendorFee && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">Vendor Fee</p>
                        <p className="text-gray-600">${event.vendorFee}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="label">Registering as</label>
                <div className="p-4 bg-primary-50 rounded-lg">
                  <p className="font-medium text-primary-900">{selectedTruck?.name}</p>
                  {selectedTruck?.cuisineType && (
                    <p className="text-sm text-primary-700">{selectedTruck.cuisineType}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="label">Notes for Organizer (Optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Any special requirements or notes..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Booth Selection */}
          {steps[currentStep].id === 'booth' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Select Your Booth</h3>
                  <p className="text-sm text-gray-500">
                    {availableBooths.length} of {booths.length} booths available
                  </p>
                </div>
              </div>

              {booths.length > 0 ? (
                <BoothMap
                  eventId={event.id}
                  selectedBoothId={form.selectedBooth?.id}
                  onSelectBooth={(booth) => setForm({ ...form, selectedBooth: booth })}
                />
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Grid3X3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No booth selection required for this event</p>
                  <p className="text-sm text-gray-400">You'll be assigned a spot by the organizer</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Documents */}
          {steps[currentStep].id === 'documents' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Required Documents</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Upload any required documents for the event organizer
                </p>
              </div>

              <div className="space-y-3">
                {['Business License', 'Health Permit', 'Insurance Certificate'].map(doc => (
                  <div key={doc} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <span>{doc}</span>
                    </div>
                    <button className="btn btn-secondary text-sm">
                      Upload
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-sm text-gray-500">
                Documents can also be submitted after registration
              </p>
            </div>
          )}

          {/* Step 4: Payment */}
          {steps[currentStep].id === 'payment' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Payment Summary</h3>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span>Vendor Fee</span>
                  <span>${event.vendorFee || 0}</span>
                </div>
                {form.selectedBooth?.price && (
                  <div className="flex justify-between">
                    <span>Booth ({form.selectedBooth.boothNumber})</span>
                    <span>${form.selectedBooth.price}</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${(event.vendorFee || 0) + (form.selectedBooth?.price || 0)}</span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Payment will be collected by the event organizer. You may be contacted with payment instructions after registration approval.
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Confirm */}
          {steps[currentStep].id === 'confirm' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4">Review Your Registration</h3>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Event</h4>
                  <p>{event.name}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(event.startDate), 'MMM d, yyyy')}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Food Truck</h4>
                  <p>{selectedTruck?.name}</p>
                </div>

                {form.selectedBooth && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Selected Booth</h4>
                    <p>Booth {form.selectedBooth.boothNumber}</p>
                    {form.selectedBooth.price && (
                      <p className="text-sm text-gray-500">${form.selectedBooth.price}</p>
                    )}
                  </div>
                )}

                {form.notes && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm">{form.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <input
                  type="checkbox"
                  id="terms"
                  checked={form.agreedToTerms}
                  onChange={e => setForm({ ...form, agreedToTerms: e.target.checked })}
                  className="mt-1 rounded border-gray-300 text-primary-600"
                />
                <label htmlFor="terms" className="text-sm">
                  I agree to the event terms and conditions. I understand that my registration is subject to approval by the event organizer.
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between">
          <button
            onClick={currentStep === 0 ? onClose : handleBack}
            className="btn btn-secondary"
          >
            {currentStep === 0 ? 'Cancel' : (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </>
            )}
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="btn btn-primary"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || loading}
              className="btn btn-primary"
            >
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
