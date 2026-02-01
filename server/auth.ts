import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import MongoStore from "connect-mongo";
import jwt from "jsonwebtoken";
import type { Request } from "express";
import { storage } from "./storage";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { randomUUID } from "crypto";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  if (!process.env.MONGO_DB_URI) {
    throw new Error("MONGO_DB_URI must be set for session store");
  }

  const mongoStore = MongoStore.create({
    mongoUrl: process.env.MONGO_DB_URI,
    ttl: sessionTtl / 1000, // convert to seconds
    touchAfter: 24 * 3600, // lazy session update (24 hours)
  });

  return session({
    secret: process.env.SESSION_SECRET!,
    store: mongoStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Only use secure cookies in production
      maxAge: sessionTtl,
      sameSite: "lax", // Helps with CSRF protection
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Set up passport serialization for MongoDB-based password authentication
  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Google OAuth Strategy
  const GOOGLE_CLIENT_ID = process.env.CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.CLIENT_SECRET;
  const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || `${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.replit.app` : 'http://localhost:5001'}/api/auth/google/callback`;

  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    console.log("✓ Google OAuth configured");
    console.log(`  - Client ID: ${GOOGLE_CLIENT_ID.substring(0, 20)}...`);
    console.log(`  - Callback URL: ${GOOGLE_CALLBACK_URL}`);
    console.log(`  - Make sure this callback URL is added to Google Cloud Console!`);
    
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value?.toLowerCase().trim();
            if (!email) {
              return done(new Error("No email found in Google profile"), undefined);
            }

            // Check if user exists
            let user = await storage.getUserByEmail(email);

            if (user) {
              // User exists, update profile image if available
              if (profile.photos?.[0]?.value) {
                await storage.upsertUser({
                  ...user,
                  profileImageUrl: profile.photos[0].value,
                });
                user = await storage.getUserByEmail(email);
              }
              // Return existing user - role will be preserved
            } else {
              // User doesn't exist - we'll create it in the callback route
              // where we have access to the session to get the role
              // For now, return undefined so callback can handle creation
              return done(null, undefined);
            }

            if (!user) {
              return done(new Error("Failed to create or retrieve user"), undefined);
            }

            return done(null, {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: user.profileImageUrl,
              role: user.role,
            });
          } catch (error: any) {
            console.error("Google OAuth error:", error);
            return done(error, undefined);
          }
        }
      )
    );
  } else {
    console.warn("Google OAuth credentials not configured. CLIENT_ID and CLIENT_SECRET must be set in environment variables.");
  }

  // Logout endpoint
  app.get("/api/logout", (req, res) => {
    // Set cache-control headers to prevent browser caching
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
        // Clear session cookie with proper options
        res.clearCookie('connect.sid', {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: '/'
        });
        // Clear JWT token cookie
        res.clearCookie('token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: '/'
        });
        // Return JSON for API calls, redirect for browser navigation
        if (req.headers.accept?.includes('application/json')) {
          res.json({ message: "Logged out successfully" });
        } else {
          res.redirect("/signin");
        }
      });
    });
  });
}

// JWT secret - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "your-secret-key-change-in-production";

// Generate JWT token
export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { 
      userId, 
      email,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: "7d" } // Token expires in 7 days
  );
}

// Verify JWT token
export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

// Extract token from request
function extractToken(req: Request): string | null {
  // Check Authorization header: "Bearer <token>"
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  
  // Check cookie
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  
  return null;
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // First check session-based authentication (for browser)
  if (req.isAuthenticated()) {
    return next();
  }

  // Then check JWT token (for API calls)
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      // Attach user info to request for JWT-based auth
      (req as any).user = {
        id: decoded.userId,
        email: decoded.email,
        jwt: true
      };
      return next();
    }
  }

  // No valid authentication found
  return res.status(401).json({ message: "Unauthorized - Please login to access this resource" });
};

// Middleware to check if user is admin
export const isAdmin: RequestHandler = async (req: any, res, next) => {
  try {
    // First ensure user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - Please login to access this resource" });
    }

    // Get user from database to check role
    const user = await storage.getUser(req.user.id);
    // Check if role is 'admin' (case-insensitive comparison since it's stored as string)
    if (!user || !user.role || String(user.role).toLowerCase() !== 'admin') {
      return res.status(403).json({ message: "Forbidden - Admin access required" });
    }

    // Attach full user object to request
    req.user = user;
    next();
  } catch (error: any) {
    console.error("Error checking admin status:", error);
    return res.status(500).json({ message: "Error checking admin status" });
  }
};

