import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState(null);
  const token = searchParams.get('token') || '';

  const checkStrength = async (pwd) => {
    setPassword(pwd);
    if (pwd.length >= 3) {
      try {
        const res = await authAPI.checkPasswordStrength({ password: pwd });
        setStrength(res.data);
      } catch (e) { /* ignore */ }
    } else {
      setStrength(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authAPI.confirmPasswordReset({ token, password });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const strengthColor = strength?.strength === 'strong' ? 'text-green-600' : strength?.strength === 'medium' ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
          <p className="text-gray-600">Enter your new password</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => checkStrength(e.target.value)}
                  className="input pl-10 pr-10 w-full"
                  placeholder="Enter new password"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {strength && (
                <div className="mt-2">
                  <p className={`text-sm font-medium ${strengthColor}`}>
                    Strength: {strength.strength} ({strength.score}/5)
                  </p>
                  <div className="mt-1 space-y-1 text-xs text-gray-500">
                    {Object.entries(strength.checks).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-1">
                        <CheckCircle className={`h-3 w-3 ${val ? 'text-green-500' : 'text-gray-300'}`} />
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input w-full"
                placeholder="Confirm new password"
                required
              />
            </div>
            <input type="hidden" value={token} />
            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/login" className="text-primary-600 hover:text-primary-700 text-sm">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
