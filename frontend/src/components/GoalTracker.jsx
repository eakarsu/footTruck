import { useState, useEffect } from 'react';
import { financialAPI } from '../services/api';
import { Target, Plus, X, Check, TrendingUp, TrendingDown, Calendar, AlertCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

const goalPeriods = ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'];

export default function GoalTracker({ truckId, goals, locations, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [goalProgress, setGoalProgress] = useState({});
  const [loadingProgress, setLoadingProgress] = useState({});
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [form, setForm] = useState({
    locationId: '',
    targetRevenue: '',
    targetCustomers: '',
    period: 'MONTHLY',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  });

  useEffect(() => {
    goals.forEach(goal => {
      loadGoalProgress(goal.id);
    });
  }, [goals]);

  const loadGoalProgress = async (goalId) => {
    setLoadingProgress(prev => ({ ...prev, [goalId]: true }));
    try {
      const res = await financialAPI.getGoalProgress(goalId);
      setGoalProgress(prev => ({ ...prev, [goalId]: res.data }));
    } catch (error) {
      console.error('Failed to load goal progress:', error);
    } finally {
      setLoadingProgress(prev => ({ ...prev, [goalId]: false }));
    }
  };

  const handleCreateGoal = async (e) => {
    e.preventDefault();
    try {
      await financialAPI.createGoal(truckId, {
        locationId: form.locationId,
        targetRevenue: parseFloat(form.targetRevenue),
        targetCustomers: form.targetCustomers ? parseInt(form.targetCustomers) : null,
        period: form.period,
        startDate: form.startDate,
        endDate: form.endDate
      });
      toast.success('Goal created');
      setShowModal(false);
      setForm({
        locationId: '',
        targetRevenue: '',
        targetCustomers: '',
        period: 'MONTHLY',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      });
      onRefresh();
    } catch (error) {
      toast.error('Failed to create goal');
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!confirm('Delete this goal?')) return;
    try {
      await financialAPI.deleteGoal(truckId, goalId);
      toast.success('Goal deleted');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete goal');
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusBadge = (progress) => {
    if (!progress) return null;

    const { onTrack, progress: prog } = progress;
    const revenueOnTrack = onTrack?.revenue;

    if (prog.revenueProgress >= 100) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <Check className="h-3 w-3" />
          Goal Achieved
        </span>
      );
    }

    if (revenueOnTrack) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
          <TrendingUp className="h-3 w-3" />
          On Track
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
        <TrendingDown className="h-3 w-3" />
        Behind
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary-500" />
            Location Goals
          </h3>
          <p className="text-sm text-gray-500">Set and track revenue goals for your locations</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Goal
        </button>
      </div>

      {/* Goals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map(goal => {
          const progress = goalProgress[goal.id];
          const isLoading = loadingProgress[goal.id];

          const isSelected = selectedGoalId === goal.id;

          return (
            <div
              key={goal.id}
              className={`card p-4 cursor-pointer transition-all hover:shadow-lg ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : ''}`}
              onClick={() => setSelectedGoalId(isSelected ? null : goal.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold">{goal.location?.name}</h4>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(goal.startDate), 'MMM d')} - {format(new Date(goal.endDate), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(progress)}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="h-20 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>
              ) : progress ? (
                <div className="space-y-4">
                  {/* Revenue Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Revenue</span>
                      <span className="font-medium">
                        ${progress.actual?.revenue.toFixed(2)} / ${goal.targetRevenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getProgressColor(progress.progress?.revenueProgress)}`}
                        style={{ width: `${Math.min(progress.progress?.revenueProgress || 0, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {progress.progress?.revenueProgress.toFixed(1)}% complete
                    </p>
                  </div>

                  {/* Customer Progress */}
                  {goal.targetCustomers && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Customers</span>
                        <span className="font-medium">
                          {progress.actual?.customers} / {goal.targetCustomers}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${getProgressColor(progress.progress?.customerProgress)}`}
                          style={{ width: `${Math.min(progress.progress?.customerProgress || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Projection */}
                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <span className="text-gray-500">Projected Revenue</span>
                    <span className={`font-bold ${progress.projectedRevenue >= goal.targetRevenue ? 'text-green-600' : 'text-red-600'}`}>
                      ${progress.projectedRevenue.toFixed(2)}
                    </span>
                  </div>

                  {/* Days Remaining */}
                  {progress.daysRemaining > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <AlertCircle className="h-4 w-4" />
                      {progress.daysRemaining} days remaining
                    </div>
                  )}

                  {/* Expanded Details */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <h5 className="font-medium text-primary-700">Goal Details</h5>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-gray-500">Goal Period</p>
                          <p className="font-semibold">{goal.period}</p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-gray-500">Daily Target</p>
                          <p className="font-semibold">
                            ${(goal.targetRevenue / Math.max(1, differenceInDays(new Date(goal.endDate), new Date(goal.startDate)))).toFixed(2)}/day
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-gray-500">Remaining to Goal</p>
                          <p className="font-semibold text-orange-600">
                            ${Math.max(0, goal.targetRevenue - (progress.actual?.revenue || 0)).toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-gray-500">Daily Needed</p>
                          <p className="font-semibold text-blue-600">
                            ${progress.daysRemaining > 0
                              ? (Math.max(0, goal.targetRevenue - (progress.actual?.revenue || 0)) / progress.daysRemaining).toFixed(2)
                              : '0.00'}/day
                          </p>
                        </div>
                      </div>
                      {goal.targetCustomers && (
                        <div className="bg-white p-3 rounded-lg">
                          <p className="text-gray-500 text-sm">Customers: {progress.actual?.customers || 0} / {goal.targetCustomers} target</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No progress data available</p>
              )}
            </div>
          );
        })}
      </div>

      {goals.length === 0 && (
        <div className="card p-8 text-center">
          <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-600 mb-2">No Goals Set</h3>
          <p className="text-gray-500 mb-4">Create your first goal to start tracking location performance</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Goal
          </button>
        </div>
      )}

      {/* Create Goal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Create Location Goal</h2>
              <button onClick={() => setShowModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateGoal} className="p-4 space-y-4">
              <div>
                <label className="label">Location</label>
                <select
                  value={form.locationId}
                  onChange={e => setForm({ ...form, locationId: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select a location</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Target Revenue ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.targetRevenue}
                    onChange={e => setForm({ ...form, targetRevenue: e.target.value })}
                    className="input"
                    required
                    placeholder="1000.00"
                  />
                </div>
                <div>
                  <label className="label">Target Customers (optional)</label>
                  <input
                    type="number"
                    value={form.targetCustomers}
                    onChange={e => setForm({ ...form, targetCustomers: e.target.value })}
                    className="input"
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <label className="label">Goal Period</label>
                <select
                  value={form.period}
                  onChange={e => setForm({ ...form, period: e.target.value })}
                  className="input"
                >
                  {goalPeriods.map(p => (
                    <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Create Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
