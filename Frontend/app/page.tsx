"use client";

import { useState } from 'react';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/auth/LoginForm';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { LiveDetection } from '@/components/sections/LiveDetection';
import { AvatarControls } from '@/components/sections/AvatarControls';
import { AdminTools } from '@/components/sections/AdminTools';
import { MentalHealthTips } from '@/components/sections/MentalHealthTips';

function Dashboard() {
  const { user, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onToggleMode={() => setIsLogin(!isLogin)} isLogin={isLogin} />;
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto space-y-8">
        <DashboardHeader />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MentalHealthTips />
          <LiveDetection />
          <AvatarControls />
          <AdminTools />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}