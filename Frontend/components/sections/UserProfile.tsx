"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

export function UserProfile() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("");
  const [disease, setDisease] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.profile?.name || "");
      setEmail(user.email || "");
      setAge(user.profile?.age || "");
      setOccupation(user.profile?.occupation || "");
      setDisease(user.profile?.disease || "");
    } else {
      setName("");
      setEmail("");
      setAge("");
      setOccupation("");
      setDisease("");
    }
  }, [user]);

  const handleSave = () => {
    // Later you can persist to backend/localStorage
    setIsEditing(false);
    alert("Profile updated successfully!");
  };

  const diseaseLabel =
    disease === "diabetic"
      ? "Diabetic"
      : disease === "heart"
      ? "Heart Related"
      : disease === "respiratory"
      ? "Respiratory"
      : disease === "bp"
      ? "Blood Pressure"
      : disease === "other"
      ? "Other"
      : "None";

  return (
    <Card className="glass-card p-6 hover:shadow-2xl transition-all duration-300 border-gray-700/50 min-w-[340px]">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <h2 className="text-xl font-semibold text-white tracking-wide">
          USER PROFILE
        </h2>
      </div>

      {/* Avatar */}
      <div className="flex justify-center mb-6">
        <Avatar className="w-24 h-24 border-2 border-blue-500 shadow-lg">
          <AvatarImage src="/avatar.png" />
          <AvatarFallback className="bg-gray-700 text-white text-xl">
            {name?.[0]}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Name */}
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Full Name</Label>
          <Input
            disabled={!isEditing}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-gray-900/80 border-gray-600 text-white"
          />
        </div>

        {/* Email */}
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Email</Label>
          <Input
            disabled={!isEditing}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-gray-900/80 border-gray-600 text-white"
          />
        </div>

        {/* Age */}
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Age</Label>
          <Input
            type="number"
            disabled={!isEditing}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="bg-gray-900/80 border-gray-600 text-white"
          />
        </div>

        {/* Occupation */}
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Occupation</Label>
          <Input
            disabled={!isEditing}
            value={occupation}
            onChange={(e) => setOccupation(e.target.value)}
            className="bg-gray-900/80 border-gray-600 text-white"
          />
        </div>

        {/* Disease */}
        <div className="space-y-1">
          <Label className="text-gray-400 text-xs">Medical Condition</Label>

          {isEditing ? (
            <select
              value={disease}
              onChange={(e) => setDisease(e.target.value)}
              className="w-full h-10 rounded-md border px-3 bg-black text-white border-gray-600"
            >
              <option value="diabetic">Diabetic</option>
              <option value="heart">Heart Related</option>
              <option value="respiratory">Respiratory</option>
              <option value="bp">Blood Pressure</option>
              <option value="other">Other</option>
              <option value="none">None</option>
            </select>
          ) : (
            <div className="h-10 flex items-center px-3 rounded-md bg-gray-900/80 border border-gray-600 text-white">
              {diseaseLabel}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 space-y-3">
        {isEditing ? (
          <>
            <Button
              onClick={handleSave}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600
                         hover:from-blue-700 hover:to-purple-700
                         text-white shadow-lg hover:shadow-xl
                         transition-all duration-300 glow-blue"
            >
              Save Changes
            </Button>
            <Button
              onClick={() => setIsEditing(false)}
              variant="outline"
              className="w-full border-gray-600 text-gray-200 hover:bg-gray-800"
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            onClick={() => setIsEditing(true)}
            className="w-full bg-gradient-to-r from-gray-800 to-gray-700
                       hover:from-gray-700 hover:to-gray-600
                       text-white border-gray-600 shadow-lg hover:shadow-xl
                       transition-all duration-300"
          >
            Edit Profile
          </Button>
        )}
      </div>
    </Card>
  );
}