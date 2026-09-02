import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../../lib/AdminAuthContext';
import LightningWaveBackground from '../LightningWaveBackground';
import '../../styles/wave-bounce.css';

export const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <>
      <LightningWaveBackground />
      <div className="dashboard-motion-content relative z-10">{children}</div>
    </>
  );
};
