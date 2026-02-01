import { z } from "zod";

// MongoDB Document Interfaces (replacing Drizzle ORM tables)

// User storage document for Replit Auth
export interface User {
  id: string;
  email?: string;
  password?: string; // Hashed password for local authentication
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role?: string; // User role: stored as string based on user selection (admin or user)
  createdAt: Date;
  updatedAt: Date;
}

// User Profile with body measurements
export interface Profile {
  id: string;
  userId: string;
  walletId: string;
  name: string;
  age?: number; // Optional
  gender: 'male' | 'female' | 'other';
  
  // Body measurements (in cm)
  height: number;
  weight: number;
  chest: number;
  waist: number;
  hip: number;
  shoulder?: number;  // Optional
  armLength?: number; // Optional
  legLength?: number; // Optional
  thighCircumference?: number; // Optional - thigh circumference
  inseam?: number; // Optional - leg length (inseam)
  
  createdAt: Date;
  updatedAt: Date;
}

// Size recommendations
export interface Recommendation {
  id: string;
  profileId: string;
  userId: string;
  clothingType: string;
  fabricType: string;
  
  // AI Analysis results
  recommendedSize: string; // 'S', 'M', 'L', 'XL', 'XXL'
  confidence: string; // 'Perfect', 'Good', 'Loose'
  matchScore: number; // 0-100 percentage
  
  // Size chart data (JSON stored as string)
  sizeChartData: string; // JSON string
  // Detailed analysis (JSON stored as string)
  analysis: string; // JSON string with per-size comparison
  
  createdAt: Date;
}

// Session storage document for Replit Auth
export interface Session {
  sid: string;
  sess: any; // JSON object
  expire: Date;
}

// Clothing types available for selection
export const clothingTypes = [
  { id: 't-shirt', name: 'T-Shirt', icon: 'Shirt' },
  { id: 'pants', name: 'Pants', icon: 'PantsIcon' },
  { id: 'dress', name: 'Dress', icon: 'DressIcon' },
  { id: 'jacket', name: 'Jacket', icon: 'Coat' },
  { id: 'formal-shirt', name: 'Formal Shirt', icon: 'ShirtIcon' },
  { id: 'shorts', name: 'Shorts', icon: 'ShortsIcon' },
] as const;

// Fabric types
export const fabricTypes = [
  { id: 'stretchy', name: 'Stretchy', description: 'Elastic fabrics like spandex, jersey' },
  { id: 'normal', name: 'Normal', description: 'Standard cotton, polyester blends' },
  { id: 'rigid', name: 'Rigid', description: 'Denim, canvas, stiff materials' },
] as const;

// Zod schemas for validation
export const insertProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().min(1).max(120).optional(), // Optional - reduces friction
  gender: z.enum(['male', 'female', 'other']),
  height: z.number().min(50).max(250, "Height must be between 50-250 cm"),
  weight: z.number().min(20).max(300, "Weight must be between 20-300 kg"),
  chest: z.number().min(50).max(200, "Chest must be between 50-200 cm"),
  waist: z.number().min(40).max(200, "Waist must be between 40-200 cm"),
  hip: z.number().min(50).max(200, "Hip must be between 50-200 cm"),
  // Optional measurements
  shoulder: z.number().min(30).max(100, "Shoulder must be between 30-100 cm").optional(),
  armLength: z.number().min(30).max(100, "Arm length must be between 30-100 cm").optional(),
  legLength: z.number().min(50).max(150, "Leg length must be between 50-150 cm").optional(),
  thighCircumference: z.number().min(30).max(100, "Thigh circumference must be between 30-100 cm").optional(),
  inseam: z.number().min(50).max(120, "Inseam must be between 50-120 cm").optional(),
});

export const analyzeSizeChartSchema = z.object({
  profileId: z.string(),
  clothingType: z.string(),
  fabricType: z.enum(['stretchy', 'normal', 'rigid']),
  imageBase64: z.string(), // Base64 encoded image
});

// TypeScript types for insert operations
export type UpsertUser = Omit<User, 'createdAt' | 'updatedAt'> & {
  createdAt?: Date;
  updatedAt?: Date;
};

export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type ClothingType = typeof clothingTypes[number];
export type FabricType = typeof fabricTypes[number];
export type AnalyzeSizeChart = z.infer<typeof analyzeSizeChartSchema>;

// Sign up schema
export const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(2, "First name must be at least 2 characters").optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters").optional(),
  role: z.enum(['admin', 'user']).optional().default('user'), // Default to 'user' for signup
});

// Sign in schema
export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(['admin', 'user'], {
    required_error: "Role is required",
    invalid_type_error: "Role must be either 'admin' or 'user'",
  }), // Required for sign in - must match database role
});

export type SignUpData = z.infer<typeof signUpSchema>;
export type SignInData = z.infer<typeof signInSchema>;
