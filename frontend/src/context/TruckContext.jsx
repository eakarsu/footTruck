import { createContext, useContext, useState, useEffect } from 'react';
import { trucksAPI } from '../services/api';
import { useAuth } from './AuthContext';

const TruckContext = createContext(null);

export function TruckProvider({ children }) {
  const { user } = useAuth();
  const [trucks, setTrucks] = useState([]);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTrucks();
    } else {
      setTrucks([]);
      setSelectedTruck(null);
      setLoading(false);
    }
  }, [user]);

  const loadTrucks = async () => {
    try {
      const res = await trucksAPI.getAll();
      setTrucks(res.data);

      // Restore selected truck from localStorage
      const savedTruckId = localStorage.getItem('selectedTruck');
      if (savedTruckId) {
        const truck = res.data.find(t => t.id === savedTruckId);
        if (truck) {
          setSelectedTruck(truck);
        } else if (res.data.length > 0) {
          setSelectedTruck(res.data[0]);
          localStorage.setItem('selectedTruck', res.data[0].id);
        }
      } else if (res.data.length > 0) {
        setSelectedTruck(res.data[0]);
        localStorage.setItem('selectedTruck', res.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load trucks:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectTruck = (truck) => {
    setSelectedTruck(truck);
    localStorage.setItem('selectedTruck', truck.id);
  };

  const createTruck = async (data) => {
    const res = await trucksAPI.create(data);
    setTrucks(prev => [...prev, res.data]);
    if (!selectedTruck) {
      selectTruck(res.data);
    }
    return res.data;
  };

  const updateTruck = async (id, data) => {
    const res = await trucksAPI.update(id, data);
    setTrucks(prev => prev.map(t => t.id === id ? res.data : t));
    if (selectedTruck?.id === id) {
      setSelectedTruck(res.data);
    }
    return res.data;
  };

  const deleteTruck = async (id) => {
    await trucksAPI.delete(id);
    setTrucks(prev => prev.filter(t => t.id !== id));
    if (selectedTruck?.id === id) {
      const remaining = trucks.filter(t => t.id !== id);
      setSelectedTruck(remaining[0] || null);
      if (remaining[0]) {
        localStorage.setItem('selectedTruck', remaining[0].id);
      } else {
        localStorage.removeItem('selectedTruck');
      }
    }
  };

  return (
    <TruckContext.Provider value={{
      trucks,
      selectedTruck,
      loading,
      selectTruck,
      createTruck,
      updateTruck,
      deleteTruck,
      refreshTrucks: loadTrucks
    }}>
      {children}
    </TruckContext.Provider>
  );
}

export function useTruck() {
  const context = useContext(TruckContext);
  if (!context) {
    throw new Error('useTruck must be used within a TruckProvider');
  }
  return context;
}
