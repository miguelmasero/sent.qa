import nlp from 'compromise';
import { db } from "../db";
import { bookings, supplies } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { addHours, format, startOfDay, endOfDay } from "date-fns";

interface AIResponse {
  text: string;
  action?: string;
  data?: any;
}

export async function processMessage(message: string, clientId: number): Promise<AIResponse> {
  const doc = nlp(message.toLowerCase());
  
  // Detect intent categories
  const isBookingModification = doc.has('(modify|change|reschedule|update|move) booking') ||
                               doc.has('(different|another|new) (time|date)');
  
  const isBookingCancellation = doc.has('cancel booking') || 
                               doc.has('cancel (my|the) appointment');
  
  const isSupplyRequest = doc.has('(need|want|require) (supplies|products|cleaning)') ||
                         doc.has('run out of') ||
                         doc.has('more (supplies|products)');
  
  const isAvailabilityQuestion = doc.has('(when|what time|which days) (is|are|do) you') ||
                                doc.has('available') ||
                                doc.has('schedule');

  // Handle different intents
  if (isBookingModification) {
    const clientBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.clientId, clientId),
        gte(bookings.date, startOfDay(new Date()))
      ),
    });
    
    if (clientBookings.length === 0) {
      return {
        text: "I don't see any upcoming bookings to modify. Would you like to schedule a new cleaning service?",
        action: "suggest_new_booking"
      };
    }
    
    return {
      text: "I can help you modify your booking. Here are your upcoming appointments. Which one would you like to change?",
      action: "show_bookings",
      data: clientBookings
    };
  }

  if (isBookingCancellation) {
    const upcomingBooking = await db.query.bookings.findFirst({
      where: and(
        eq(bookings.clientId, clientId),
        gte(bookings.date, startOfDay(new Date()))
      ),
    });
    
    if (!upcomingBooking) {
      return {
        text: "I don't see any upcoming bookings to cancel. Is there something else I can help you with?",
      };
    }
    
    return {
      text: `I can help you cancel your booking scheduled for ${format(new Date(upcomingBooking.date), 'PPP p')}. Would you like to proceed with the cancellation?`,
      action: "confirm_cancellation",
      data: upcomingBooking
    };
  }

  if (isSupplyRequest) {
    const currentSupplies = await db.query.supplies.findMany({
      where: eq(supplies.clientId, clientId),
    });
    
    return {
      text: "I'll help you with your supply request. You can add items to your supply list, and our team will make sure to bring them during the next cleaning.",
      action: "show_supplies",
      data: currentSupplies
    };
  }

  if (isAvailabilityQuestion) {
    return {
      text: "We're available Monday through Thursday, from 9 AM to 5 PM. Friday through Sunday are currently not available for bookings. Would you like to see available time slots for a specific date?",
      action: "show_calendar"
    };
  }

  // Default response for unrecognized intents
  return {
    text: "I'm here to help with booking modifications, cancellations, supply requests, and scheduling questions. Could you please provide more details about what you need?",
    action: "show_suggestions"
  };
}
