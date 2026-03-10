"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";

interface LoginFormProps {
  onToggleMode: () => void;
  isLogin: boolean;
}

export function LoginForm({ onToggleMode, isLogin }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("");
  const [disease, setDisease] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login, register, forgotPassword } = useAuth();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!emailRegex.test(email)) {
      setError("Invalid email format");
      return;
    }

    if (!isLogin && !passwordRegex.test(password)) {
      setError(
        "Password must be at least 8 chars, include uppercase, lowercase, number, and special char"
      );
      return;
    }

    setLoading(true);

    try {
      const response = isLogin
        ? await login(email, password)
        : await register(email, password, {
            name,
            age,
            occupation,
            disease,
          });

      if (!response.success) setError(response.message);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!emailRegex.test(email)) {
      setError("Enter a valid email to reset password");
      return;
    }

    const response = await forgotPassword(email);
    if (!response.success) setError(response.message);
    else alert(response.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Mental Health Evaluation System
          </h1>
          <p className="text-gray-400">
            {isLogin ? "Sign in to continue" : "Create your account"}
          </p>
        </div>

        <Card className="p-8 border-gray-700/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <>
                <Input
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  type="number"
                  placeholder="Age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                />
                <Input
                  placeholder="Occupation"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  required
                />
                <select
                  value={disease}
                  onChange={(e) => setDisease(e.target.value)}
                  required
                 className="w-full h-10 rounded-md border px-3 bg-black text-white border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Medical Condition</option>
                  <option value="diabetic">Diabetic</option>
                  <option value="heart">Heart Related</option>
                  <option value="respiratory">Respiratory</option>
                  <option value="bp">Blood Pressure</option>
                  <option value="other">Other</option>
                  <option value="none">None</option>
                </select>
              </>
            )}

            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>

            {isLogin && (
              <Button variant="link" onClick={handleForgotPassword}>
                Forgot Password?
              </Button>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <Button variant="link" onClick={onToggleMode}>
              {isLogin ? "Sign up" : "Sign in"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}