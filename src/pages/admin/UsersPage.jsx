import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../lib/api/admin';

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAdjustBalance, setShowAdjustBalance] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const statusFilter = new URLSearchParams(window.location.search).get('status') || '';

  useEffect(() => {
    loadUsers();
  }, [search, statusFilter]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.listUsers(search, 50, 0, statusFilter);
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewUser = async (userId) => {
    try {
      const detail = await adminApi.getUserDetail(userId);
      setSelectedUser(detail);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAdjustBalance = async () => {
    if (!selectedUser || !adjustAmount || !adjustReason) {
      setError('Please fill all fields');
      return;
    }

    try {
      setIsAdjusting(true);
      await adminApi.adjustBalance(selectedUser.user.id, parseFloat(adjustAmount), adjustReason);
      setShowAdjustBalance(false);
      setAdjustAmount('');
      setAdjustReason('');
      
      // Reload user detail
      const detail = await adminApi.getUserDetail(selectedUser.user.id);
      setSelectedUser(detail);
      
      // Reload users list
      loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleSuspend = async (userId) => {
    if (!window.confirm('Suspend this user?')) return;
    
    try {
      await adminApi.suspendUser(userId);
      loadUsers();
      if (selectedUser?.user.id === userId) {
        handleViewUser(userId);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReactivate = async (userId) => {
    if (!window.confirm('Reactivate this user?')) return;
    
    try {
      await adminApi.reactivateUser(userId);
      loadUsers();
      if (selectedUser?.user.id === userId) {
        handleViewUser(userId);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin')}
              className="text-gray-400 hover:text-white"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-white">Users Management</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 mb-4"
              />

              {isLoading ? (
                <div className="text-gray-400 text-center py-4">Loading...</div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleViewUser(user.id)}
                      className={`p-3 rounded cursor-pointer transition ${
                        selectedUser?.user.id === user.id
                          ? 'bg-blue-600'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <p className="text-white font-medium">{user.full_name}</p>
                      <p className="text-gray-300 text-sm">{user.email}</p>
                      <p className={`text-xs mt-1 ${
                        user.status === 'active' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {user.status}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* User Detail */}
          <div className="lg:col-span-2">
            {selectedUser ? (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">{selectedUser.user.full_name}</h2>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-400">Email</p>
                      <p className="text-white">{selectedUser.user.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Status</p>
                      <p className={`font-medium ${
                        selectedUser.user.status === 'active' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {selectedUser.user.status}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Verified</p>
                      <p className="text-white">
                        {selectedUser.user.email_verified_at ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Joined</p>
                      <p className="text-white">
                        {new Date(selectedUser.user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedUser.wallet && (
                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Wallet</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-gray-400">Balance</p>
                        <p className="text-2xl font-bold text-green-400">
                          ₦{(selectedUser.wallet.balance_kobo / 100).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Referrals Active</p>
                        <p className="text-white">{selectedUser.referralCount}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedUser.recentTransactions && selectedUser.recentTransactions.length > 0 && (
                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Recent Transactions</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {selectedUser.recentTransactions.map((tx) => (
                        <div key={tx.id} className="p-2 bg-gray-700 rounded text-sm">
                          <p className="text-gray-300">{tx.type}</p>
                          <p className={tx.amount_kobo > 0 ? 'text-green-400' : 'text-red-400'}>
                            {tx.amount_kobo > 0 ? '+' : ''}₦{(tx.amount_kobo / 100).toLocaleString()}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-700 pt-6 flex gap-3">
                  <button
                    onClick={() => setShowAdjustBalance(true)}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition text-sm font-medium"
                  >
                    Adjust Balance
                  </button>
                  <button
                    onClick={() =>
                      selectedUser.user.status === 'active'
                        ? handleSuspend(selectedUser.user.id)
                        : handleReactivate(selectedUser.user.id)
                    }
                    className={`flex-1 px-4 py-2 rounded transition text-sm font-medium ${
                      selectedUser.user.status === 'active'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white`}
                  >
                    {selectedUser.user.status === 'active' ? 'Suspend' : 'Reactivate'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center text-gray-400">
                Select a user to view details
              </div>
            )}
          </div>
        </div>

        {/* Adjust Balance Modal */}
        {showAdjustBalance && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">Adjust Balance for {selectedUser.user.full_name}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">
                    Amount (₦)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="1000"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">
                    Reason
                  </label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="e.g., Support compensation"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAdjustBalance(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdjustBalance}
                    disabled={isAdjusting}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition"
                  >
                    {isAdjusting ? 'Adjusting...' : 'Adjust'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
