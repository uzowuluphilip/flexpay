import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../lib/api/admin';

export default function AdminAchievementsPage() {
  const navigate = useNavigate();
  const [achievements, setAchievements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ code: '', title: '', description: '', icon: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.listAchievements();
      setAchievements(data.achievements || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAchievement = async () => {
    if (!formData.code || !formData.title) {
      setError('Code and title are required');
      return;
    }

    try {
      setIsSubmitting(true);
      await adminApi.createAchievement(
        formData.code,
        formData.title,
        formData.description,
        formData.icon
      );
      setShowCreateModal(false);
      setFormData({ code: '', title: '', description: '', icon: '' });
      loadAchievements();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
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
            <h1 className="text-2xl font-bold text-white">Achievements Management</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
          >
            Create Achievement
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="text-gray-400 text-center py-8">Loading...</div>
          ) : achievements.length === 0 ? (
            <div className="text-gray-400 text-center py-8 col-span-full">No achievements found</div>
          ) : (
            achievements.map((achievement) => (
              <div key={achievement.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex items-start gap-4 mb-3">
                  {achievement.icon && (
                    <span className="text-3xl">{achievement.icon}</span>
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">{achievement.title}</h3>
                    <p className="text-gray-400 text-xs">{achievement.code}</p>
                  </div>
                </div>

                <p className="text-gray-400 text-sm line-clamp-2">{achievement.description}</p>
              </div>
            ))
          )}
        </div>

        {/* Create Achievement Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">Create New Achievement</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="achievement_code"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Achievement title"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Achievement description"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Icon</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="🏆"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({ code: '', title: '', description: '', icon: '' });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAchievement}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded transition"
                  >
                    {isSubmitting ? 'Creating...' : 'Create'}
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
