import { useState, useEffect, useRef } from 'react';
import { gpsAPI } from '../services/api';
import { useLocationSocket } from '../hooks/useLocationSocket';
import { MapPin, Navigation, Radio, WifiOff, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LocationBroadcaster({ truckId }) {
  const [broadcasting, setBroadcasting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);

  const { connected, broadcastLocation } = useLocationSocket({
    truckId,
    autoConnect: broadcasting
  });

  useEffect(() => {
    // Check current broadcast status on mount
    checkCurrentStatus();

    return () => {
      stopWatching();
    };
  }, [truckId]);

  const checkCurrentStatus = async () => {
    try {
      const res = await gpsAPI.getTruckLocation(truckId);
      if (res.data && res.data.isActive) {
        setBroadcasting(true);
        setCurrentLocation({
          latitude: res.data.latitude,
          longitude: res.data.longitude
        });
        setLastUpdate(new Date(res.data.lastUpdated));
      }
    } catch (error) {
      // Not broadcasting - that's fine
    }
  };

  const startBroadcasting = async () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    // Request location permission
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude, heading, speed } = position.coords;

      // Send initial location to server
      await gpsAPI.updateLocation(truckId, { latitude, longitude, heading, speed });

      setCurrentLocation({ latitude, longitude });
      setLastUpdate(new Date());
      setBroadcasting(true);
      toast.success('Started broadcasting location');

      // Start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        handlePositionError,
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 5000
        }
      );

      // Also send updates periodically (every 30 seconds)
      intervalRef.current = setInterval(sendPeriodicUpdate, 30000);
    } catch (err) {
      handlePositionError(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePositionUpdate = async (position) => {
    const { latitude, longitude, heading, speed } = position.coords;

    setCurrentLocation({ latitude, longitude });
    setLastUpdate(new Date());

    try {
      await gpsAPI.updateLocation(truckId, { latitude, longitude, heading, speed });

      // Also emit via WebSocket for real-time updates
      broadcastLocation({
        truckId,
        latitude,
        longitude,
        heading,
        speed
      });
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const sendPeriodicUpdate = async () => {
    if (currentLocation) {
      try {
        await gpsAPI.updateLocation(truckId, currentLocation);
      } catch (error) {
        console.error('Periodic update failed:', error);
      }
    }
  };

  const handlePositionError = (err) => {
    let message = 'Unable to get location';
    switch (err.code) {
      case err.PERMISSION_DENIED:
        message = 'Location permission denied. Please enable location access.';
        break;
      case err.POSITION_UNAVAILABLE:
        message = 'Location information unavailable';
        break;
      case err.TIMEOUT:
        message = 'Location request timed out';
        break;
    }
    setError(message);
    toast.error(message);
    setLoading(false);
  };

  const stopBroadcasting = async () => {
    setLoading(true);
    stopWatching();

    try {
      await gpsAPI.stopBroadcasting(truckId);
      setBroadcasting(false);
      setCurrentLocation(null);
      toast.success('Stopped broadcasting location');
    } catch (error) {
      toast.error('Failed to stop broadcasting');
    } finally {
      setLoading(false);
    }
  };

  const stopWatching = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const refreshLocation = async () => {
    if (!broadcasting) return;

    navigator.geolocation.getCurrentPosition(
      handlePositionUpdate,
      handlePositionError,
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${broadcasting ? 'bg-green-100' : 'bg-gray-100'}`}>
            {broadcasting ? (
              <Radio className="h-6 w-6 text-green-600" />
            ) : (
              <WifiOff className="h-6 w-6 text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="font-semibold">Location Broadcasting</h3>
            <p className="text-sm text-gray-500">
              {broadcasting ? 'Your location is being shared with customers' : 'Not broadcasting'}
            </p>
          </div>
        </div>

        {/* Connection Status */}
        {broadcasting && (
          <div className={`flex items-center gap-1 text-sm ${connected ? 'text-green-600' : 'text-yellow-600'}`}>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
            {connected ? 'Live' : 'Connecting...'}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {currentLocation && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Current Location</span>
            {broadcasting && (
              <button onClick={refreshLocation} className="ml-auto p-1 hover:bg-gray-200 rounded">
                <RefreshCw className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Latitude:</span>
              <span className="ml-2 font-mono">{currentLocation.latitude.toFixed(6)}</span>
            </div>
            <div>
              <span className="text-gray-500">Longitude:</span>
              <span className="ml-2 font-mono">{currentLocation.longitude.toFixed(6)}</span>
            </div>
          </div>
          {lastUpdate && (
            <p className="text-xs text-gray-400 mt-2">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        {!broadcasting ? (
          <button
            onClick={startBroadcasting}
            disabled={loading}
            className="btn btn-primary flex-1"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4 mr-2" />
            )}
            Start Broadcasting
          </button>
        ) : (
          <button
            onClick={stopBroadcasting}
            disabled={loading}
            className="btn bg-red-500 hover:bg-red-600 text-white flex-1"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <WifiOff className="h-4 w-4 mr-2" />
            )}
            Stop Broadcasting
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-4">
        When broadcasting, customers can see your real-time location on the map and get directions to find you.
      </p>
    </div>
  );
}
