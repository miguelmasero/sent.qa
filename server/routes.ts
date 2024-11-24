import type { Express } from "express";
import { db } from "../db";
import { clients, bookings, supplies } from "@db/schema";
import { eq } from "drizzle-orm";
import { suggestBookingTime } from "./ai";

export function registerRoutes(app: Express) {
  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    const { pin } = req.body;
    const client = await db.query.clients.findFirst({
      where: eq(clients.pin, pin),
    });
    
    if (!client) {
      return res.status(401).json({ error: "Invalid PIN" });
    }

    req.session.clientId = client.id;
    res.json({ success: true });
  });

  // Client info
  app.get("/api/client", async (req, res) => {
    if (!req.session.clientId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const client = await db.query.clients.findFirst({
      where: eq(clients.id, req.session.clientId),
    });
    
    res.json(client);
  });

  // Bookings
  app.get("/api/bookings", async (req, res) => {
    if (!req.session.clientId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const clientBookings = await db.query.bookings.findMany({
      where: eq(bookings.clientId, req.session.clientId),
      orderBy: (bookings, { asc }) => [asc(bookings.date)],
    });

    res.json(clientBookings);
  });

  app.post("/api/bookings", async (req, res) => {
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
  });

  // Supplies
  app.get("/api/supplies", async (req, res) => {
    if (!req.session.clientId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const clientSupplies = await db.query.supplies.findMany({
      where: eq(supplies.clientId, req.session.clientId),
    });

    res.json(clientSupplies);
  });
}
