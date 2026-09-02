import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../lib/AdminAuthContext';
import { adminApi } from '../../lib/api/admin';
import '../../styles/wave-bounce.css';

export default function AdminDashboard() {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.getOverview();
      setOverview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">FlexPay Admin</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => navigate('/admin')}
              className="px-4 py-3 text-blue-400 border-b-2 border-blue-400 whitespace-nowrap"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              className="px-4 py-3 text-gray-400 hover:text-white whitespace-nowrap"
            >
              Users
            </button>
            <button
              onClick={() => navigate('/admin/withdrawals')}
              className="px-4 py-3 text-gray-400 hover:text-white whitespace-nowrap"
            >
              Withdrawals
            </button>
            <button
              onClick={() => navigate('/admin/topups')}
              className="px-4 py-3 text-gray-400 hover:text-white whitespace-nowrap"
            >
              Top-Ups
            </button>
            <button
              onClick={() => navigate('/admin/tasks')}
              className="px-4 py-3 text-gray-400 hover:text-white whitespace-nowrap"
            >
              Tasks
            </button>
            <button
              onClick={() => navigate('/admin/achievements')}
              className="px-4 py-3 text-gray-400 hover:text-white whitespace-nowrap"
            >
              Achievements
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-white mb-8">Platform Overview</h2>

        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Total Users */}
            <div className="wave-bounce-item">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <p className="text-gray-400 text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold text-white mt-2">{overview.totalUsers}</p>
              </div>
            </div>

            {/* Verified Users */}
            <div className="wave-bounce-item">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <p className="text-gray-400 text-sm font-medium">Verified Users</p>
                <p className="text-3xl font-bold text-white mt-2">{overview.verifiedUsers}</p>
              </div>
            </div>

            {/* Platform Balance */}
            <div className="wave-bounce-item">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <p className="text-gray-400 text-sm font-medium">Platform Balance</p>
                <p className="text-3xl font-bold text-green-400 mt-2">
                  ₦{overview.platformBalance.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Pending Withdrawals */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm font-medium">Pending Withdrawals</p>
              <p className="text-3xl font-bold text-yellow-400 mt-2">{overview.pendingWithdrawals}</p>
              <p className="text-gray-400 text-sm mt-2">
                Total: ₦{overview.totalPendingAmount.toLocaleString()}
              </p>
            </div>

            {/* Today's Signups */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm font-medium">Today's Signups</p>
              <p className="text-3xl font-bold text-blue-400 mt-2">{overview.todaySignups}</p>
            </div>

            {/* Today's Task Completions */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <p className="text-gray-400 text-sm font-medium">Today's Task Completions</p>
              <p className="text-3xl font-bold text-purple-400 mt-2">{overview.todayTaskCompletions}</p>
            </div>
          </div>
        )}

        <div className="mt-12 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/admin/users')}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded transition text-sm font-medium"
            >
              Manage Users
            </button>
            <button
              onClick={() => navigate('/admin/withdrawals')}
              className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded transition text-sm font-medium"
            >
              Process Withdrawals
            </button>
            <button
              onClick={() => navigate('/admin/tasks')}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded transition text-sm font-medium"
            >
              Manage Tasks
            </button>
            <button
              onClick={() => navigate('/admin/achievements')}
              className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition text-sm font-medium"
            >
              Manage Achievements
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
