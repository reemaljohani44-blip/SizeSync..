/**
 * Migration script to add 'role' field to existing users
 * Run this once to update all existing users without a role field
 */

import { getDb } from "./db";
import type { User } from "@shared/schema";

async function migrateUsersRole() {
  try {
    const db = getDb();
    const usersCollection = db.collection<User>("users");

    // Find all users without a role field
    const usersWithoutRole = await usersCollection.find({
      $or: [
        { role: { $exists: false } },
        { role: null },
        { role: undefined },
      ],
    }).toArray();

    console.log(`Found ${usersWithoutRole.length} users without a role field`);

    if (usersWithoutRole.length === 0) {
      console.log("No users need migration. All users already have a role field.");
      return;
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

    console.log(`Successfully updated ${result.modifiedCount} users with default role 'user'`);
    console.log("Migration completed successfully!");
  } catch (error: any) {
    console.error("Error during migration:", error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateUsersRole()
    .then(() => {
      console.log("Migration script finished");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export { migrateUsersRole };

