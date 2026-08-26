import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../lib/api/admin';

export default function AdminWithdrawalsPage() {
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('pending');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadWithdrawals();
  }, [status]);

  const loadWithdrawals = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.listWithdrawals(status, 50, 0);
      setWithdrawals(data.withdrawals || []);
      setSelectedWithdrawal(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (withdrawalId) => {
    if (!window.confirm('Approve this withdrawal?')) return;

    try {
      setIsProcessing(true);
      await adminApi.approveWithdrawal(withdrawalId);
      loadWithdrawals();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal || !rejectReason) {
      setError('Please provide a rejection reason');
      return;
    }

    try {
      setIsProcessing(true);
      await adminApi.rejectWithdrawal(selectedWithdrawal.id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
      loadWithdrawals();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
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
            <h1 className="text-2xl font-bold text-white">Withdrawals Management</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Status Filter */}
        <div className="mb-6 flex space-x-2">
          {['pending', 'approved', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-4 py-2 rounded transition capitalize ${
                status === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Withdrawals Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : withdrawals.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No withdrawals found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-700 border-b border-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">User</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Amount</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Bank</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Account</th>
                    <th className="px-4 py-3 text-left text-gray-300 font-medium">Requested</th>
                    <th className="px-4 py-3 text-center text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((withdrawal) => (
                    <tr
                      key={withdrawal.id}
                      className="border-b border-gray-700 hover:bg-gray-750 cursor-pointer transition"
                      onClick={() => setSelectedWithdrawal(withdrawal)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white font-medium">{withdrawal.full_name}</p>
                          <p className="text-gray-400 text-xs">{withdrawal.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white font-medium">
                        ₦{(withdrawal.amount_kobo / 100).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{withdrawal.bank_name}</td>
                      <td className="px-4 py-3 text-gray-300">{withdrawal.account_number}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center space-x-2">
                          {withdrawal.status === 'pending' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(withdrawal.id);
                                }}
                                disabled={isProcessing}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded text-xs transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWithdrawal(withdrawal);
                                  setShowRejectModal(true);
                                }}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {withdrawal.status !== 'pending' && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              withdrawal.status === 'approved' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                            }`}>
                              {withdrawal.status}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rejection Modal */}
        {showRejectModal && selectedWithdrawal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Reject Withdrawal
              </h3>
              <p className="text-gray-300 mb-4">
                Rejecting ₦{(selectedWithdrawal.amount_kobo / 100).toLocaleString()} from {selectedWithdrawal.full_name}
              </p>
              <p className="text-gray-400 text-sm mb-4">
                The amount will be credited back to their wallet.
              </p>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 mb-4"
                rows="4"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessing || !rejectReason}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded transition"
                >
                  {isProcessing ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
