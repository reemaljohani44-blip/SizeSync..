import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // CRITICAL: Only apply Vite middleware to non-API routes
  // We must check BEFORE applying Vite middleware to prevent it from intercepting API calls
  // This middleware MUST run before vite.middlewares to prevent API routes from being processed
  app.use((req, res, next) => {
    const url = req.originalUrl || req.url || '';
    const requestPath = req.path || '';
    
    // Skip API routes completely - they must be handled by Express API handlers
    // Check both originalUrl and path to be safe
    if (url.startsWith("/api") || requestPath.startsWith("/api")) {
      // Immediately skip - don't let Vite process this
      // If response hasn't been sent, it means no route matched - return 404 JSON
      if (!res.headersSent) {
        // This shouldn't happen if routes are registered correctly, but handle it anyway
        console.warn(`[Vite] API route reached Vite middleware without being handled: ${req.method} ${url}`);
      }
      return next();
    }
    
    // For non-API routes, use Vite middleware
    vite.middlewares(req, res, next);
  });

  // Catch-all route for serving React app (ONLY for non-API routes)
  // This will only be reached if no route matched AND it's not an API route
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl || req.url || '';
    const requestPath = req.path || '';

    // CRITICAL: Skip API routes - they must return JSON, not HTML
    // Check both originalUrl and path to be safe
    if (url.startsWith("/api") || requestPath.startsWith("/api")) {
      // If we reach here with an API route, it means no route handler matched
      // Return a proper JSON 404 error instead of HTML
      console.error(`[Vite Catch-all] API route not found: ${req.method} ${url}`);
      if (!res.headersSent) {
        res.status(404).json({ error: `API route not found: ${req.method} ${url}` });
      }
      return;
    }

    // For non-API routes, serve the React app
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  // But skip API routes - they must return JSON, not HTML
  app.use("*", (req, res, next) => {
    // CRITICAL: Skip API routes - they must be handled by Express API handlers
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
