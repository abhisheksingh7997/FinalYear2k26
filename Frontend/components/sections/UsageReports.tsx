"use client";

import React from "react";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export const UsageReports = () => {
  const generateExcelReport = () => {
    // Mock Data for the report
    const reportData = [
      { Date: "2025-10-01", ActiveUsers: 145, AvgSessionMins: 12.4, HighStressDetections: 12, SystemUptimePct: 99.9 },
      { Date: "2025-10-02", ActiveUsers: 162, AvgSessionMins: 14.1, HighStressDetections: 18, SystemUptimePct: 100.0 },
      { Date: "2025-10-03", ActiveUsers: 134, AvgSessionMins: 11.2, HighStressDetections: 9,  SystemUptimePct: 99.8 },
      { Date: "2025-10-04", ActiveUsers: 189, AvgSessionMins: 15.6, HighStressDetections: 24, SystemUptimePct: 100.0 },
      { Date: "2025-10-05", ActiveUsers: 201, AvgSessionMins: 16.3, HighStressDetections: 31, SystemUptimePct: 99.9 },
      { Date: "2025-10-06", ActiveUsers: 156, AvgSessionMins: 13.8, HighStressDetections: 15, SystemUptimePct: 100.0 },
      { Date: "2025-10-07", ActiveUsers: 112, AvgSessionMins: 9.5,  HighStressDetections: 5,  SystemUptimePct: 100.0 },
    ];

    // Create a new workbook and a worksheet from the JSON data
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    
    // Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usage Metrics");

    // Adjust column widths for better readability
    const colWidths = [
      { wch: 15 }, // Date
      { wch: 15 }, // ActiveUsers
      { wch: 18 }, // AvgSessionMins
      { wch: 22 }, // HighStressDetections
      { wch: 20 }, // SystemUptimePct
    ];
    worksheet["!cols"] = colWidths;

    // Generate buffer directly
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    
    // Create a Blob from the buffer with proper Excel MIME type
    const blob = new Blob([excelBuffer], { 
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" 
    });
    
    // For IE
    if (window.navigator && (window.navigator as any).msSaveOrOpenBlob) {
      (window.navigator as any).msSaveOrOpenBlob(blob, "System_Usage_Report.xlsx");
      return;
    }

    // Standard DOM link approach
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "System_Usage_Report.xlsx";
    link.style.display = "none";
    document.body.appendChild(link);
    
    // Trigger the download
    link.click();
    
    // Cleanup with a small timeout to ensure the browser registers the download attribute
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-semibold text-blue-400 mb-4 flex items-center gap-2">
        Usage & Performance Reports
      </h2>

      <p className="text-gray-400 mb-4">
        Generate detailed daily reports of system usage, user engagement, and AI model performance metrics.
      </p>

      <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700/50">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Metrics Included:</h3>
        <ul className="text-gray-400 text-sm list-disc pl-5 space-y-1.5">
          <li>Daily active user counts</li>
          <li>Average session duration (minutes)</li>
          <li>High-stress emotion detections</li>
          <li>System uptime percentage</li>
        </ul>
      </div>

      <Button 
        onClick={generateExcelReport}
        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
      >
        <Download className="w-4 h-4 mr-2" />
        Generate Report (.xlsx)
      </Button>
    </div>
  );
};