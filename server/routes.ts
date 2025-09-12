import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import chatRouter from "./routes/chat";
import { getNow, setFreeze, getFreeze } from "./lib/clock";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api
  
  // Add chat route for AI business assistant
  app.use("/api", chatRouter);

  // Basic health endpoint for operational checks
  app.get("/api/health", async (_req, res) => {
    const aiDemoMode = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === '';
    res.json({
      status: "ok",
      env: app.get("env"),
      timestamp: getNow().toISOString(),
      aiDemoMode,
      scenario: storage.getCurrentScenario?.() ?? 'default',
      seed: storage.getCurrentSeed?.() ?? null,
      freeze: getFreeze()
    });
  });

  // Demo scenario reseed endpoint (for demos only)
  app.post("/api/demo/seed", async (req, res) => {
    try {
      const scenario = String((req.query.scenario as string) || req.body?.scenario || 'default');
      const seed = req.query.seed ? parseInt(req.query.seed as string, 10) : (req.body?.seed as number | undefined);
      await storage.seedDemoData(scenario, seed);
      res.json({ ok: true, scenario, seed: storage.getCurrentSeed?.() });
    } catch (error) {
      console.error('Error reseeding demo data:', error);
      res.status(500).json({ message: 'Failed to reseed demo data' });
    }
  });

  // Business Profile endpoints
  app.get("/api/profile", async (req, res) => {
    try {
      const profile = await storage.getBusinessProfile();
      if (!profile) {
        return res.status(404).json({ message: "Business profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error getting business profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Services endpoints
  app.get("/api/services", async (req, res) => {
    try {
      const services = await storage.getAllServices();
      res.json(services);
    } catch (error) {
      console.error("Error getting services:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/services/:id", async (req, res) => {
    try {
      const service = await storage.getService(req.params.id);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error getting service:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Staff endpoints
  app.get("/api/staff", async (req, res) => {
    try {
      const staff = await storage.getAllStaff();
      res.json(staff);
    } catch (error) {
      console.error("Error getting staff:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/staff/:id", async (req, res) => {
    try {
      const staffMember = await storage.getStaff(req.params.id);
      if (!staffMember) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      res.json(staffMember);
    } catch (error) {
      console.error("Error getting staff member:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Customer endpoints (limited for privacy)
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      // Return limited customer data for privacy
      const publicCustomers = customers.map(customer => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        preferences: customer.preferences,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt
      }));
      res.json(publicCustomers);
    } catch (error) {
      console.error("Error getting customers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Appointments endpoints
  app.get("/api/appointments", async (req, res) => {
    try {
      let appointments;
      
      // Check for day filter
      if (req.query.day === 'today') {
        appointments = await storage.getAppointmentsByDay(getNow());
      } else if (req.query.date) {
        const filterDate = new Date(req.query.date as string);
        if (isNaN(filterDate.getTime())) {
          return res.status(400).json({ message: "Invalid date format" });
        }
        appointments = await storage.getAppointmentsByDay(filterDate);
      } else {
        appointments = await storage.getAllAppointments();
      }
      
      res.json(appointments);
    } catch (error) {
      console.error("Error getting appointments:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Analytics export (CSV)
  app.get("/api/analytics/export", async (_req, res) => {
    try {
      const analytics = await storage.getAllAnalytics();
      const header = [
        'date','totalRevenue','totalAppointments','totalCustomers','averageRating','utilizationRate','customerSatisfaction','noShowRate','repeatCustomerRate','averageServiceDuration'
      ];
      const rows = analytics.map(a => [
        new Date(a.date).toISOString(),
        a.totalRevenue,
        a.totalAppointments,
        a.totalCustomers,
        a.averageRating,
        a.utilizationRate,
        a.customerSatisfaction,
        a.noShowRate,
        a.repeatCustomerRate,
        a.averageServiceDuration
      ]);
      const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics.csv"');
      res.send(csv);
    } catch (error) {
      console.error("Error exporting analytics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Demo time controls
  app.post("/api/demo/time", async (req, res) => {
    try {
      const clear = req.query.clear === '1' || (req.body && req.body.clear === true);
      if (clear) {
        setFreeze(null);
      } else {
        const date = String((req.query.date as string) || (req.body && req.body.date) || getNow().toISOString());
        setFreeze(date);
      }
      await storage.seedDemoData(storage.getCurrentScenario?.(), storage.getCurrentSeed?.());
      res.json({ ok: true, freeze: getFreeze() });
    } catch (error) {
      console.error('Error setting demo time:', error);
      res.status(400).json({ message: 'Invalid date' });
    }
  });

  // Reset demo to defaults (clear freeze, default scenario/seed)
  app.post("/api/demo/reset", async (_req, res) => {
    try {
      setFreeze(null);
      await storage.seedDemoData('default', undefined);
      res.json({ ok: true, scenario: storage.getCurrentScenario?.(), seed: storage.getCurrentSeed?.(), freeze: getFreeze() });
    } catch (error) {
      console.error('Error resetting demo:', error);
      res.status(500).json({ message: 'Failed to reset demo' });
    }
  });

  app.get("/api/appointments/:id", async (req, res) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      console.error("Error getting appointment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Inventory endpoints
  app.get("/api/inventory", async (req, res) => {
    try {
      const inventory = await storage.getAllInventoryItems();
      res.json(inventory);
    } catch (error) {
      console.error("Error getting inventory:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/inventory/:id", async (req, res) => {
    try {
      const item = await storage.getInventoryItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error getting inventory item:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Analytics endpoints
  app.get("/api/analytics", async (req, res) => {
    try {
      const analytics = await storage.getAllAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error getting analytics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/analytics/:id", async (req, res) => {
    try {
      const analyticsData = await storage.getAnalytics(req.params.id);
      if (!analyticsData) {
        return res.status(404).json({ message: "Analytics data not found" });
      }
      res.json(analyticsData);
    } catch (error) {
      console.error("Error getting analytics data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
