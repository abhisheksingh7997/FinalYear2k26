"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User } from "lucide-react";
import Link from "next/link";

export function DashboardHeader() {
  const { user, logout } = useAuth();

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="text-center flex-1">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">
          Mental Health Evaluation Dashboard
        </h1>
        <p className="text-gray-400 text-lg mt-2">
          Advanced AI-powered mental health analysis through face expressions & speech recognition
        </p>
        <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full mt-4"></div>
      </div>

     <Link href="/profile">
  <div className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50 shadow-lg hover:bg-gray-700/60 transition cursor-pointer">
    <User className="w-4 h-4 text-gray-400" />
    <span className="text-gray-200 text-sm font-medium">
      {user?.profile?.name}
    </span>
  </div>
</Link>

        <Button
          onClick={logout}
          variant="outline"
          size="sm"
          className="bg-gray-800/50 border-gray-700 text-gray-200
                     hover:bg-red-600 hover:border-red-500 hover:text-white
                     transition-all duration-300"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    
  );
}