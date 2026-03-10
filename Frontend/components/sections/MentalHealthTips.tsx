"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const tips = [
  {
    title: "🧘 Practice Mindfulness",
    desc: "Spend 10–15 minutes daily focusing on your breath. It reduces stress and improves focus.",
  },
  {
    title: "😴 Maintain Sleep Routine",
    desc: "Aim for 7–8 hours of sleep. A consistent sleep cycle improves mood and brain function.",
  },
  {
    title: "🚶 Stay Physically Active",
    desc: "Light exercise like walking or stretching releases endorphins and reduces anxiety.",
  },
  {
    title: "📵 Digital Detox",
    desc: "Take breaks from screens and social media to reduce mental fatigue.",
  },
  {
    title: "🗣 Talk to Someone",
    desc: "Sharing feelings with friends or family helps relieve emotional pressure.",
  },
  {
    title: "🎯 Set Small Goals",
    desc: "Completing small tasks builds motivation and gives a sense of achievement.",
  },
];

export function MentalHealthTips() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <Card className="p-6 border-gray-700/50 bg-gradient-to-br from-gray-900 to-black shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white tracking-wide">
          🧠 Mental Health Tips
        </h2>
        <span className="text-xs text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
          Wellness
        </span>
      </div>

      {/* Tips List */}
      <div className="space-y-3">
        {tips.map((tip, index) => (
          <div
            key={index}
            className="border border-gray-700 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setActive(active === index ? null : index)}
              className="w-full flex justify-between items-center p-4 bg-gray-800 hover:bg-gray-700 transition"
            >
              <span className="text-gray-200 font-medium text-left">
                {tip.title}
              </span>
              <span className="text-gray-400">
                {active === index ? "−" : "+"}
              </span>
            </button>

            {active === index && (
              <div className="p-4 bg-gray-900 text-gray-300 text-sm border-t border-gray-700">
                {tip.desc}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="mt-6">
        <Button
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600
                     hover:from-green-700 hover:to-emerald-700
                     text-white shadow-lg hover:shadow-xl transition-all"
          onClick={() => alert("Take a deep breath. You're doing your best 💚")}
        >
          Daily Motivation
        </Button>
      </div>
    </Card>
  );
}