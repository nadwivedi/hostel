import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [loginType, setLoginType] = useState('owner'); // 'owner' | 'employee'
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(loginId, password, loginType);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md mx-4 border border-gray-100">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl">🏨</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Hostel Manager</h1>
          <p className="text-gray-500 text-sm">Sign in to continue</p>
        </div>

        {/* Login Type Tabs */}
        <div className="flex rounded-xl bg-gray-100 p-1 mb-6 gap-1">
          <button
            type="button"
            onClick={() => { setLoginType('owner'); setError(''); }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              loginType === 'owner'
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>👤</span>
            <span>Owner Login</span>
          </button>
          <button
            type="button"
            onClick={() => { setLoginType('employee'); setError(''); }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
              loginType === 'employee'
                ? 'bg-white text-purple-700 shadow-sm ring-1 ring-purple-100'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>👥</span>
            <span>Staff Login</span>
          </button>
        </div>

        {/* Role indicator */}
        <div className={`text-xs text-center mb-4 px-3 py-2 rounded-lg font-medium ${
          loginType === 'owner'
            ? 'bg-indigo-50 text-indigo-700'
            : 'bg-purple-50 text-purple-700'
        }`}>
          {loginType === 'owner'
            ? '🔑 Signing in as the hostel owner'
            : '👔 Signing in as a staff member / employee'}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="loginId" className="block text-sm font-medium text-gray-700 mb-1.5">
              Email or Mobile
            </label>
            <input
              type="text"
              id="loginId"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              placeholder="Enter your email or mobile"
              required
              autoComplete="username"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              placeholder="Enter your password"
              required
              minLength={4}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 px-4 rounded-xl text-white font-semibold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
              loginType === 'owner'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800'
                : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
            }`}
          >
            {loading ? 'Signing in...' : `Sign In as ${loginType === 'owner' ? 'Owner' : 'Staff'}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;