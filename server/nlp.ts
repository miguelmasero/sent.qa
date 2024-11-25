import nlp from 'compromise';
import stringSimilarity from 'string-similarity';
import { format, addDays, startOfDay, endOfDay, isWeekend, parseISO } from 'date-fns';
import { db } from "../db";
import { bookings, supplies } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

// Response templates with enhanced natural variations and context awareness
const responseTemplates = {
  smart_booking: [
    "I see you're interested in booking for {date}. That's {dayType}. {availability}",
    "Looking at {date}, which is {dayType}. {availability}",
    "For {date}, which falls on {dayType}, {availability}"
  ],
  context_aware: [
    "Based on your previous bookings, I notice you prefer {preference}. Would you like to stick to that?",
    "I see you usually book {preference}. Should we look for similar times?",
    "Given your booking history showing preference for {preference}, would you like something similar?"
  ],
  booking_info: [
    "Your next cleaning is scheduled for {date} at {time}.",
    "I see your booking for {date} at {time}.",
    "You have a cleaning appointment on {date} at {time}.",
  ],
  no_bookings: [
    "You don't have any upcoming cleanings scheduled. Would you like to book one now?",
    "I don't see any upcoming bookings. Would you like me to help you schedule a cleaning?",
    "Your calendar is clear of upcoming cleanings. Shall we schedule one?",
  ],
  booking_modification: [
    "I can help you modify your booking. Please select a new date and time from the calendar above.",
    "Sure, let's change your booking. You can pick a new time from the available slots in the calendar.",
    "I'll help you reschedule. Just choose a new date and time that works better for you.",
  ],
  booking_confirmation: [
    "Great! Your cleaning has been scheduled for {date} at {time}. Would you like me to send you a reminder?",
    "Perfect! I've booked your cleaning for {date} at {time}. Is there anything else you need?",
    "All set! Your cleaning is confirmed for {date} at {time}. Let me know if you need to make any changes.",
  ],
  supplies_request: [
    "I'll add {item} to your supplies list. Is there anything else you need?",
    "I've noted down that you need {item}. Would you like to add any other supplies?",
    "Got it - {item} has been added to your list. What else can I help you with?",
  ],
  supplies_status: [
    "Here's what's currently on your supplies list: {items}",
    "These are the supplies we have noted: {items}",
    "Your current supplies list includes: {items}",
  ],
  weekend_warning: [
    "Just to note - we typically don't schedule cleanings on weekends. Would you like to choose a weekday instead?",
    "Our cleaning services run Monday through Friday. Shall we look at available weekday slots?",
    "We operate on weekdays only. Would you like to see our weekday availability?",
  ],
  general_help: [
    "I'm here to help! I can assist with scheduling cleanings, managing supplies, or answering any questions you have.",
    "How can I assist you today? I can help with bookings, supplies, or answer general questions about our services.",
    "Welcome! I can help you schedule cleanings, manage your supply list, or provide information about our services.",
  ],
  error_understanding: [
    "I'm not quite sure I understood that. Could you please rephrase your request?",
    "I want to help, but I'm having trouble understanding. Could you say that differently?",
    "Sorry, I didn't catch that. Could you explain what you need in different words?",
  ],
};

interface MessageContext {
  clientId: number;
  type: 'booking' | 'supplies' | 'general';
  intent?: string;
  entities?: Record<string, any>;
}

interface MessageEntities {
  date?: string;
  items?: string[];
  time?: string;
  location?: string;
  duration?: string;
}

interface MessageContext {
  clientId: number;
  type: 'booking' | 'supplies' | 'general';
  intent?: 'modify' | 'cancel' | 'create' | 'view' | 'request' | 'status' | 'unknown';
  entities?: MessageEntities;
}

function getRandomResponse(responses: string[], replacements: Record<string, string> = {}): string {
  const template = responses[Math.floor(Math.random() * responses.length)];
  return Object.entries(replacements).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, value),
    template
  );
}

interface DateEntity {
  date: string;
}

function extractDates(text: string): DateEntity[] {
  const doc = nlp(text);
  const dates: DateEntity[] = [];
  
  // Extract explicit dates
  const dateRegex = /\b\d{4}-\d{2}-\d{2}\b/g;
  const matches = text.match(dateRegex) || [];
  dates.push(...matches.map(date => ({ date })));

  // Handle relative dates
  if (doc.has('(today|tomorrow|next|this)')) {
    const base = new Date();
    if (doc.has('tomorrow')) {
      base.setDate(base.getDate() + 1);
    } else if (doc.has('next week')) {
      base.setDate(base.getDate() + 7);
    }
    dates.push({ date: base.toISOString().split('T')[0] });
  }

  return dates;
}

interface MessageEntities {
  date?: string;
  items: string[];
}

