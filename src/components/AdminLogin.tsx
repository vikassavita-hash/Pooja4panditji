import React, { useState } from 'react';
import { Lock, AlertCircle } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  adminCredentials: { userId: string; passwordHash: string }[];
}

export default function AdminLogin({ onLoginSuccess, adminCredentials }: AdminLoginProps) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      console.log('[AdminLogin] Attempting login with:', { userId, credentialsCount: adminCredentials?.length });
      console.log('[AdminLogin] Available credentials:', adminCredentials);
      
      // Validate credentials against admin users
      const adminUser = adminCredentials?.find(
        (user) => user.userId === userId && user.passwordHash === password
      );

      if (!adminUser) {
        console.log('[AdminLogin] No matching credentials found. Provided:', { userId, password }, 'Available:', adminCredentials);
        setErrorMsg('Invalid User ID or Password. Admin access denied.');
        setIsLoading(false);
        return;
      }
      
      console.log('[AdminLogin] Credentials matched! Logging in...');

      // Store authentication in session
      sessionStorage.setItem('pooja4pandit_admin_auth', 'true');
      sessionStorage.setItem('pooja4pandit_admin_user', userId);
      
      setUserId('');
      setPassword('');
      onLoginSuccess();
    } catch (err) {
      setErrorMsg('Authentication error. Please try again.');
      console.error('Admin login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-8 text-center">
          <Lock size={40} className="text-white mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
          <p className="text-orange-100 text-sm mt-2">Secure Access Required</p>
        </div>

        {/* Form */}
        <div className="px-6 py-8">
          {errorMsg && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* User ID Input */}
            <div>
              <label htmlFor="userId" className="block text-sm font-semibold text-gray-700 mb-2">
                Admin User ID
              </label>
              <input
                id="userId"
                type="email"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your admin email"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 transition-colors"
                required
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !userId || !password}
              className="w-full mt-6 px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded-lg hover:from-orange-700 hover:to-orange-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              {isLoading ? 'Authenticating...' : 'Login to Admin Portal'}
            </button>
          </form>

          {/* Info Text */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-xs">
              Only authorized administrators can access this panel. All activities are logged for security and compliance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
