import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import chatRouter from "./routes/chat";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api
  
  // Add chat route for AI business assistant
  app.use("/api", chatRouter);

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  const httpServer = createServer(app);

  return httpServer;
}
