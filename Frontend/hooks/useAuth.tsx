"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type UserProfile = {
  name: string;
  age: string;
  occupation: string;
  disease: string;
};

type User = {
  email: string;
  password: string;
  profile: UserProfile;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (
    email: string,
    password: string,
    profile: UserProfile
  ) => Promise<any>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<any>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const USERS_KEY = "mh_users";
const CURRENT_USER_KEY = "mh_current_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Restore session on refresh
  useEffect(() => {
    const saved = localStorage.getItem(CURRENT_USER_KEY);
    if (saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  // 🔹 LOGIN
  const login = async (email: string, password: string) => {
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");

    const found = users.find(
      (u) => u.email === email && u.password === password
    );

    if (!found) {
      return { success: false, message: "Invalid credentials" };
    }

    setUser(found);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(found));
    return { success: true };
  };

  // 🔹 REGISTER
  const register = async (
    email: string,
    password: string,
    profile: UserProfile
  ) => {
    const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");

    if (users.some((u) => u.email === email)) {
      return { success: false, message: "Email already registered" };
    }

    const newUser: User = { email, password, profile };
    users.push(newUser);

    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));

    setUser(newUser);
    return { success: true, message: "Account created successfully" };
  };

  // 🔹 LOGOUT
  const logout = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    setUser(null);
  };

  // 🔹 FORGOT PASSWORD (demo)
  const forgotPassword = async (email: string) => {
    return {
      success: true,
      message: `Password reset link sent to ${email}`,
    };
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, forgotPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};