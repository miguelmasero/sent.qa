import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { clients, bookings, supplies } from "@db/schema";
import { eq } from "drizzle-orm";
import { suggestBookingTime } from "./ai";
import { processMessage } from "./nlp.js";

const WEBHOOK_URL = process.env.WEBHOOK_URL;

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

      // Missing code to handle successful login
    req.session.clientId = client.id;
    res.json({ success: true });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Bookings
  app.get("/api/bookings", requireAuth, async (req, res) => {
    try {
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

  app.post("/api/bookings", requireAuth, async (req, res) => {
    try {
      const suggestedTime = await suggestBookingTime(req.body.date);
      const booking = await db.insert(bookings).values({
        clientId: req.session.clientId,
        date: suggestedTime,
        status: "pending",
      }).returning();

      // Get client info for webhook
      const client = await db.query.clients.findFirst({
        where: eq(clients.id, req.session.clientId),
      });

      if (WEBHOOK_URL) {
        try {
          await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'booking_created',
              booking: booking[0],
              client: client
            })
          });
        } catch (error) {
          console.error('Webhook notification failed:', error);
        }
      }

      res.json(booking[0]);
    } catch (error) {
      console.error('Booking creation error:', error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  });

  // Supplies
  app.get("/api/supplies", requireAuth, async (req, res) => {
    try {
      const clientSupplies = await db.query.supplies.findMany({
        where: eq(supplies.clientId, req.session.clientId),
      });

      res.json(clientSupplies);
    } catch (error) {
      console.error('Supplies fetch error:', error);
      res.status(500).json({ error: "Failed to fetch supplies" });
    }
  });

  // AI Message Processing with Enhanced NLP
  app.post("/api/chat", requireAuth, async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Ensure clientId is defined before processing
      const clientId = req.session.clientId;
      if (typeof clientId !== 'number') {
        throw new Error('Invalid clientId');
      }

      // Process message with enhanced NLP
      const response = await processMessage(message, clientId);

      // Calculate processing time for monitoring
      const processingTime = Date.now() - startTime;

      // Enhanced logging with timing and session info
      console.log(`[NLP] Processing completed in ${processingTime}ms:`, {
        clientId: req.session.clientId,
        messageLength: message.length,
        responseLength: response.length,
        processingTime
      });

      res.json({ 
        response,
        success: true,
        processed_in_ms: processingTime
      });
    } catch (error) {
      console.error('[NLP] Processing error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        processingTime: Date.now() - startTime
      });

      res.status(500).json({ 
        error: "Failed to process message",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
