import type { Express, Request, Response, NextFunction } from "express";
import { processMessage } from "./aiAssistant";
import { bookings, clients, supplies, interactions } from "@db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { suggestBookingTime } from "./ai";
import { handleChat } from './openai';

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

      req.session.clientId = client.id;
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: "Failed to login" });
        }
        res.json({ success: true });
      });
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
  app.post("/api/chat", requireAuth, async (req, res) => {
    try {
      if (!req.session.clientId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { message, threadId } = req.body;
      
      // Process message with enhanced NLP
      const nlpResponse = await processMessage(message, req.session.clientId);
      
      // Get OpenAI response
      const aiResponse = await handleChat(message, threadId);
      
      // Combine NLP and AI responses for more contextual awareness
      const response = {
        ...aiResponse,
        nlpContext: {
          intent: nlpResponse.action,
          confidence: nlpResponse.confidence,
          suggestedAction: nlpResponse.action
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error('Chat processing error:', error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });
}
