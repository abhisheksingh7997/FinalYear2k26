"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444"];

// Mental health issue distribution in corporate employees
const mentalHealthIssues = [
  { name: "Stress", value: 40 },
  { name: "Anxiety", value: 25 },
  { name: "Depression", value: 20 },
  { name: "Burnout", value: 15 }
];

// Region-wise corporate mental health statistics
const regionData = [
  { region: "North America", affected: 35 },
  { region: "Europe", affected: 30 },
  { region: "Asia", affected: 40 },
  { region: "Australia", affected: 28 }
];

// Growth of corporate mental health issues
const yearlyData = [
  { year: "2018", cases: 20 },
  { year: "2019", cases: 24 },
  { year: "2020", cases: 35 },
  { year: "2021", cases: 42 },
  { year: "2022", cases: 47 },
  { year: "2023", cases: 52 }
];

export const DataAnalytics = () => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-8">
      
      <h2 className="text-2xl font-semibold text-purple-400">
        Global Corporate Mental Health Analytics
      </h2>

      {/* PIE CHART */}
      <div>
        <h3 className="text-lg text-gray-300 mb-4">
          Distribution of Mental Health Issues
        </h3>

        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={mentalHealthIssues}
              dataKey="value"
              nameKey="name"
              outerRadius={90}
              label
            >
              {mentalHealthIssues.map((entry, index) => (
                <Cell key={index} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* BAR CHART */}
      <div>
        <h3 className="text-lg text-gray-300 mb-4">
          Employees Facing Mental Health Issues by Region (%)
        </h3>

        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={regionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="region" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip />
            <Bar dataKey="affected" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* LINE CHART */}
      <div>
        <h3 className="text-lg text-gray-300 mb-4">
          Increase in Corporate Mental Health Cases
        </h3>

        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={yearlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="year" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="cases"
              stroke="#22c55e"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};