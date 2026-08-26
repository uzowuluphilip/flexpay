import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../lib/api/admin';

export default function AdminTasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', rewardNaira: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.listTasks();
      setTasks(data.tasks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!formData.title || !formData.rewardNaira) {
      setError('Title and reward are required');
      return;
    }

    try {
      setIsSubmitting(true);
      await adminApi.createTask(
        formData.title,
        formData.description,
        parseInt(formData.rewardNaira)
      );
      setShowCreateModal(false);
      setFormData({ title: '', description: '', rewardNaira: '' });
      loadTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;

    try {
      await adminApi.deleteTask(taskId);
      loadTasks();
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
            <h1 className="text-2xl font-bold text-white">Tasks Management</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
          >
            Create Task
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="text-gray-400 text-center py-8">Loading...</div>
          ) : tasks.length === 0 ? (
            <div className="text-gray-400 text-center py-8 col-span-full">No tasks found</div>
          ) : (
            tasks.map((task) => (
              <div key={task.id} className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-white flex-1">{task.title}</h3>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-gray-400 hover:text-red-400 transition"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{task.description}</p>

                <div className="flex justify-between items-center">
                  <p className="text-2xl font-bold text-green-400">
                    ₦{(task.reward_kobo / 100).toLocaleString()}
                  </p>
                  <p className={`px-2 py-1 rounded text-xs font-medium ${
                    task.is_active ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                  }`}>
                    {task.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Task Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">Create New Task</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Task title"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="Task description (optional)"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Reward (₦)</label>
                  <input
                    type="number"
                    value={formData.rewardNaira}
                    onChange={(e) => setFormData({ ...formData, rewardNaira: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    placeholder="1000"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({ title: '', description: '', rewardNaira: '' });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTask}
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
