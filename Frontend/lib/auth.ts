import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = "my-super-secret-key-change-in-production";

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: Omit<User, 'password'>;
}

let users: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // "password"
  },
];

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: Omit<User, 'password'>): string {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token: string): Omit<User, 'password'> | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Omit<User, 'password'>;
  } catch {
    return null;
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const user = users.find((u) => u.email === email);
  if (!user) return { success: false, message: 'User not found' };

  const isValidPassword = await comparePassword(password, user.password!);
  if (!isValidPassword) return { success: false, message: 'Invalid password' };

  const userWithoutPassword = { id: user.id, email: user.email, name: user.name };
  const token = generateToken(userWithoutPassword);

  return { success: true, message: 'Login successful', token, user: userWithoutPassword };
}

export async function registerUser(email: string, password: string, name: string): Promise<AuthResponse> {
  const existingUser = users.find((u) => u.email === email);
  if (existingUser) return { success: false, message: 'User already exists' };

  const hashedPassword = await hashPassword(password);
  const newUser: User = { id: Date.now().toString(), email, name, password: hashedPassword };
  users.push(newUser);

  const userWithoutPassword = { id: newUser.id, email: newUser.email, name: newUser.name };
  const token = generateToken(userWithoutPassword);

  return { success: true, message: 'Registration successful', token, user: userWithoutPassword };
}
  // code for forgot password .....
export async function forgotPassword(email: string): Promise<AuthResponse> {
  const user = users.find((u) => u.email === email);
  if (!user) return { success: false, message: 'User not found' };

  // Normally send email here

  const resetToken = generateToken({ id: user.id, email: user.email, name: user.name });
  return { success: true, message: `Password reset link generated (token: ${resetToken})` };
}

export async function resetPassword(email: string, newPassword: string): Promise<AuthResponse> {
  const user = users.find((u) => u.email === email);
  if (!user) return { success: false, message: 'User not found' };

  user.password = await hashPassword(newPassword);
  return { success: true, message: 'Password reset successful' };
}
