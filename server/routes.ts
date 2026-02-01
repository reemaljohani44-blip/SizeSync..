import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getDb } from "./db";
import { analyzeSizeChart } from "./openai";
import { calculateSmartRecommendation, type SizeChartData } from "./smart-recommendation";
import { createJob, getJob } from "./jobQueue";
import { insertProfileSchema, analyzeSizeChartSchema, signUpSchema, signInSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated, generateToken, isAdmin } from "./auth";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import passport from "passport";
import adminRoutes from "./admin";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);
  
  console.log("✓ Authentication setup complete");

  // Admin routes
  app.use("/api/admin", adminRoutes);
  console.log("✓ Admin routes registered");

  // Sign Up endpoint
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = signUpSchema.parse(req.body);
      
      // Normalize email to lowercase and trim for consistency
      const normalizedEmail = String(validatedData.email).trim().toLowerCase();
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ error: "User with this email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create user
      const userId = randomUUID();
      let user: any;
      
      // Role defaults to 'user' for signup if not provided
      const userRole = validatedData.role ? String(validatedData.role).trim() : 'user';
      
      // Validate role if provided
      if (userRole !== 'admin' && userRole !== 'user') {
        return res.status(400).json({ 
          error: "Role must be either 'admin' or 'user'." 
        });
      }
      
      try {
        console.log("=== SIGNUP DEBUG ===");
        console.log("Raw request body:", JSON.stringify(req.body, null, 2));
        console.log("Validated data:", JSON.stringify(validatedData, null, 2));
        console.log("Normalized email:", normalizedEmail);
        console.log("Final userRole:", userRole);
        console.log("Starting user creation for:", normalizedEmail, "with role:", userRole);
        
        const userData = {
          id: userId,
          email: normalizedEmail, // Use normalized email
          password: hashedPassword,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          role: userRole, // Always explicitly set the role as a string
        };
        
        console.log("User data to be saved:", JSON.stringify({ ...userData, password: '[HIDDEN]' }, null, 2));
        console.log("Role in userData:", userData.role, "Type:", typeof userData.role);
        
        user = await storage.upsertUser(userData);
        
        console.log("User created successfully:", user.id);
        console.log("User role after creation:", user.role);
        
        // CRITICAL: Verify role was actually saved to database
        const db = getDb();
        const verifyUser = await db.collection("users").findOne({ id: user.id });
        if (verifyUser) {
          console.log("VERIFICATION - User from DB after creation:", {
            id: verifyUser.id,
            email: verifyUser.email,
            role: (verifyUser as any).role,
            hasRole: 'role' in verifyUser,
            allKeys: Object.keys(verifyUser)
          });
          
          // If role is still missing, force update it
          if (!(verifyUser as any).role) {
            console.error("CRITICAL: Role still missing after creation! Force updating...");
            await db.collection("users").updateOne(
              { id: user.id },
              { $set: { role: userRole } }
            );
            // Fetch again
            const updatedUser = await db.collection("users").findOne({ id: user.id });
            if (updatedUser) {
              user = updatedUser as any;
              console.log("After force update - User role:", (updatedUser as any).role);
            }
          }
        }
        
        console.log("=== END SIGNUP DEBUG ===");
      } catch (upsertError: any) {
        console.error("Upsert error in signup route:", {
          message: upsertError?.message,
          code: upsertError?.code,
          codeName: upsertError?.codeName,
          name: upsertError?.name,
          stack: upsertError?.stack,
        });
        
        // If upsert fails, check if user was actually created
        // This handles race conditions or partial failures
        try {
          const existingUser = await storage.getUserByEmail(validatedData.email);
          if (existingUser) {
            // User was created, use the existing user
            user = existingUser;
            console.log("User was created despite upsert error, using existing user:", user.id);
          } else {
            // User was not created, re-throw the error
            console.error("User was not created, throwing error");
            throw upsertError;
          }
        } catch (checkError: any) {
          console.error("Error checking for existing user:", checkError);
          throw upsertError;
        }
      }

      // Auto-login after signup
      const sessionUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: user.role, // Include role in session user
      };

      // Generate JWT token (always generate, even if session login fails)
      const token = generateToken(user.id, user.email || "");
      
      // Set token in cookie (always set, even if session login fails)
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Attempt to create session, but don't fail if it doesn't work
      // User is already created and JWT token is set, so signup is successful
      req.login(sessionUser, (err) => {
        if (err) {
          console.error("Login error after signup (user created but session failed):", err);
          // Still return success since user was created and JWT token is set
          // The JWT token will allow authentication even without session
        }
        
        // Always return success response since user was created successfully
        res.json({ 
          message: "User created successfully", 
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: user.profileImageUrl,
            role: user.role, // Include role in response
          },
          token // JWT token for client-side storage
        });
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      console.error("Signup error details:", {
        message: error?.message,
        code: error?.code,
        codeName: error?.codeName,
        name: error?.name,
        stack: error?.stack,
      });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      
      // Provide more specific error messages
      let errorMessage = error.message || "Failed to create user";
      
      // Handle MongoDB duplicate key errors
      if (error.code === 11000 || error.codeName === 'DuplicateKey') {
        errorMessage = "User with this email already exists";
        return res.status(400).json({ error: errorMessage });
      }
      
      // Handle database connection errors
      if (error.message?.includes("Database not initialized") || error.message?.includes("MONGO_DB_URI")) {
        errorMessage = "Database connection error. Please contact support.";
        return res.status(500).json({ error: errorMessage });
      }
      
      // Log the full error for debugging
      console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      res.status(500).json({ 
        error: errorMessage,
        // Include error code in development for debugging
        ...(process.env.NODE_ENV === 'development' && { 
          details: {
            code: error.code,
            codeName: error.codeName,
            name: error.name
          }
        })
      });
    }
  });

  // Google OAuth - Initiate login (must be registered before other routes)
  app.get("/api/auth/google", (req, res, next) => {
    console.log("[Google OAuth] Route handler called:", req.method, req.originalUrl);
    try {
      if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
        console.warn("[Google OAuth] Not configured - CLIENT_ID or CLIENT_SECRET missing");
        return res.status(500).json({ 
          error: "Google OAuth is not configured. Please set CLIENT_ID and CLIENT_SECRET in your environment variables." 
        });
      }
      
      // Get role from query parameter
      const role = req.query.role as string;
      if (!role || (role !== 'user' && role !== 'admin')) {
        return res.status(400).json({ 
          error: "Role is required. Please select 'user' or 'admin' role." 
        });
      }
      
      // Store role in session to retrieve in callback
      (req.session as any).googleOAuthRole = role;
      
      console.log("[Google OAuth] Redirecting to Google for authentication with role:", role);
      const authHandler = passport.authenticate("google", {
        scope: ["profile", "email"],
      });
      authHandler(req, res, next);
    } catch (error: any) {
      console.error("[Google OAuth] Error in route handler:", error);
      return res.status(500).json({ 
        error: "Failed to initiate Google OAuth", 
        details: error.message 
      });
    }
  });
  
  console.log("✓ Google OAuth routes registered: /api/auth/google, /api/auth/google/callback");

  // Google OAuth - Callback
  app.get("/api/auth/google/callback", (req, res, next) => {
    if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET) {
      return res.status(500).json({ 
        error: "Google OAuth is not configured. Please set CLIENT_ID and CLIENT_SECRET in your environment variables." 
      });
    }
    passport.authenticate("google", { failureRedirect: "/signin?error=google_auth_failed" }, async (err: any, user: any, info: any) => {
      if (err) {
        console.error("Google OAuth error:", err);
        return res.redirect("/signin?error=google_auth_failed");
      }

      // Get role from session (set during OAuth initiation)
      const role = (req.session as any)?.googleOAuthRole || 'user';
      
      if (!user) {
        // User doesn't exist yet, create it with role from session
        const profile = info?.profile || {};
        const email = profile.emails?.[0]?.value?.toLowerCase().trim();
        
        if (!email) {
          return res.redirect("/signin?error=no_email");
        }

        try {
          // Create new user with role from session
          const userId = randomUUID();
          const newUser = {
            id: userId,
            email: email,
            firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || '',
            lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '',
            profileImageUrl: profile.photos?.[0]?.value || undefined,
            role: role,
          };
          user = await storage.upsertUser(newUser);
          console.log("[Google OAuth] Created new user with role:", role);
        } catch (createError: any) {
          console.error("Error creating user in callback:", createError);
          return res.redirect("/signin?error=user_creation_failed");
        }
      }

      // Clear the role from session
      delete (req.session as any).googleOAuthRole;

      try {
        // Create session
        req.login(user, async (loginErr) => {
          if (loginErr) {
            console.error("Login error after Google OAuth:", loginErr);
            return res.redirect("/signin?error=session_failed");
          }

          // Generate JWT token
          const token = generateToken(user.id, user.email || "");

          // Set token in cookie
          res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          });

          // Redirect to dashboard
          res.redirect("/dashboard");
        });
      } catch (error: any) {
        console.error("Error in Google OAuth callback:", error);
        res.redirect("/signin?error=google_auth_failed");
      }
    })(req, res, next);
  });

  // Sign In endpoint
  app.post("/api/auth/signin", async (req, res) => {
    try {
      const validatedData = signInSchema.parse(req.body);
      
      // Normalize email to lowercase and trim for consistent lookups
      const normalizedEmail = String(validatedData.email).trim().toLowerCase();
      
      // Find user by email
      const user = await storage.getUserByEmail(normalizedEmail);
      if (!user || !user.password) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(validatedData.password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify role matches database role
      const dbRole = user.role ? String(user.role).toLowerCase().trim() : 'user';
      const requestedRole = String(validatedData.role).toLowerCase().trim();
      
      if (dbRole !== requestedRole) {
        console.log("=== ROLE MISMATCH ===");
        console.log("Requested role:", requestedRole);
        console.log("Database role:", dbRole);
        console.log("User email:", normalizedEmail);
        return res.status(403).json({ 
          error: "Role mismatch", 
          message: `The selected role (${requestedRole}) does not match your account role (${dbRole}). Please select the correct role.` 
        });
      }

      // Create session user
      const sessionUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      };

      req.login(sessionUser, (err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to login" });
        }
        
        // Generate JWT token
        const token = generateToken(user.id, user.email || "");
        
        // Set token in cookie
        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        
        // Create clean user response (remove password, ensure role is included)
        const cleanUser = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          role: user.role || 'user', // Ensure role is always present
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        };
        
        console.log("=== SIGNIN SUCCESS ===");
        console.log("User role:", cleanUser.role);
        console.log("Clean user object:", JSON.stringify(cleanUser, null, 2));
        
        res.json({ 
          message: "Login successful", 
          user: cleanUser,
          token // Also return token in response for client-side storage
        });
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: error.message || "Failed to login" });
    }
  });

  // Auth route - get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Set cache-control headers to prevent browser caching of auth state
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      const userId = req.user.id;
      const db = getDb();
      
      // Fetch user directly from database to ensure we get the latest data
      const userDoc = await db.collection("users").findOne({ id: userId });
      
      if (!userDoc) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log("=== USER API DEBUG ===");
      console.log("User ID:", userId);
      console.log("User role from DB:", (userDoc as any).role);
      console.log("Has role field:", 'role' in userDoc);
      console.log("All user keys:", Object.keys(userDoc));
      console.log("Full user object from DB:", JSON.stringify({ ...userDoc, password: '[HIDDEN]' }, null, 2));
      
      // Extract role from database document
      let userRole = (userDoc as any).role;
      
      // If role is missing from DB, update it to 'user' as default
      if (!userRole || typeof userRole !== 'string') {
        console.error("CRITICAL: Role is missing from user document!");
        console.error("User document keys:", Object.keys(userDoc));
        console.error("Full user document:", JSON.stringify({ ...userDoc, password: '[HIDDEN]' }, null, 2));
        
        // Set default role to 'user'
        userRole = 'user';
        await db.collection("users").updateOne(
          { id: userId },
          { $set: { role: userRole } }
        );
        console.error("Set default role to 'user' for user:", userId);
      }
      
      // Create CLEAN response object - explicitly build it to ensure no password or _id leaks
      const userResponse = {
        id: String((userDoc as any).id || ''),
        email: (userDoc as any).email ? String((userDoc as any).email) : undefined,
        firstName: (userDoc as any).firstName ? String((userDoc as any).firstName) : undefined,
        lastName: (userDoc as any).lastName ? String((userDoc as any).lastName) : undefined,
        profileImageUrl: (userDoc as any).profileImageUrl ? String((userDoc as any).profileImageUrl) : undefined,
        role: String(userRole), // CRITICAL: Ensure role is always a string
        createdAt: (userDoc as any).createdAt,
        updatedAt: (userDoc as any).updatedAt,
      };
      
      // Verify password is NOT in response
      if ((userResponse as any).password || (userResponse as any)._id) {
        console.error("CRITICAL: Password or _id found in response! Removing...");
        delete (userResponse as any).password;
        delete (userResponse as any)._id;
      }
      
      console.log("User role in response:", userResponse.role);
      console.log("User response keys:", Object.keys(userResponse));
      console.log("User response (no password):", JSON.stringify(userResponse, null, 2));
      console.log("=== END USER API DEBUG ===");
      
      res.json(userResponse);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get current user's profile
  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create profile
  app.post("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertProfileSchema.parse(req.body);
      const profile = await storage.createProfile(userId, validatedData);
      res.json(profile);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Update profile
  app.put("/api/profile/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Verify ownership
      const existingProfile = await storage.getProfileById(id);
      if (!existingProfile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      if (existingProfile.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to update this profile" });
      }
      
      const validatedData = insertProfileSchema.partial().parse(req.body);
      const profile = await storage.updateProfile(id, validatedData);
      res.json(profile);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      if (error.message === "Profile not found") {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Analyze size chart and get recommendation (AI-powered or manual)
  app.post("/api/analyze-size-chart", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      // Validate request body
      const { imageBase64, clothingType, fabricType, sizeChartData } = req.body;

      if (!clothingType || !fabricType) {
        return res.status(400).json({
          error: "Missing required fields: clothingType, fabricType",
        });
      }

      // Get profile
      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found. Please create a profile first." });
      }

      let analysis;

      // If size chart data is provided manually, use smart recommendation algorithm
      if (sizeChartData && typeof sizeChartData === 'object') {
        console.log(`🧮 Using Smart Recommendation Algorithm for user ${userId} - ${clothingType} (${fabricType})`);
        
        // Validate size chart data structure
        const chartData = sizeChartData as SizeChartData;
        if (Object.keys(chartData).length === 0) {
          return res.status(400).json({
            error: "Size chart data is empty. Please provide size measurements.",
          });
        }

        // Use smart recommendation algorithm
        analysis = calculateSmartRecommendation(
          profile,
          chartData,
          clothingType,
          fabricType
        );

        console.log(`✨ Smart Recommendation Complete: Size ${analysis.recommendedSize} (${analysis.confidence} fit, ${analysis.matchScore}% match)`);
      } 
      // If image is provided, use AI analysis
      else if (imageBase64) {
        // Validate OpenAI API key is configured
        if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
          return res.status(500).json({ 
            error: "AI service is not configured. Please set AI_INTEGRATIONS_OPENAI_API_KEY in your environment variables to enable AI-powered size recommendations, or provide size chart data manually." 
          });
        }

        console.log(`🔍 Starting AI analysis for user ${userId} - ${clothingType} (${fabricType})`);

        try {
          // Analyze size chart using AI
          analysis = await analyzeSizeChart(
            imageBase64,
            profile,
            clothingType,
            fabricType
          );
        } catch (aiError: any) {
          // If AI fails with connection error, provide helpful message
          const isConnectionError = 
            aiError.code === 'ECONNREFUSED' || 
            aiError.cause?.code === 'ECONNREFUSED' ||
            aiError.message?.includes("Cannot connect") || 
            aiError.message?.includes("ECONNREFUSED") ||
            aiError.message?.includes("Connection error");
          
          if (isConnectionError) {
            return res.status(503).json({ 
              error: "Cannot connect to OpenAI API. Please check your network connection and ensure AI_INTEGRATIONS_OPENAI_API_KEY is correctly set. You can still get recommendations by providing size chart data manually instead of uploading an image." 
            });
          }
          // Re-throw other errors
          throw aiError;
        }
      } else {
        return res.status(400).json({
          error: "Either imageBase64 (for AI analysis) or sizeChartData (for manual entry) must be provided.",
        });
      }

      console.log(`💾 Saving recommendation for user ${userId}`);

      // Save recommendation
      const recommendation = await storage.createRecommendation({
        profileId: profile.id,
        userId: userId,
        clothingType,
        fabricType,
        recommendedSize: analysis.recommendedSize,
        confidence: analysis.confidence,
        matchScore: analysis.matchScore,
        sizeChartData: JSON.stringify(analysis.extractedSizes),
        analysis: typeof analysis.analysis === 'string' ? analysis.analysis : JSON.stringify(analysis.analysis),
      });

      console.log(`✅ Recommendation saved successfully: ${recommendation.id}`);
      res.json(recommendation);
    } catch (error: any) {
      console.error("❌ Error in analyze-size-chart endpoint:", error);
      const statusCode = error.message?.includes("API key") || error.message?.includes("not configured") ? 500 : 500;
      res.status(statusCode).json({ 
        error: error.message || "Failed to analyze size chart. Please check your input and try again." 
      });
    }
  });

  // Async size chart analysis - returns job ID immediately
  app.post("/api/analyze-size-chart/async", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { imageBase64, clothingType, fabricType, sizeChartData } = req.body;

      if (!clothingType || !fabricType) {
        return res.status(400).json({
          error: "Missing required fields: clothingType, fabricType",
        });
      }

      const profile = await storage.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found. Please create a profile first." });
      }

      // If size chart data is provided manually, process synchronously (it's fast)
      if (sizeChartData && typeof sizeChartData === 'object') {
        const chartData = sizeChartData as SizeChartData;
        if (Object.keys(chartData).length === 0) {
          return res.status(400).json({
            error: "Size chart data is empty. Please provide size measurements.",
          });
        }

        const analysis = calculateSmartRecommendation(profile, chartData, clothingType, fabricType);
        const recommendation = await storage.createRecommendation({
          profileId: profile.id,
          userId: userId,
          clothingType,
          fabricType,
          recommendedSize: analysis.recommendedSize,
          confidence: analysis.confidence,
          matchScore: analysis.matchScore,
          sizeChartData: JSON.stringify(analysis.extractedSizes),
          analysis: typeof analysis.analysis === 'string' ? analysis.analysis : JSON.stringify(analysis.analysis),
        });

        return res.json({ 
          status: "completed", 
          result: recommendation 
        });
      }

      // For image analysis, use async job queue
      if (!imageBase64) {
        return res.status(400).json({
          error: "Either imageBase64 or sizeChartData must be provided.",
        });
      }

      if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
        return res.status(500).json({ 
          error: "AI service is not configured. Please provide size chart data manually." 
        });
      }

      const jobId = randomUUID();
      const job = createJob(jobId, {
        imageBase64,
        profile,
        clothingType,
        fabricType,
        profileId: profile.id,
      });

      console.log(`🚀 Created async job ${jobId} for user ${userId}`);
      res.json({ jobId, status: job.status, progress: job.progress });
    } catch (error: any) {
      console.error("❌ Error creating async job:", error);
      res.status(500).json({ error: error.message || "Failed to start analysis." });
    }
  });

  // Check job status
  app.get("/api/analyze-size-chart/job/:jobId", isAuthenticated, async (req: any, res) => {
    try {
      const { jobId } = req.params;
      const userId = req.user.id;
      const job = getJob(jobId);

      if (!job) {
        return res.status(404).json({ error: "Job not found or expired" });
      }

      if (job.status === "completed" && job.result) {
        const recommendation = await storage.createRecommendation({
          profileId: job.result.profileId,
          userId: userId,
          clothingType: job.result.clothingType,
          fabricType: job.result.fabricType,
          recommendedSize: job.result.recommendedSize,
          confidence: job.result.confidence,
          matchScore: job.result.matchScore,
          sizeChartData: JSON.stringify(job.result.extractedSizes),
          analysis: typeof job.result.analysis === 'string' ? job.result.analysis : JSON.stringify(job.result.analysis),
        });

        return res.json({
          status: "completed",
          progress: 100,
          result: recommendation,
        });
      }

      if (job.status === "failed") {
        return res.json({
          status: "failed",
          progress: job.progress,
          error: job.error,
        });
      }

      res.json({
        status: job.status,
        progress: job.progress,
      });
    } catch (error: any) {
      console.error("❌ Error checking job status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific recommendation
  app.get("/api/recommendations/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const recommendation = await storage.getRecommendation(id);
      
      if (!recommendation) {
        return res.status(404).json({ error: "Recommendation not found" });
      }

      res.json(recommendation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all recommendations for current user
  app.get("/api/recommendations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const recommendations = await storage.getRecommendationsByUser(userId);
      res.json(recommendations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete recommendation
  app.delete("/api/recommendations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Verify ownership before deleting
      const recommendation = await storage.getRecommendation(id);
      if (!recommendation) {
        return res.status(404).json({ error: "Recommendation not found" });
      }
      
      if (recommendation.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized to delete this recommendation" });
      }
      
      await storage.deleteRecommendation(id);
      res.json({ success: true, message: "Recommendation deleted" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin routes - Get all users (admin only)
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ error: error.message || "Failed to fetch users" });
    }
  });

  // Admin routes - Update user (admin only)
  app.put("/api/admin/users/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { email, firstName, lastName, role } = req.body;

      console.log("=== UPDATE USER DEBUG ===");
      console.log("User ID from params:", id);
      console.log("Update data:", { email, firstName, lastName, role });

      // Validate role if provided
      if (role && role !== 'admin' && role !== 'user') {
        return res.status(400).json({ error: "Role must be either 'admin' or 'user'" });
      }

      const db = getDb();
      
      // First, check if user exists
      const existingUser = await db.collection("users").findOne({ id: String(id) });
      console.log("Existing user found:", existingUser ? "Yes" : "No");
      if (existingUser) {
        console.log("Existing user ID:", existingUser.id);
        console.log("Existing user email:", existingUser.email);
      }
      
      if (!existingUser) {
        console.error("User not found in database with ID:", id);
        return res.status(404).json({ error: "User not found" });
      }

      // CRITICAL: Check for duplicate email if email is being updated
      if (email && email !== existingUser.email) {
        const emailString = String(email).trim().toLowerCase();
        const userWithEmail = await db.collection("users").findOne({ 
          email: emailString,
          id: { $ne: String(id) } // Exclude the current user being updated
        });
        
        if (userWithEmail) {
          console.error("Email already exists for another user:", emailString);
          return res.status(400).json({ 
            error: "User with this email already exists. Email addresses must be unique." 
          });
        }
        console.log("Email validation passed - email is unique:", emailString);
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (email) {
        // Normalize email to lowercase for consistency
        updateData.email = String(email).trim().toLowerCase();
      }
      if (firstName !== undefined) updateData.firstName = String(firstName);
      if (lastName !== undefined) updateData.lastName = String(lastName);
      if (role) updateData.role = String(role);

      console.log("Update data to apply:", updateData);

      // Use updateOne instead of findOneAndUpdate for better compatibility
      const updateResult = await db.collection("users").updateOne(
        { id: String(id) },
        { $set: updateData }
      );

      console.log("Update result:", {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount,
      });

      if (updateResult.matchedCount === 0) {
        console.error("No user matched for update with ID:", id);
        return res.status(404).json({ error: "User not found" });
      }

      // Fetch the updated user
      const updatedUser = await db.collection("users").findOne({ id: String(id) });
      
      if (!updatedUser) {
        console.error("User not found after update with ID:", id);
        return res.status(404).json({ error: "User not found" });
      }

      // Remove password and _id from response
      const cleanUser = { ...updatedUser };
      delete (cleanUser as any).password;
      delete (cleanUser as any)._id;

      console.log("Updated user (no password):", JSON.stringify(cleanUser, null, 2));
      console.log("=== END UPDATE USER DEBUG ===");

      res.json(cleanUser);
    } catch (error: any) {
      console.error("Error updating user:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ error: error.message || "Failed to update user" });
    }
  });

  // Admin routes - Get all recommendations (admin only)
  app.get("/api/admin/recommendations", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      console.log("=== ADMIN RECOMMENDATIONS API ===");
      console.log("Request URL:", req.originalUrl);
      console.log("Request path:", req.path);
      
      // Ensure we return JSON, not HTML
      res.setHeader('Content-Type', 'application/json');
      
      const recommendations = await storage.getAllRecommendations();
      console.log("Found recommendations:", recommendations.length);
      
      // Enrich recommendations with user information
      const enrichedRecommendations = await Promise.all(
        recommendations.map(async (rec) => {
          try {
            // Ensure userId is a string and is present
            const userId = String(rec.userId || '').trim();
            if (!userId) {
              console.error(`Recommendation ${rec.id} has no userId!`);
              return {
                ...rec,
                user: {
                  id: '',
                  email: null,
                  firstName: null,
                  lastName: null,
                  fullName: 'Unknown User',
                },
              };
            }
            
            console.log(`=== FETCHING USER FOR RECOMMENDATION ===`);
            console.log(`Recommendation ID: ${rec.id}`);
            console.log(`User ID from recommendation: ${userId}`);
            console.log(`User ID type: ${typeof userId}`);
            
            // Use storage.getUser for consistency
            const user = await storage.getUser(userId);
            
            if (user) {
              console.log(`✓ Found user for recommendation ${rec.id}:`, {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                hasFirstName: !!user.firstName,
                hasLastName: !!user.lastName,
                hasEmail: !!user.email,
              });
              
              // Build full name from available data - prioritize actual names
              let fullName = 'Unknown User';
              
              // First try: firstName + lastName
              if (user.firstName && user.lastName) {
                fullName = `${String(user.firstName).trim()} ${String(user.lastName).trim()}`.trim();
                console.log(`  → Using firstName + lastName: "${fullName}"`);
              } 
              // Second try: firstName only
              else if (user.firstName) {
                fullName = String(user.firstName).trim();
                console.log(`  → Using firstName only: "${fullName}"`);
              } 
              // Third try: lastName only
              else if (user.lastName) {
                fullName = String(user.lastName).trim();
                console.log(`  → Using lastName only: "${fullName}"`);
              } 
              // Fourth try: email username
              else if (user.email) {
                fullName = String(user.email).split('@')[0];
                console.log(`  → Using email username: "${fullName}"`);
              } else {
                console.warn(`  ⚠ No name or email found for user ${user.id}`);
              }
              
              console.log(`  → Final fullName: "${fullName}"`);
              console.log(`=== END USER FETCH ===`);
              
              return {
                ...rec,
                user: {
                  id: String(user.id || userId),
                  email: user.email ? String(user.email) : null,
                  firstName: user.firstName ? String(user.firstName) : null,
                  lastName: user.lastName ? String(user.lastName) : null,
                  fullName: fullName,
                },
              };
            } else {
              console.warn(`✗ User not found via storage.getUser for recommendation ${rec.id}, userId: ${userId}`);
              // Try direct DB lookup as fallback
              const db = getDb();
              console.log(`Trying direct DB lookup for userId: ${userId}`);
              let dbUser = await db.collection("users").findOne({ id: userId });
              
              if (dbUser) {
                console.log(`✓ Found user via direct DB lookup:`, {
                  id: dbUser.id || dbUser._id,
                  email: dbUser.email,
                  firstName: dbUser.firstName,
                  lastName: dbUser.lastName,
                  allKeys: Object.keys(dbUser),
                });
                
                // Build full name from available data - same logic as above
                let fullName = 'Unknown User';
                
                if (dbUser.firstName && dbUser.lastName) {
                  fullName = `${String(dbUser.firstName).trim()} ${String(dbUser.lastName).trim()}`.trim();
                  console.log(`  → Using firstName + lastName: "${fullName}"`);
                } else if (dbUser.firstName) {
                  fullName = String(dbUser.firstName).trim();
                  console.log(`  → Using firstName only: "${fullName}"`);
                } else if (dbUser.lastName) {
                  fullName = String(dbUser.lastName).trim();
                  console.log(`  → Using lastName only: "${fullName}"`);
                } else if (dbUser.email) {
                  fullName = String(dbUser.email).split('@')[0];
                  console.log(`  → Using email username: "${fullName}"`);
                } else {
                  console.warn(`  ⚠ No name or email found for user ${dbUser.id || dbUser._id}`);
                }
                
                console.log(`  → Final fullName: "${fullName}"`);
                console.log(`=== END USER FETCH (DB FALLBACK) ===`);
                
                return {
                  ...rec,
                  user: {
                    id: String(dbUser.id || dbUser._id || userId),
                    email: dbUser.email ? String(dbUser.email) : null,
                    firstName: dbUser.firstName ? String(dbUser.firstName) : null,
                    lastName: dbUser.lastName ? String(dbUser.lastName) : null,
                    fullName: fullName,
                  },
                };
              }
              
              // If still not found, log all users to debug
              console.error(`✗✗ User ${userId} not found in database. Checking all users...`);
              const allUsers = await db.collection("users").find({}).limit(10).toArray();
              console.log(`Sample users in DB (first 10):`, allUsers.map(u => ({ 
                id: u.id, 
                email: u.email, 
                firstName: u.firstName, 
                lastName: u.lastName 
              })));
              
              console.log(`=== END USER FETCH (NOT FOUND) ===`);
              
              return {
                ...rec,
                user: {
                  id: userId,
                  email: null,
                  firstName: null,
                  lastName: null,
                  fullName: 'Unknown User',
                },
              };
            }
          } catch (err) {
            console.error(`Error fetching user ${rec.userId} for recommendation ${rec.id}:`, err);
            console.error(`Error stack:`, err instanceof Error ? err.stack : 'No stack trace');
            return {
              ...rec,
              user: {
                id: String(rec.userId || ''),
                email: null,
                firstName: null,
                lastName: null,
                fullName: 'Unknown User',
              },
            };
          }
        })
      );
      
      // Log final enriched recommendations to verify user data is included
      console.log(`=== FINAL ENRICHED RECOMMENDATIONS ===`);
      console.log(`Total recommendations: ${enrichedRecommendations.length}`);
      enrichedRecommendations.forEach((rec, idx) => {
        console.log(`Recommendation ${idx + 1}:`, {
          id: rec.id,
          userId: rec.userId,
          hasUser: !!rec.user,
          userFullName: rec.user?.fullName || 'NOT SET',
          userEmail: rec.user?.email || 'NOT SET',
        });
      });
      console.log(`=== END FINAL ENRICHED RECOMMENDATIONS ===`);
      
      res.json(enrichedRecommendations || []);
    } catch (error: any) {
      console.error("Error fetching all recommendations:", error);
      console.error("Error details:", {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
      res.status(500).json({ error: error.message || "Failed to fetch recommendations" });
    }
  });

  // Admin routes - Delete any recommendation (admin only)
  app.delete("/api/admin/recommendations/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const recommendation = await storage.getRecommendation(id);
      
      if (!recommendation) {
        return res.status(404).json({ error: "Recommendation not found" });
      }

      await storage.deleteRecommendation(id);
      res.json({ success: true, message: "Recommendation deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting recommendation:", error);
      res.status(500).json({ error: error.message || "Failed to delete recommendation" });
    }
  });

  // Admin routes - Get system activity logs (admin only)
  app.get("/api/admin/activity", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      console.log("=== ADMIN ACTIVITY API ===");
      console.log("Request URL:", req.originalUrl);
      console.log("Request path:", req.path);
      
      // Ensure we return JSON, not HTML
      res.setHeader('Content-Type', 'application/json');
      
      const db = getDb();
      
      // Get recent user signups, recommendations, and profile creations
      // Use try-catch for each query to handle missing collections gracefully
      let recentUsers: any[] = [];
      let recentRecommendations: any[] = [];
      let recentProfiles: any[] = [];

      try {
        recentUsers = await db.collection("users").find({}).sort({ createdAt: -1 }).limit(50).toArray();
      } catch (err: any) {
        console.error("Error fetching users for activity:", err);
      }

      try {
        recentRecommendations = await db.collection("recommendations").find({}).sort({ createdAt: -1 }).limit(50).toArray();
      } catch (err: any) {
        console.error("Error fetching recommendations for activity:", err);
      }

      try {
        recentProfiles = await db.collection("profiles").find({}).sort({ createdAt: -1 }).limit(50).toArray();
      } catch (err: any) {
        console.error("Error fetching profiles for activity:", err);
      }

      // Combine and format activity logs
      const activities = [
        ...recentUsers.map((user: any) => ({
          type: 'user_signup',
          description: `User ${user.email || user.id} signed up`,
          userId: user.id,
          timestamp: user.createdAt || new Date(),
          metadata: { email: user.email, role: user.role },
        })),
        ...recentRecommendations.map((rec: any) => ({
          type: 'recommendation_created',
          description: `Recommendation created for ${rec.clothingType || 'Unknown'} (${rec.recommendedSize || 'N/A'})`,
          userId: rec.userId,
          timestamp: rec.createdAt || new Date(),
          metadata: { 
            clothingType: rec.clothingType, 
            recommendedSize: rec.recommendedSize,
            confidence: rec.confidence,
          },
        })),
        ...recentProfiles.map((profile: any) => ({
          type: 'profile_created',
          description: `Profile created for user`,
          userId: profile.userId,
          timestamp: profile.createdAt || new Date(),
          metadata: { profileId: profile.id },
        })),
      ]
        .filter(activity => activity.timestamp) // Filter out activities without timestamps
        .sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeB - timeA; // Sort descending (newest first)
        })
        .slice(0, 100);

      res.json(activities);
    } catch (error: any) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ error: error.message || "Failed to fetch activity logs" });
    }
  });

  // Admin routes - Delete user (admin only)
  app.delete("/api/admin/users/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const db = getDb();

      // Prevent admin from deleting themselves
      if (id === req.user.id) {
        return res.status(400).json({ error: "You cannot delete your own account" });
      }

      const result = await db.collection("users").deleteOne({ id });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ success: true, message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: error.message || "Failed to delete user" });
    }
  });

  // Admin routes - Migrate users to add role field (admin only)
  app.post("/api/admin/migrate-users-role", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const db = getDb();
      const usersCollection = db.collection("users");

      // Find all users without a role field
      const usersWithoutRole = await usersCollection.find({
        $or: [
          { role: { $exists: false } },
          { role: null },
          { role: undefined },
        ],
      }).toArray();

      if (usersWithoutRole.length === 0) {
        return res.json({ 
          message: "No users need migration. All users already have a role field.",
          updated: 0 
        });
      }

      // Update all users without a role to have 'user' as default
      const result = await usersCollection.updateMany(
        {
          $or: [
            { role: { $exists: false } },
            { role: null },
            { role: undefined },
          ],
        },
        {
          $set: {
            role: 'user',
          },
        }
      );

      res.json({ 
        message: `Successfully updated ${result.modifiedCount} users with default role 'user'`,
        updated: result.modifiedCount 
      });
    } catch (error: any) {
      console.error("Error during migration:", error);
      res.status(500).json({ error: error.message || "Failed to migrate users" });
    }
  });

  const httpServer = createServer(app);
4  
  // Set server timeouts to Infinity to allow long-running AI requests
  httpServer.timeout = 0; // 0 means no timeout
  httpServer.keepAliveTimeout = 0; // Disable keep-alive timeout
  httpServer.headersTimeout = 0; // Disable headers timeout
  
  return httpServer;
}
