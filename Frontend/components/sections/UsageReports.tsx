"use client";

import React from "react";

export const UsageReports = () => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-semibold text-blue-400 mb-4">
        Usage & Performance Reports
      </h2>

      <p className="text-gray-400 mb-3">
        Generate detailed reports of system usage and performance metrics.
      </p>

      <ul className="text-gray-300 list-disc pl-5 space-y-2">
        <li>Daily activity reports</li>
        <li>Model performance statistics</li>
        <li>User engagement tracking</li>
        <li>Downloadable report generation</li>
      </ul>

      <button className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">
        Generate Report
      </button>
    </div>
  );
};