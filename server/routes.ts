import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { clients, bookings, supplies } from "@db/schema";
import { eq } from "drizzle-orm";
import { suggestBookingTime } from "./ai";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.clientId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export function registerRoutes(app: Express) {
  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { pin } = req.body;
      const client = await db.query.clients.findFirst({
        where: eq(clients.pin, pin),
      });
      
      if (!client) {
        return res.status(401).json({ error: "Invalid PIN" });
      }

      req.session.clientId = client.id;
      await new Promise((resolve) => req.session.save(resolve));
      res.json({ success: true });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // Client info
  app.get("/api/client", requireAuth, async (req, res) => {
    try {
      if (!req.session.clientId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const client = await db.query.clients.findFirst({
        where: eq(clients.id, req.session.clientId),
      });
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error('Client fetch error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Bookings
  app.get("/api/bookings", requireAuth, async (req, res) => {
    try {
      if (!req.session.clientId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const clientBookings = await db.query.bookings.findMany({
        where: eq(bookings.clientId, req.session.clientId),
        orderBy: (bookings, { asc }) => [asc(bookings.date)],
      });

      res.json(clientBookings);
    } catch (error) {
      console.error('Bookings fetch error:', error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      if (!req.session.clientId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const suggestedTime = await suggestBookingTime(req.body.date);
      const booking = await db.insert(bookings).values({
        clientId: req.session.clientId,
        date: suggestedTime,
        status: "pending",
      }).returning();

      res.json(booking[0]);
    } catch (error) {
      console.error('Booking creation error:', error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  // Supplies
  app.get("/api/supplies", requireAuth, async (req, res) => {
    try {
      if (!req.session.clientId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const clientSupplies = await db.query.supplies.findMany({
        where: eq(supplies.clientId, req.session.clientId),
      });

      res.json(clientSupplies);
    } catch (error) {
      console.error('Supplies fetch error:', error);
      res.status(500).json({ error: "Failed to fetch supplies" });
    }
  });
}
