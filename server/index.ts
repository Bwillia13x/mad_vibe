import express, { type Request, Response, NextFunction } from "express";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Respond and log the error without crashing the server
    try {
      res.status(status).json({ message });
    } catch {}
    log(`Unhandled error: ${message}`, "express");
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Initialize demo data before starting the server
  try {
    // Import storage here to avoid circular dependencies
    const { storage } = await import("./storage");
    await storage.seedDemoData();
    log('Demo data initialized successfully');
  } catch (error) {
    log(`Error initializing demo data: ${error}`);
    // Continue server startup even if seeding fails
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const desiredPort = parseInt(process.env.PORT || '5000', 10);
  const host = "0.0.0.0";

  async function tryListen(portToUse: number): Promise<boolean> {
    return await new Promise<boolean>((resolve) => {
      const onError = (err: any) => {
        log(`listen error on ${host}:${portToUse} -> ${err?.code || err?.message || err}`, "express");
        server.off('listening', onListening);
        server.off('error', onError);
        resolve(false);
      };
      const onListening = () => {
        const address = server.address();
        // @ts-ignore - Node typings allow address to be string | AddressInfo | null
        const actualPort = typeof address === 'object' && address ? address.port : portToUse;
        log(`serving on port ${actualPort}`);
        // Optionally write the bound port to a file for smoke tests or tooling
        const portFile = process.env.PORT_FILE;
        if (portFile) {
          try {
            fs.writeFileSync(portFile, String(actualPort), { encoding: 'utf8' });
          } catch {}
        }
        server.off('error', onError);
        server.off('listening', onListening);
        resolve(true);
      };
      server.once('error', onError);
      server.once('listening', onListening);
      try {
        server.listen({ port: portToUse, host });
      } catch (err) {
        onError(err);
      }
    });
  }

  // Attempt to bind to the desired port, then try a few alternatives
  let bound = await tryListen(desiredPort);
  if (!bound) {
    for (let i = 1; i <= 5 && !bound; i++) {
      const nextPort = desiredPort + i;
      bound = await tryListen(nextPort);
    }
    if (!bound) {
      log(`Could not bind to ${host} on ${desiredPort}-${desiredPort + 5}.`, "express");
    }
  }
})();