function analyzeMessage(message: string): MessageContext {
  const doc = nlp(message.toLowerCase());
  const context: MessageContext & { entities: MessageEntities } = {
    type: 'general',
    intent: 'unknown',
    entities: {
      date: undefined,
      items: [],
      time: undefined,
      location: undefined,
      duration: undefined
    },
    clientId: 0 // This will be set by the processMessage function
  };

  // Improve intent detection with confidence scoring
  const intentScores: Record<string, number> = {
    booking: 0,
    supplies: 0,
    general: 0
  };

  // Score based on key terms
  if (doc.has('(booking|schedule|appointment|cleaning|date|time)')) intentScores.booking += 0.5;
  if (doc.has('(reschedule|change|modify|cancel)')) intentScores.booking += 0.3;
  if (doc.has('(supplies|products|items|need|stock)')) intentScores.supplies += 0.5;
  if (doc.has('(list|inventory|status)')) intentScores.supplies += 0.3;

  // Determine type based on highest score
  const type = Object.entries(intentScores)
    .reduce((a, b) => a[1] > b[1] ? a : b)[0] as MessageContext['type'];
  context.type = type;
  
  // Check for booking-related content
  if (doc.has('(booking|schedule|appointment|cleaning|date|time|reschedule|change|modify|cancel)')) {
    context.type = 'booking';
    
    // Determine specific booking intent
    if (doc.has('(change|modify|reschedule|move)')) {
      context.intent = 'modify';
    } else if (doc.has('cancel')) {
      context.intent = 'cancel';
    } else if (doc.has('(schedule|book|make|new)')) {
      context.intent = 'create';
    } else if (doc.has('(show|see|check|view|what|when)')) {
      context.intent = 'view';
    }
    
    // Extract date/time information if present
    const dates = extractDates(message);
    if (dates.length > 0) {
      context.entities.date = dates[0].date;
    }
  }
  
  // Check for supplies-related content
  else if (doc.has('(supplies|products|items|need|stock|inventory|cleaning supplies)')) {
    context.type = 'supplies';
    
    if (doc.has('(need|want|require|get|order)')) {
      context.intent = 'request';
      const items = doc
        .match('(need|want|require|get|order) [.]')
        .out('array')
        .map((item: string) => item.replace(/^(need|want|require|get|order)\s/, '').trim());
      if (items.length > 0) {
        context.entities.items = items;
      }
    } else if (doc.has('(list|show|see|check|what|status)')) {
      context.intent = 'status';
    }
  }
  
  return context;
}

export async function processMessage(message: string, clientId: number): Promise<string> {
  try {
    // Enhance message with date context
    const now = new Date();
    const context = {
      ...analyzeMessage(message),
      clientId,
      timestamp: now,
      dayOfWeek: format(now, 'EEEE'),
      timeOfDay: format(now, 'ha')
    };

    // Log incoming request for debugging
    console.log(`[NLP] Processing message with context:`, {
      type: context.type,
      intent: context.intent,
      dayOfWeek: context.dayOfWeek,
      timeOfDay: context.timeOfDay
    });
    
    switch (context.type) {
    case 'booking': {
      switch (context.intent) {
        case 'modify': {
          return getRandomResponse(responseTemplates.booking_modification);
        }
        
        case 'create': {
          if (context.entities?.date) {
            const bookingDate = new Date(context.entities.date);
            if (isWeekend(bookingDate)) {
              return getRandomResponse(responseTemplates.weekend_warning);
            }
            // Additional booking logic can be added here
          }
          return getRandomResponse(responseTemplates.booking_modification);
        }
        
        case 'view': {
          const upcomingBooking = await db.query.bookings.findFirst({
            where: and(
              eq(bookings.clientId, clientId),
              gte(bookings.date, startOfDay(new Date()))
            ),
            orderBy: (bookings, { asc }) => [asc(bookings.date)],
          });

          if (upcomingBooking) {
            const date = format(new Date(upcomingBooking.date), 'EEEE, MMMM do');
            const time = format(new Date(upcomingBooking.date), 'h:mm a');
            return getRandomResponse(responseTemplates.booking_info, { date, time });
          }
          return getRandomResponse(responseTemplates.no_bookings);
        }
        
        default:
          return getRandomResponse(responseTemplates.error_understanding);
      }
    }
    
    case 'supplies': {
      switch (context.intent) {
        case 'request': {
          if (context.entities?.items?.[0]) {
            // Add to supplies list logic can be added here
            return getRandomResponse(responseTemplates.supplies_request, { 
              item: context.entities.items[0] 
            });
          }
          return "What supplies do you need? I can add them to your list.";
        }
        
        case 'status': {
          const clientSupplies = await db.query.supplies.findMany({
            where: eq(supplies.clientId, clientId),
          });
          
          if (clientSupplies.length > 0) {
            const items = clientSupplies
              .map(supply => supply.item)
              .join(', ');
            return getRandomResponse(responseTemplates.supplies_status, { items });
          }
          return "You don't have any supplies on your list. Would you like to add some?";
        }
        
        default:
          return "What supplies do you need? I can help you manage your cleaning supplies.";
      }
    }
    
    default:
      return getRandomResponse(responseTemplates.general_help);
  }
  } catch (error) {
    console.error('[NLP] Error processing message:', error);
    return "I apologize, but I'm having trouble understanding your request right now. Could you please try rephrasing it?";
  }
}
