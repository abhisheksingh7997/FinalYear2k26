"use client";

import { useState } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LoginForm } from "@/components/auth/LoginForm";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Navbar } from "@/components/dashboard/Navbar";

import { LiveDetection } from "@/components/sections/LiveDetection";
// import { AdminTools } from "@/components/sections/AdminTools";
import { MentalHealthTips } from "@/components/sections/MentalHealthTips";
import { UsageReports } from "@/components/sections/UsageReports";
import { UserAlerts } from "@/components/sections/UserAlerts";
import { DataAnalytics } from "@/components/sections/DataAnalytics";

function Dashboard() {
  const { user, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  const [activeService, setActiveService] = useState("reports");

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
    return (
      <LoginForm onToggleMode={() => setIsLogin(!isLogin)} isLogin={isLogin} />
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto space-y-8">

        <DashboardHeader />

        {/* Navbar */}
        <Navbar active={activeService} setActive={setActiveService} />

        {/* Default AI features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MentalHealthTips />
          <LiveDetection />
          {/* <AdminTools /> */}
        </div>

        {/* Service Sections */}
        <div className="mt-6">

          {activeService === "reports" && <UsageReports />}

          {activeService === "alerts" && <UserAlerts />}

          {activeService === "analytics" && <DataAnalytics />}

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