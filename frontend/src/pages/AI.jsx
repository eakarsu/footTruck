import { useState, useEffect } from 'react';
import { useTruck } from '../context/TruckContext';
import { aiAPI } from '../services/api';
import { Sparkles, MapPin, TrendingUp, UtensilsCrossed, Cloud, Route, MessageSquare, RefreshCw, Check, Lightbulb, CloudSun, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import DemandForecast from '../components/DemandForecast';

const typeIcons = {
  LOCATION: MapPin,
  DEMAND: TrendingUp,
  MENU: UtensilsCrossed,
  WEATHER: Cloud,
  ROUTE: Route,
  SOCIAL_MEDIA: MessageSquare,
  CUSTOMER_ENGAGEMENT: MessageSquare
};

const typeColors = {
  LOCATION: 'bg-blue-100 text-blue-700',
  DEMAND: 'bg-green-100 text-green-700',
  MENU: 'bg-orange-100 text-orange-700',
  WEATHER: 'bg-cyan-100 text-cyan-700',
  ROUTE: 'bg-purple-100 text-purple-700',
  SOCIAL_MEDIA: 'bg-pink-100 text-pink-700',
  CUSTOMER_ENGAGEMENT: 'bg-yellow-100 text-yellow-700'
};

export default function AI() {
  const { selectedTruck } = useTruck();
  const [recommendations, setRecommendations] = useState([]);
  const [locationSuggestions, setLocationSuggestions] = useState(null);
  const [demandForecast, setDemandForecast] = useState(null);
  const [menuInsights, setMenuInsights] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('recommendations');

  // Individual loading states for each tab
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingDemand, setLoadingDemand] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState(false);

  // Track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState({
    recommendations: false,
    location: false,
    demand: false,
    menu: false
  });

  // Load recommendations on mount (default tab)
  useEffect(() => {
    if (selectedTruck && !loadedTabs.recommendations) {
      loadRecommendations();
    }
  }, [selectedTruck]);

  // Load data when tab changes
  useEffect(() => {
    if (!selectedTruck) return;

    if (activeTab === 'location' && !loadedTabs.location) {
      loadLocationData();
    } else if (activeTab === 'demand' && !loadedTabs.demand) {
      loadDemandData();
    } else if (activeTab === 'menu' && !loadedTabs.menu) {
      loadMenuData();
    }
  }, [activeTab, selectedTruck]);

  const loadRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const res = await aiAPI.getRecommendations(selectedTruck.id);
      setRecommendations(res.data);
      setLoadedTabs(prev => ({ ...prev, recommendations: true }));
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      toast.error('Failed to load recommendations');
    } finally {
      setLoadingRecs(false);
    }
  };

  const loadLocationData = async () => {
    setLoadingLocation(true);
    try {
      const res = await aiAPI.getLocationSuggestions(selectedTruck.id);
      setLocationSuggestions(res.data);
      setLoadedTabs(prev => ({ ...prev, location: true }));
    } catch (error) {
      console.error('Failed to load location AI:', error);
      toast.error('Failed to load location suggestions');
    } finally {
      setLoadingLocation(false);
    }
  };

  const loadDemandData = async () => {
    setLoadingDemand(true);
    try {
      const res = await aiAPI.getDemandForecast(selectedTruck.id);
      setDemandForecast(res.data);
      setLoadedTabs(prev => ({ ...prev, demand: true }));
    } catch (error) {
      console.error('Failed to load demand forecast:', error);
      toast.error('Failed to load demand forecast');
    } finally {
      setLoadingDemand(false);
    }
  };

  const loadMenuData = async () => {
    setLoadingMenu(true);
    try {
      const res = await aiAPI.getMenuInsights(selectedTruck.id);
      setMenuInsights(res.data);
      setLoadedTabs(prev => ({ ...prev, menu: true }));
    } catch (error) {
      console.error('Failed to load menu insights:', error);
      toast.error('Failed to load menu insights');
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleRefresh = async () => {
    // Refresh current tab's data
    if (activeTab === 'recommendations') {
      setLoadedTabs(prev => ({ ...prev, recommendations: false }));
      loadRecommendations();
    } else if (activeTab === 'location') {
      setLoadedTabs(prev => ({ ...prev, location: false }));
      loadLocationData();
    } else if (activeTab === 'demand') {
      setLoadedTabs(prev => ({ ...prev, demand: false }));
      loadDemandData();
    } else if (activeTab === 'menu') {
      setLoadedTabs(prev => ({ ...prev, menu: false }));
      loadMenuData();
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await aiAPI.generateRecommendations(selectedTruck.id);
      toast.success('New recommendations generated');
      setLoadedTabs(prev => ({ ...prev, recommendations: false }));
      loadRecommendations();
    } catch (error) {
      toast.error('Failed to generate recommendations');
    } finally {
      setGenerating(false);
    }
  };

  const handleAction = async (recId) => {
    try {
      await aiAPI.actionRecommendation(recId);
      toast.success('Marked as actioned');
      loadRecommendations();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const LoadingSpinner = ({ text }) => (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="h-12 w-12 text-primary-600 animate-spin mb-4" />
      <p className="text-gray-500">{text || 'Loading AI insights...'}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Features</h1>
            <p className="text-gray-500">Smart insights for your food truck</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className="btn btn-secondary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          {activeTab === 'recommendations' && (
            <button onClick={handleGenerate} disabled={generating} className="btn btn-primary">
              <Sparkles className={`h-4 w-4 mr-2 ${generating ? 'animate-pulse' : ''}`} />
              {generating ? 'Generating...' : 'Generate New'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {['recommendations', 'weather', 'location', 'demand', 'menu'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'location' ? 'Location AI' :
             tab === 'demand' ? 'Demand Forecast' :
             tab === 'menu' ? 'Menu Optimizer' :
             tab === 'weather' ? 'Weather Predictions' :
             'Recommendations'}
            {((tab === 'location' && loadingLocation) ||
              (tab === 'demand' && loadingDemand) ||
              (tab === 'menu' && loadingMenu) ||
              (tab === 'recommendations' && loadingRecs)) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </button>
        ))}
      </div>

      {/* Weather Predictions */}
      {activeTab === 'weather' && (
        <div className="space-y-6">
          <div className="card p-6 bg-gradient-to-r from-cyan-50 to-blue-50">
            <div className="flex items-center gap-3 mb-4">
              <CloudSun className="h-6 w-6 text-cyan-600" />
              <h2 className="text-lg font-semibold">Weather-Enhanced Demand Prediction</h2>
            </div>
            <p className="text-gray-700">
              AI-powered predictions that factor in weather conditions, historical performance,
              and day-of-week patterns to forecast demand and optimize prep quantities.
            </p>
          </div>
          <DemandForecast truckId={selectedTruck.id} />
        </div>
      )}

      {/* Recommendations */}
      {activeTab === 'recommendations' && (
        <>
          {loadingRecs ? (
            <LoadingSpinner text="Loading recommendations..." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.map(rec => {
                const Icon = typeIcons[rec.type] || Lightbulb;
                return (
                  <div key={rec.id} className={`card p-4 ${rec.isActioned ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${typeColors[rec.type] || 'bg-gray-100 text-gray-700'}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-medium text-gray-500">{rec.type.replace('_', ' ')}</span>
                      </div>
                      {rec.confidence && (
                        <span className="text-xs text-gray-400">{Math.round(rec.confidence * 100)}% confidence</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{rec.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{rec.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{format(new Date(rec.createdAt), 'MMM d, h:mm a')}</span>
                      {!rec.isActioned && (
                        <button onClick={() => handleAction(rec.id)} className="btn btn-secondary text-sm">
                          <Check className="h-4 w-4 mr-1" />Done
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {recommendations.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No recommendations yet</p>
                  <button onClick={handleGenerate} className="btn btn-primary mt-4">Generate Now</button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Location AI */}
      {activeTab === 'location' && (
        <>
          {loadingLocation ? (
            <LoadingSpinner text="Analyzing location performance with AI..." />
          ) : locationSuggestions ? (
            <div className="space-y-6">
              <div className="card p-6 bg-gradient-to-r from-blue-50 to-primary-50">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="h-6 w-6 text-primary-600" />
                  <h2 className="text-lg font-semibold">AI Location Recommendation</h2>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{locationSuggestions.recommendation}</p>
                <p className="text-sm text-gray-500 mt-2">Based on {locationSuggestions.basedOn} historical visits</p>
              </div>
              {locationSuggestions.suggestions?.length > 0 && (
                <div className="card p-6">
                  <h3 className="font-semibold mb-4">Top Performing Locations</h3>
                  <div className="space-y-3">
                    {locationSuggestions.suggestions.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-primary-600">#{idx + 1}</span>
                          <div>
                            <p className="font-medium">{s.location?.name}</p>
                            <p className="text-sm text-gray-500">{s.visits} visits</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">${s.avgRevenue.toFixed(2)}</p>
                          <p className="text-sm text-gray-500">avg revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No location data available</p>
            </div>
          )}
        </>
      )}

      {/* Demand Forecast */}
      {activeTab === 'demand' && (
        <>
          {loadingDemand ? (
            <LoadingSpinner text="Generating demand forecast with AI..." />
          ) : demandForecast ? (
            <div className="space-y-6">
              <div className="card p-6 bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                  <h2 className="text-lg font-semibold">AI Demand Forecast</h2>
                </div>
                <p className="text-gray-700">
                  Forecast for <strong>{demandForecast.dayOfWeek}</strong> ({demandForecast.date})
                </p>
                {demandForecast.aiRecommendation && (
                  <p className="text-gray-700 mt-3 p-3 bg-white/50 rounded-lg">
                    {demandForecast.aiRecommendation}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-2">Based on {demandForecast.basedOnOrders} historical orders</p>
              </div>
              {demandForecast.forecast?.length > 0 && (
                <div className="card p-6">
                  <h3 className="font-semibold mb-4">Predicted Item Demand</h3>
                  <div className="space-y-3">
                    {demandForecast.forecast.slice(0, 10).map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">{f.item}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-primary-600">{f.predictedQuantity}</span>
                          <span className="text-xs text-gray-400">{Math.round(f.confidence * 100)}% conf</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No demand data available</p>
            </div>
          )}
        </>
      )}

      {/* Menu Optimizer */}
      {activeTab === 'menu' && (
        <>
          {loadingMenu ? (
            <LoadingSpinner text="Optimizing menu with AI analysis..." />
          ) : menuInsights ? (
            <div className="space-y-6">
              {menuInsights.recommendations?.length > 0 && (
                <div className="card p-6 bg-gradient-to-r from-orange-50 to-yellow-50">
                  <div className="flex items-center gap-3 mb-4">
                    <UtensilsCrossed className="h-6 w-6 text-orange-600" />
                    <h2 className="text-lg font-semibold">AI Menu Recommendations</h2>
                  </div>
                  <ul className="space-y-2">
                    {menuInsights.recommendations.map((r, idx) => (
                      <li key={idx} className="text-gray-700 flex items-start gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <span className="whitespace-pre-wrap">{r}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-gray-500 mt-4">
                    Based on {menuInsights.totalOrdersAnalyzed} orders across {menuInsights.totalItemsAnalyzed} items
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {menuInsights.insights?.stars?.length > 0 && (
                  <div className="card p-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      Star Items
                      <span className="text-xs text-gray-500">(High popularity, high profit)</span>
                    </h3>
                    <div className="space-y-2">
                      {menuInsights.insights.stars.map(i => (
                        <div key={i.id} className="flex justify-between p-2 bg-green-50 rounded">
                          <span>{i.name}</span>
                          <span className="font-medium text-green-600">{i.soldCount} sold</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {menuInsights.insights?.dogs?.length > 0 && (
                  <div className="card p-6">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      Underperformers
                      <span className="text-xs text-gray-500">(Low popularity)</span>
                    </h3>
                    <div className="space-y-2">
                      {menuInsights.insights.dogs.map(i => (
                        <div key={i.id} className="flex justify-between p-2 bg-red-50 rounded">
                          <span>{i.name}</span>
                          <span className="font-medium text-red-600">{i.soldCount} sold</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <UtensilsCrossed className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No menu data available</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
