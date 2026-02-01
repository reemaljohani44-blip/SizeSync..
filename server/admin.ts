import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { isAuthenticated, isAdmin } from "./auth";

const router = Router();

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

router.get("/export-users", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const users = await storage.getAllUsers();
    const profiles = await storage.getAllProfiles();
    
    const profileMap = new Map(profiles.map(p => [p.userId, p]));
    
    const headers = [
      "User ID",
      "Email",
      "First Name",
      "Last Name",
      "Role",
      "Profile Name",
      "Age",
      "Gender",
      "Height (cm)",
      "Weight (kg)",
      "Chest (cm)",
      "Waist (cm)",
      "Hip (cm)",
      "Shoulder (cm)",
      "Arm Length (cm)",
      "Leg Length (cm)",
      "Thigh Circumference (cm)",
      "Inseam (cm)",
      "Wallet ID",
      "Profile Created At"
    ];
    
    const rows = users.map(user => {
      const profile = profileMap.get(user.id);
      return [
        escapeCSV(user.id),
        escapeCSV(user.email),
        escapeCSV(user.firstName),
        escapeCSV(user.lastName),
        escapeCSV(user.role),
        escapeCSV(profile?.name),
        escapeCSV(profile?.age),
        escapeCSV(profile?.gender),
        escapeCSV(profile?.height),
        escapeCSV(profile?.weight),
        escapeCSV(profile?.chest),
        escapeCSV(profile?.waist),
        escapeCSV(profile?.hip),
        escapeCSV(profile?.shoulder),
        escapeCSV(profile?.armLength),
        escapeCSV(profile?.legLength),
        escapeCSV(profile?.thighCircumference),
        escapeCSV(profile?.inseam),
        escapeCSV(profile?.walletId),
        escapeCSV(profile?.createdAt ? new Date(profile.createdAt).toISOString() : "")
      ].join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=sizesync-users-export-${new Date().toISOString().split("T")[0]}.csv`);
    res.send(csvContent);
    
  } catch (error: any) {
    console.error("Error exporting users:", error);
    res.status(500).json({ error: "Failed to export user data" });
  }
});

router.get("/export-users-token", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const adminToken = process.env.ADMIN_EXPORT_TOKEN;
    
    if (!adminToken) {
      return res.status(503).json({ error: "Admin export not configured" });
    }
    
    if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
      return res.status(401).json({ error: "Invalid or missing authorization token" });
    }
    
    const users = await storage.getAllUsers();
    const profiles = await storage.getAllProfiles();
    
    const profileMap = new Map(profiles.map(p => [p.userId, p]));
    
    const headers = [
      "User ID",
      "Email",
      "First Name",
      "Last Name",
      "Role",
      "Profile Name",
      "Age",
      "Gender",
      "Height (cm)",
      "Weight (kg)",
      "Chest (cm)",
      "Waist (cm)",
      "Hip (cm)",
      "Shoulder (cm)",
      "Arm Length (cm)",
      "Leg Length (cm)",
      "Thigh Circumference (cm)",
      "Inseam (cm)",
      "Wallet ID",
      "Profile Created At"
    ];
    
    const rows = users.map(user => {
      const profile = profileMap.get(user.id);
      return [
        escapeCSV(user.id),
        escapeCSV(user.email),
        escapeCSV(user.firstName),
        escapeCSV(user.lastName),
        escapeCSV(user.role),
        escapeCSV(profile?.name),
        escapeCSV(profile?.age),
        escapeCSV(profile?.gender),
        escapeCSV(profile?.height),
        escapeCSV(profile?.weight),
        escapeCSV(profile?.chest),
        escapeCSV(profile?.waist),
        escapeCSV(profile?.hip),
        escapeCSV(profile?.shoulder),
        escapeCSV(profile?.armLength),
        escapeCSV(profile?.legLength),
        escapeCSV(profile?.thighCircumference),
        escapeCSV(profile?.inseam),
        escapeCSV(profile?.walletId),
        escapeCSV(profile?.createdAt ? new Date(profile.createdAt).toISOString() : "")
      ].join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=sizesync-users-export-${new Date().toISOString().split("T")[0]}.csv`);
    res.send(csvContent);
    
  } catch (error: any) {
    console.error("Error exporting users:", error);
    res.status(500).json({ error: "Failed to export user data" });
  }
});

export default router;
