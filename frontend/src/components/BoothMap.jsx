import { useState, useEffect } from 'react';
import { eventsAPI } from '../services/api';
import { Grid3X3, Check, X, Info, MapPin, DollarSign, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const sizeColors = {
  SMALL: 'bg-blue-100 border-blue-300',
  STANDARD: 'bg-green-100 border-green-300',
  LARGE: 'bg-purple-100 border-purple-300',
  PREMIUM: 'bg-amber-100 border-amber-300'
};

const sizeLabels = {
  SMALL: { label: 'S', full: 'Small' },
  STANDARD: { label: 'M', full: 'Standard' },
  LARGE: { label: 'L', full: 'Large' },
  PREMIUM: { label: 'P', full: 'Premium' }
};

export default function BoothMap({ eventId, selectedBoothId, onSelectBooth, readOnly = false }) {
  const [booths, setBooths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredBooth, setHoveredBooth] = useState(null);

  useEffect(() => {
    if (eventId) loadBooths();
  }, [eventId]);

  const loadBooths = async () => {
    try {
      const res = await eventsAPI.getBooths(eventId);
      setBooths(res.data);
    } catch (error) {
      console.error('Failed to load booths:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBoothClick = (booth) => {
    if (readOnly) return;
    if (!booth.isAvailable) {
      toast.error('This booth is already taken');
      return;
    }
    onSelectBooth?.(booth);
  };

  // Group booths by location/row for grid display
  const groupedBooths = booths.reduce((acc, booth) => {
    const row = booth.location || 'Main Area';
    if (!acc[row]) acc[row] = [];
    acc[row].push(booth);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (booths.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Grid3X3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No booths configured for this event</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded border-2 bg-white border-gray-300 flex items-center justify-center">
            <Check className="h-4 w-4 text-gray-400" />
          </div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded border-2 bg-red-100 border-red-300 flex items-center justify-center">
            <X className="h-4 w-4 text-red-500" />
          </div>
          <span>Taken</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded border-2 bg-primary-100 border-primary-500 flex items-center justify-center">
            <Check className="h-4 w-4 text-primary-600" />
          </div>
          <span>Selected</span>
        </div>
        <div className="border-l pl-4 flex gap-2">
          {Object.entries(sizeLabels).map(([size, { label, full }]) => (
            <div key={size} className="flex items-center gap-1">
              <div className={`w-5 h-5 rounded text-xs flex items-center justify-center font-medium ${sizeColors[size]}`}>
                {label}
              </div>
              <span className="text-xs text-gray-500">{full}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Booth Grid */}
      {Object.entries(groupedBooths).map(([area, areaBooths]) => (
        <div key={area} className="space-y-3">
          <h4 className="font-medium text-gray-700 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {area}
          </h4>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {areaBooths.map(booth => {
              const isSelected = booth.id === selectedBoothId;
              const isHovered = booth.id === hoveredBooth;

              return (
                <div
                  key={booth.id}
                  onClick={() => handleBoothClick(booth)}
                  onMouseEnter={() => setHoveredBooth(booth.id)}
                  onMouseLeave={() => setHoveredBooth(null)}
                  className={`
                    relative aspect-square rounded-lg border-2 cursor-pointer
                    transition-all duration-200 flex flex-col items-center justify-center
                    ${!booth.isAvailable
                      ? 'bg-red-50 border-red-300 cursor-not-allowed'
                      : isSelected
                        ? 'bg-primary-100 border-primary-500 ring-2 ring-primary-500 ring-offset-2'
                        : `${sizeColors[booth.size]} hover:ring-2 hover:ring-primary-300`
                    }
                  `}
                  title={`Booth ${booth.boothNumber}`}
                >
                  <span className="text-sm font-bold">{booth.boothNumber}</span>
                  <span className="text-xs text-gray-500">
                    {sizeLabels[booth.size]?.label || 'M'}
                  </span>

                  {!booth.isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-75 rounded-lg">
                      <X className="h-6 w-6 text-red-500" />
                    </div>
                  )}

                  {isSelected && booth.isAvailable && (
                    <div className="absolute -top-1 -right-1 bg-primary-500 rounded-full p-0.5">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}

                  {/* Hover Tooltip */}
                  {isHovered && (
                    <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-white rounded-lg shadow-lg border p-3">
                      <div className="font-medium mb-2">Booth {booth.boothNumber}</div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Grid3X3 className="h-3 w-3" />
                          <span>{sizeLabels[booth.size]?.full || 'Standard'} size</span>
                        </div>
                        {booth.price && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>${booth.price}</span>
                          </div>
                        )}
                        {booth.amenities?.length > 0 && (
                          <div className="flex items-start gap-1">
                            <Sparkles className="h-3 w-3 mt-0.5" />
                            <span>{booth.amenities.join(', ')}</span>
                          </div>
                        )}
                        {booth.registration?.truck && (
                          <div className="pt-1 border-t mt-1 text-red-600">
                            Assigned to: {booth.registration.truck.name}
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Selected Booth Details */}
      {selectedBoothId && (
        <div className="bg-primary-50 rounded-lg p-4">
          {(() => {
            const selectedBooth = booths.find(b => b.id === selectedBoothId);
            if (!selectedBooth) return null;

            return (
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-primary-900">
                    Selected: Booth {selectedBooth.boothNumber}
                  </h4>
                  <div className="text-sm text-primary-700 mt-1">
                    {sizeLabels[selectedBooth.size]?.full || 'Standard'} booth
                    {selectedBooth.price && ` - $${selectedBooth.price}`}
                  </div>
                  {selectedBooth.amenities?.length > 0 && (
                    <div className="text-sm text-primary-600 mt-1">
                      Includes: {selectedBooth.amenities.join(', ')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onSelectBooth?.(null)}
                  className="text-primary-600 hover:text-primary-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
