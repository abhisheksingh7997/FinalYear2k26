"use client";

import { useState } from "react";
import emailjs from "@emailjs/browser";

export const UserAlerts = () => {

  const [alert, setAlert] = useState("");

  const sendEmail = async (type: string, message: string) => {
    try {

      await emailjs.send(
        "service_g1zz2y3",
        "template_frq9dwr",
        {
          user_name: "Dashboard User",
          email: "chouhanabhimanyusingh97@gmail.com",
          message: message
        },
        "Fc624bmMbxrNXd0U7"
      );

      setAlert(type + " email sent successfully!");

      setTimeout(() => {
        setAlert("");
      }, 4000);

    } catch (error) {
      setAlert("Failed to send email");
    }
  };

  const sendMentalHealthAlert = () => {
    sendEmail(
      "Mental Health Alert",
      "High stress or depression detected. Please consider taking a break or seeking support."
    );
  };

  const sendSystemUpdate = () => {
    sendEmail(
      "System Update",
      "New AI mental health analysis features have been added to the dashboard."
    );
  };

  const sendWellnessReminder = () => {
    sendEmail(
      "Wellness Reminder",
      "Reminder to check your mental health status and complete today's wellness session."
    );
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">

      <h2 className="text-xl font-semibold text-green-400">
        Alerts & User Notifications
      </h2>

      {alert && (
        <div className="bg-green-600 text-white px-4 py-2 rounded">
          {alert}
        </div>
      )}

      <div className="flex flex-col gap-3">

        <button
          onClick={sendMentalHealthAlert}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
        >
          Send Mental Health Alert
        </button>

        <button
          onClick={sendSystemUpdate}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
        >
          Send System Update
        </button>

        <button
          onClick={sendWellnessReminder}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
        >
          Send Wellness Reminder
        </button>

      </div>

    </div>
  );
};