import {
  type Profile,
  type InsertProfile,
  type Recommendation,
  type User,
  type UpsertUser,
} from "@shared/schema";
import { getDb } from "./db";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Profile operations
  getProfile(userId: string): Promise<Profile | undefined>;
  getProfileById(id: string): Promise<Profile | undefined>;
  getAllProfiles(): Promise<Profile[]>;
  createProfile(userId: string, profile: InsertProfile): Promise<Profile>;
  updateProfile(id: string, profile: Partial<InsertProfile>): Promise<Profile>;
  
  // Recommendation operations
  getRecommendation(id: string): Promise<Recommendation | undefined>;
  createRecommendation(
    recommendation: Omit<Recommendation, "id" | "createdAt">
  ): Promise<Recommendation>;
  getRecommendationsByProfile(profileId: string): Promise<Recommendation[]>;
  getRecommendationsByUser(userId: string): Promise<Recommendation[]>;
  getAllRecommendations(): Promise<Recommendation[]>;
  deleteRecommendation(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const db = getDb();
    const user = await db.collection("users").findOne({ id });
    if (!user) {
      return undefined;
    }
    
    // Log for debugging
    console.log("=== STORAGE getUser DEBUG ===");
    console.log("User ID:", id);
    console.log("User role from DB:", (user as any).role);
    console.log("Has role field:", 'role' in user);
    console.log("All user keys:", Object.keys(user));
    console.log("Full user object:", JSON.stringify({ ...user, password: '[HIDDEN]' }, null, 2));
    console.log("=== END STORAGE getUser DEBUG ===");
    
    // Return user with role (don't default to 'user' - return what's actually in DB)
    return user as unknown as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const db = getDb();
    // Normalize email to lowercase and trim for consistent lookups
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await db.collection<User>("users").findOne({ email: normalizedEmail });
    if (user && !user.role) {
      // Default to 'user' if role is missing (for backward compatibility)
      user.role = 'user';
    }
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    const db = getDb();
    const users = await db.collection<User>("users").find({}).toArray();
    // Remove password from all users for security and ensure role is set
    return users.map(({ password, ...user }) => ({
      ...user,
      role: user.role || 'user', // Default to 'user' if role is missing
    } as User));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const db = getDb();
    const now = new Date();
    
    try {
      // Role is REQUIRED for new signups - validate it's present
      // Store role as string based on user's selection
      if (!userData.role || typeof userData.role !== 'string') {
        console.error("CRITICAL: Role is missing or invalid in userData:", userData.role);
        throw new Error("Role is required and must be a string");
      }
      
      // Store the role as a string (whatever the user selected)
      const finalRole = String(userData.role).trim();
      
      // Normalize email to lowercase and trim for consistency
      const normalizedEmail = String(userData.email || '').trim().toLowerCase();
      
      // Create user object as a plain object (not typed) to ensure MongoDB saves all fields
      // Build the object explicitly with role as a required field
      const newUser: Record<string, any> = {
        id: String(userData.id),
        email: normalizedEmail, // Use normalized email
        password: String(userData.password || ''),
        role: String(finalRole), // CRITICAL: Explicitly set role as string
        createdAt: now,
        updatedAt: now,
      };
      
      // Add optional fields only if they exist
      if (userData.firstName) {
        newUser.firstName = String(userData.firstName);
      }
      if (userData.lastName) {
        newUser.lastName = String(userData.lastName);
      }
      if (userData.profileImageUrl) {
        newUser.profileImageUrl = String(userData.profileImageUrl);
      }
      
      // Final validation - ensure role is set and is a string
      if (!newUser.role || typeof newUser.role !== 'string') {
        console.error("CRITICAL: Role validation failed after setting:", newUser.role);
        throw new Error("Role must be a string");
      }
      
      // Double-check: Force role to be a string and ensure it's in the object
      newUser['role'] = String(finalRole).trim();
      
      // Verify role is in the object before insertion
      if (!('role' in newUser) || !newUser.role) {
        console.error("CRITICAL: Role field is missing or empty from newUser object!");
        throw new Error("Role field is required and must be a non-empty string");
      }
      
      try {
        console.log("=== STORAGE DEBUG ===");
        console.log("Attempting to insert user:", { 
          id: newUser.id, 
          email: newUser.email, 
          role: newUser.role,
          roleType: typeof newUser.role,
          hasRole: 'role' in newUser,
          allKeys: Object.keys(newUser),
          roleValue: newUser.role,
          roleIsString: typeof newUser.role === 'string'
        });
        console.log("Full user object (without password):", JSON.stringify({ ...newUser, password: '[HIDDEN]' }, null, 2));
        console.log("Role field specifically:", newUser.role, "Type:", typeof newUser.role);
        
        // Use insertOne with explicit role field
        // Force role to be included by using $set in insertOne (if supported) or ensure it's in the object
        console.log("About to insert - newUser object keys:", Object.keys(newUser));
        console.log("About to insert - newUser.role value:", newUser.role, "type:", typeof newUser.role);
        
        // Use findOneAndUpdate with upsert to ensure role is saved
        // This approach ensures the role field is explicitly set using $set
        console.log("Using findOneAndUpdate with upsert to ensure role is saved...");
        
        // Build $set object explicitly to ensure role is included
        const setData: any = {
          id: newUser.id,
          email: normalizedEmail, // Use normalized email
          password: newUser.password,
          role: String(finalRole), // CRITICAL: Explicitly set role
          updatedAt: now,
        };
        
        // Add optional fields
        if (newUser.firstName) setData.firstName = newUser.firstName;
        if (newUser.lastName) setData.lastName = newUser.lastName;
        if (newUser.profileImageUrl) setData.profileImageUrl = newUser.profileImageUrl;
        
        const upsertResult = await db.collection("users").findOneAndUpdate(
          { id: newUser.id },
          {
            $set: setData,
            $setOnInsert: {
              createdAt: now,
            }
          },
          {
            upsert: true,
            returnDocument: 'after',
          }
        );
        
        let insertedUser = (upsertResult as any)?.value || upsertResult as any;
        
        if (!insertedUser) {
          console.error("Upsert failed: No document returned");
          // Fallback to insertOne
          console.log("Falling back to insertOne...");
          const insertResult = await db.collection("users").insertOne(newUser);
          
          if (!insertResult.insertedId) {
            throw new Error("Failed to insert user - no inserted ID returned");
          }
          
          // Force update role after insert
          await db.collection("users").updateOne(
            { _id: insertResult.insertedId },
            { $set: { role: String(finalRole) } }
          );
          
          const fallbackUser = await db.collection("users").findOne({ _id: insertResult.insertedId });
          if (fallbackUser) {
            insertedUser = fallbackUser;
          } else {
            throw new Error("Failed to retrieve inserted user");
          }
        }
        
        console.log("User upserted/inserted successfully");
        
        // Verify the inserted document has the role field
        const verifiedUser = await db.collection("users").findOne({ id: newUser.id });
        if (verifiedUser) {
          insertedUser = verifiedUser;
        }
        
        if (insertedUser) {
          console.log("Verification - Inserted user from DB:", {
            id: insertedUser.id,
            email: insertedUser.email,
            role: insertedUser.role,
            hasRole: 'role' in insertedUser,
            allKeys: Object.keys(insertedUser),
            fullDocument: JSON.stringify(insertedUser, null, 2)
          });
          
          // If role is STILL missing, try updating again
          if (!insertedUser.role || typeof insertedUser.role !== 'string') {
            console.error("CRITICAL: Role STILL missing or invalid! Trying to update again...");
            console.error("Missing role details - insertedUser:", JSON.stringify(insertedUser, null, 2));
            
            // Try updating by _id
            const updateResult = await db.collection("users").updateOne(
              { _id: insertedUser._id || (insertedUser as any)._id },
              { $set: { role: String(finalRole) } }
            );
            console.log("Update attempt result:", updateResult);
            
            // Also try by id field as backup
            if (updateResult.modifiedCount === 0) {
              const updateResult2 = await db.collection("users").updateOne(
                { id: newUser.id },
                { $set: { role: String(finalRole) } }
              );
              console.log("Update by id field result:", updateResult2);
            }
            
            // Fetch again to verify
            const updatedUser = await db.collection("users").findOne({ id: newUser.id });
            if (updatedUser) {
              console.log("After update - User role:", updatedUser.role);
              if (!updatedUser.role) {
                console.error("STILL MISSING ROLE AFTER MULTIPLE UPDATES! This is a critical MongoDB issue.");
                // Last resort: try to replace the entire document
                const replaceResult = await db.collection("users").replaceOne(
                  { id: newUser.id },
                  { ...updatedUser, role: String(finalRole) }
                );
                console.log("Replace document result:", replaceResult);
                
                const finalUser = await db.collection("users").findOne({ id: newUser.id });
                if (finalUser && finalUser.role) {
                  return finalUser as unknown as User;
                }
              } else {
                return updatedUser as unknown as User;
              }
            }
          } else {
            console.log("✅ Role successfully saved:", insertedUser.role);
          }
          
          return insertedUser as unknown as User;
        } else {
          console.error("CRITICAL: Could not find inserted user after insertion!");
          // Fallback: return newUser if we can't verify
          console.warn("Could not verify inserted user, returning newUser object");
          return newUser as unknown as User;
        }
      } catch (insertError: any) {
        console.error("Insert error caught:", {
          message: insertError?.message,
          code: insertError?.code,
          codeName: insertError?.codeName,
          name: insertError?.name,
        });
        
        // Check if it's a duplicate key error (user already exists)
        if (insertError.code === 11000 || insertError.codeName === 'DuplicateKey') {
          // User already exists, try to fetch and update it
          const existingUser = await this.getUser(userData.id).catch(() => 
            // If getUser fails, try by email
            this.getUserByEmail(userData.email || '')
          );
          
          if (existingUser) {
            // Update existing user - ensure role is always included
            // Store role as string based on user's selection
            const updateRole = userData.role && typeof userData.role === 'string'
              ? String(userData.role).trim()
              : (existingUser.role && typeof existingUser.role === 'string')
                ? String(existingUser.role).trim()
                : 'user';
            
            // Build update object explicitly to ensure role is included
            const updateData: any = {
              role: String(updateRole), // Store role as string
              updatedAt: now,
            };
            
            // Add other fields
            if (userData.email) updateData.email = userData.email;
            if (userData.password) updateData.password = userData.password;
            if (userData.firstName) updateData.firstName = userData.firstName;
            if (userData.lastName) updateData.lastName = userData.lastName;
            if (userData.profileImageUrl) updateData.profileImageUrl = userData.profileImageUrl;
            
            console.log("Updating existing user with data:", { 
              id: existingUser.id, 
              role: updateData.role,
              roleType: typeof updateData.role,
              hasRole: 'role' in updateData,
              allKeys: Object.keys(updateData)
            });
            
            const result = await db.collection("users").findOneAndUpdate(
              { id: existingUser.id },
              {
                $set: updateData,
              },
              {
                returnDocument: "after",
              }
            );

            const updatedUser = (result as any)?.value;
            if (!updatedUser) {
              // If update fails, return the existing user
              return existingUser;
            }
            
            // Verify role was saved
            if (!updatedUser.role || (updatedUser.role !== 'admin' && updatedUser.role !== 'user')) {
              console.error("CRITICAL: Role missing after update! Forcing update...");
              await db.collection("users").updateOne(
                { id: existingUser.id },
                { $set: { role: String(updateRole) } }
              );
              // Fetch again
              const finalUser = await db.collection("users").findOne({ id: existingUser.id });
              if (finalUser) {
                return finalUser as unknown as User;
              }
            }
            
            return updatedUser as unknown as User;
          }
          
          // User exists but couldn't fetch it - throw descriptive error
          throw new Error("User with this email or ID already exists");
        }
        
        // For other errors, re-throw
        throw insertError;
      }
    } catch (error: any) {
      console.error("Error upserting user:", error);
      console.error("Error details:", {
        message: error?.message,
        code: error?.code,
        codeName: error?.codeName,
        name: error?.name,
        stack: error?.stack,
      });
      // Re-throw the original error to preserve the error type and message
      throw error;
    }
  }

  // Profile operations
  async getProfile(userId: string): Promise<Profile | undefined> {
    const db = getDb();
    const profile = await db.collection<Profile>("profiles").findOne({ userId });
    return profile || undefined;
  }

  async getProfileById(id: string): Promise<Profile | undefined> {
    const db = getDb();
    const profile = await db.collection<Profile>("profiles").findOne({ id });
    return profile || undefined;
  }

  async getAllProfiles(): Promise<Profile[]> {
    const db = getDb();
    const profiles = await db.collection<Profile>("profiles").find({}).toArray();
    return profiles;
  }

  async createProfile(userId: string, insertProfile: InsertProfile): Promise<Profile> {
    const db = getDb();
    const walletId = `SW-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const now = new Date();
    
    const profile: Profile = {
      id: randomUUID(),
      userId,
      walletId,
      ...insertProfile,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection<Profile>("profiles").insertOne(profile);
    return profile;
  }

  async updateProfile(
    id: string,
    updateData: Partial<InsertProfile>
  ): Promise<Profile> {
    const db = getDb();
    
    const result = await db.collection<Profile>("profiles").findOneAndUpdate(
      { id },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
      }
    );

    if (!result || !(result as any).value) {
      throw new Error("Profile not found");
    }

    return (result as any).value;
  }

  // Recommendation operations
  async getRecommendation(id: string): Promise<Recommendation | undefined> {
    const db = getDb();
    const recommendation = await db.collection<Recommendation>("recommendations").findOne({ id });
    return recommendation || undefined;
  }

  async createRecommendation(
    data: Omit<Recommendation, "id" | "createdAt">
  ): Promise<Recommendation> {
    const db = getDb();
    const recommendation: Recommendation = {
      id: randomUUID(),
      ...data,
      createdAt: new Date(),
    };

    await db.collection<Recommendation>("recommendations").insertOne(recommendation);
    return recommendation;
  }

  async getRecommendationsByProfile(
    profileId: string
  ): Promise<Recommendation[]> {
    const db = getDb();
    return await db
      .collection<Recommendation>("recommendations")
      .find({ profileId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getRecommendationsByUser(userId: string): Promise<Recommendation[]> {
    const db = getDb();
    return await db
      .collection<Recommendation>("recommendations")
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async getAllRecommendations(): Promise<Recommendation[]> {
    const db = getDb();
    return await db
      .collection<Recommendation>("recommendations")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
  }

  async deleteRecommendation(id: string): Promise<void> {
    const db = getDb();
    const result = await db.collection<Recommendation>("recommendations").deleteOne({ id });
    
    if (result.deletedCount === 0) {
      throw new Error("Recommendation not found");
    }
  }
}

export const storage = new DatabaseStorage();
