import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { gpsAPI } from '../services/api';
import { useLocationSocket } from '../hooks/useLocationSocket';
import { MapPin, Navigation, Search, RefreshCw, Truck, Phone, Clock } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom truck icon
const truckIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#f97316" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#f97316"/>
      <path d="M7 12l3-3v2h4v2h-4v2l-3-3z" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// User location icon
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" width="24" height="24">
      <circle cx="12" cy="12" r="8" fill="#3b82f6"/>
      <circle cx="12" cy="12" r="4" fill="white"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

// Component to recenter map
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

export default function CustomerMap() {
  const [userLocation, setUserLocation] = useState(null);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [radius, setRadius] = useState(25);
  const [selectedTruck, setSelectedTruck] = useState(null);

  const handleLocationUpdate = useCallback((data) => {
    setTrucks(prev => {
      const existing = prev.findIndex(t => t.truckId === data.truckId);
      if (data.isActive === false) {
        return prev.filter(t => t.truckId !== data.truckId);
      }
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], ...data };
        return updated;
      }
      return prev;
    });
  }, []);

  const { connected, subscribeArea, subscribeTruck } = useLocationSocket({
    autoConnect: true,
    onLocationUpdate: handleLocationUpdate,
    onTruckNearby: (data) => {
      console.log('Truck nearby:', data);
    }
  });

  useEffect(() => {
    // Default to Austin, TX (where demo trucks are located)
    setUserLocation({ lat: 30.2672, lng: -97.7431 });
    setLoading(false);
    // Skip geolocation for demo - trucks are in Austin
    // getUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      loadNearbyTrucks();
      subscribeArea(userLocation.lat, userLocation.lng, radius);
    }
  }, [userLocation, radius]);

  const getUserLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported');
      setLoading(false);
      // Default to a location
      setUserLocation({ lat: 30.2672, lng: -97.7431 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLoading(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Unable to get your location. Showing default area.');
        // Default to NYC
        setUserLocation({ lat: 30.2672, lng: -97.7431 });
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const loadNearbyTrucks = async () => {
    if (!userLocation) return;

    console.log('Loading trucks near:', userLocation, 'radius:', radius);
    try {
      const res = await gpsAPI.getNearbyTrucks({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        radius
      });
      console.log('Trucks found:', res.data);
      setTrucks(res.data || []);

      // Subscribe to each truck's updates
      (res.data || []).forEach(truck => {
        subscribeTruck(truck.truckId);
      });
    } catch (error) {
      console.error('Failed to load trucks:', error);
      setTrucks([]);
    }
  };

  const getDirections = (truck) => {
    if (!userLocation) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${truck.latitude},${truck.longitude}&travelmode=driving`;
    window.open(url, '_blank');
  };

  if (loading && !userLocation) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Getting your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-primary-600" />
            <h1 className="text-lg font-bold">Find Food Trucks</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Radius selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Radius:</span>
              <select
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="text-sm border rounded-md px-2 py-1"
              >
                <option value={1}>1 mile</option>
                <option value={3}>3 miles</option>
                <option value={5}>5 miles</option>
                <option value={10}>10 miles</option>
                <option value={25}>25 miles</option>
              </select>
            </div>

            {/* Refresh button */}
            <button
              onClick={loadNearbyTrucks}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5 text-gray-500" />
            </button>

            {/* Connection status */}
            <div className={`flex items-center gap-1 text-sm ${connected ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              {connected ? 'Live' : 'Offline'}
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {error && (
          <div className="absolute top-4 left-4 right-4 z-[1000] bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-700">{error}</p>
          </div>
        )}

        {userLocation && (
          <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={13}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* User location marker */}
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>
                <div className="text-center">
                  <p className="font-medium">Your Location</p>
                </div>
              </Popup>
            </Marker>

            {/* Search radius circle */}
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={radius * 1609.34} // Convert miles to meters
              pathOptions={{
                color: '#f97316',
                fillColor: '#f97316',
                fillOpacity: 0.1
              }}
            />

            {/* Truck markers */}
            {trucks.map((truck) => (
              <Marker
                key={truck.truckId || truck.id}
                position={[truck.latitude, truck.longitude]}
                icon={truckIcon}
                eventHandlers={{
                  click: () => setSelectedTruck(truck)
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h3 className="font-bold text-lg">{truck.truck?.name}</h3>
                    {truck.truck?.cuisineType && (
                      <p className="text-sm text-gray-500 mb-2">{truck.truck.cuisineType}</p>
                    )}
                    <p className="text-sm text-gray-600 mb-3">
                      {truck.distance ? `${truck.distance.toFixed(1)} miles away` : 'Distance unknown'}
                    </p>
                    <button
                      onClick={() => getDirections(truck)}
                      className="w-full bg-primary-600 text-white px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                    >
                      <Navigation className="h-4 w-4" />
                      Get Directions
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            <RecenterMap center={userLocation ? [userLocation.lat, userLocation.lng] : null} />
          </MapContainer>
        )}

        {/* Truck list panel */}
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-lg max-h-[40%] overflow-hidden z-[1000]">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary-600" />
              Nearby Trucks ({trucks.length})
            </h2>
          </div>

          <div className="overflow-y-auto max-h-[calc(40vh-60px)]">
            {trucks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Truck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No food trucks found nearby</p>
                <p className="text-sm">Try increasing the search radius</p>
              </div>
            ) : (
              <div className="divide-y">
                {trucks.map((truck) => (
                  <div
                    key={truck.truckId || truck.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedTruck(truck)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{truck.truck?.name}</h3>
                        {truck.truck?.cuisineType && (
                          <p className="text-sm text-gray-500">{truck.truck.cuisineType}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {truck.distance ? `${truck.distance.toFixed(1)} mi` : '--'}
                          </span>
                          {truck.truck?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              {truck.truck.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          getDirections(truck);
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        <Navigation className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
