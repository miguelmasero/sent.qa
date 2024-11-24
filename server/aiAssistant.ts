import nlp from 'compromise';
import { db } from "../db";
import { bookings, interactions } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { addHours, format, startOfDay, endOfDay, parseISO } from "date-fns";

interface AIResponse {
  text: string;
  action?: string;
  data?: any;
  confidence?: number;
}

// Enhanced NLP patterns for intent recognition with contextual awareness
const intentPatterns = {
  booking: {
    modification: {
      keywords: ['modify', 'change', 'reschedule', 'update', 'move', 'switch', 'adjust', 'different', 'another'],
      context: ['time', 'date', 'day', 'appointment', 'schedule', 'booking'],
      priority: 2
    },
    cancellation: {
      keywords: ['cancel', 'remove', 'delete', 'stop', 'don\'t want', 'no longer'],
      context: ['appointment', 'booking', 'cleaning', 'service'],
      priority: 3
    },
    scheduling: {
      keywords: ['schedule', 'book', 'reserve', 'set up', 'arrange', 'make', 'new'],
      context: ['appointment', 'cleaning', 'service', 'time', 'date'],
      priority: 2
    },
  },
  inquiry: {
    availability: {
      keywords: ['when', 'what time', 'which days', 'available', 'free', 'open'],
      context: ['schedule', 'book', 'time', 'date', 'week', 'month'],
      priority: 1
    },
    services: {
      keywords: ['service', 'cleaning', 'offer', 'provide', 'include', 'do you'],
      context: ['type', 'kind', 'what', 'how'],
      priority: 1
    },
    pricing: {
      keywords: ['cost', 'price', 'rate', 'charge', 'fee', 'expensive', 'cheap'],
      context: ['service', 'cleaning', 'much', 'how'],
      priority: 1
    },
  },
  supplies: {
    request: {
      keywords: ['need', 'want', 'require', 'order', 'get', 'bring'],
      context: ['supplies', 'products', 'cleaning', 'materials'],
      priority: 2
    },
    inventory: {
      keywords: ['supplies', 'products', 'materials', 'items', 'stock', 'inventory'],
      context: ['check', 'have', 'list', 'available'],
      priority: 1
    },
    status: {
      keywords: ['run out', 'missing', 'empty', 'low', 'finished', 'depleted'],
      context: ['supplies', 'products', 'cleaning', 'materials'],
      priority: 3
    },
  },
  sentiment: {
    positive: ['great', 'good', 'excellent', 'wonderful', 'perfect', 'thanks', 'appreciate'],
    negative: ['bad', 'poor', 'terrible', 'awful', 'wrong', 'unhappy', 'disappointed'],
    urgent: ['urgent', 'asap', 'emergency', 'immediately', 'right now', 'tonight', 'today']
  }
};

export async function processMessage(message: string, clientId: number): Promise<AIResponse> {
  const doc = nlp(message.toLowerCase());
  
  // Enhanced intent detection with natural language processing and contextual awareness
  const detectIntent = (text: string, pattern: { keywords: string[], context: string[], priority: number }) => {
    const words = text.toLowerCase().split(' ');
    let keywordMatches = 0;
    let contextMatches = 0;
    let weightedScore = 0;
    
    // Process the text with compromise for better natural language understanding
    const processedText = nlp(text);
    const terms = processedText.terms().out('array') as string[];
    
    // Check keyword matches
    pattern.keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        keywordMatches++;
        weightedScore += 1.5; // Keywords are more important
      }
      
      // Check for partial matches and variations
      terms.forEach((term: string) => {
        if (term.toLowerCase().includes(keyword.toLowerCase())) {
          weightedScore += 0.75;
        }
      });
    });

    // Check context matches
    pattern.context.forEach(contextWord => {
      if (text.includes(contextWord.toLowerCase())) {
        contextMatches++;
        weightedScore += 1.0; // Context adds significant weight
      }
      
      // Check for related terms using compromise
      const related = processedText.match(contextWord).terms().out('array') as string[];
      if (related.length > 0) {
        weightedScore += 0.5;
      }
    });

    // Calculate confidence score with priority weighting
    const baseScore = (keywordMatches + contextMatches + (weightedScore * 0.5)) / 
                     ((pattern.keywords.length + pattern.context.length) * 1.5);
    return baseScore * pattern.priority;
  };
  
  // Analyze sentiment of the message
  const analyzeSentiment = (text: string): { sentiment: 'positive' | 'negative' | 'neutral', urgency: boolean } => {
    const lowercaseText = text.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;
    let isUrgent = false;
    
    // Check positive sentiments
    intentPatterns.sentiment.positive.forEach(word => {
      if (lowercaseText.includes(word)) positiveScore++;
    });
    
    // Check negative sentiments
    intentPatterns.sentiment.negative.forEach(word => {
      if (lowercaseText.includes(word)) negativeScore++;
    });
    
    // Check urgency
    intentPatterns.sentiment.urgent.forEach(word => {
      if (lowercaseText.includes(word)) isUrgent = true;
    });
    
    return {
      sentiment: positiveScore > negativeScore ? 'positive' : 
                negativeScore > positiveScore ? 'negative' : 'neutral',
      urgency: isUrgent
    };
  };

  const intents = {
    bookingModification: detectIntent(message, intentPatterns.booking.modification),
    bookingCancellation: detectIntent(message, intentPatterns.booking.cancellation),
    supplyRequest: detectIntent(message, intentPatterns.supplies.request),
    supplyInventory: detectIntent(message, intentPatterns.supplies.inventory),
    availabilityQuestion: detectIntent(message, intentPatterns.inquiry.availability),
  };

  // Get primary and secondary intents for more nuanced responses
  const sortedIntents = Object.entries(intents)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0.3); // Filter out low confidence intents
  
  const primaryIntent = sortedIntents[0]?.[0];
  const secondaryIntent = sortedIntents[1]?.[0];
  const confidence = sortedIntents[0]?.[1] || 0;

  // Create response context
  const sentimentInfo = analyzeSentiment(message);
  const responseContext = {
    sentiment: sentimentInfo.sentiment,
    urgency: sentimentInfo.urgency,
    confidence,
    hasSecondaryIntent: !!secondaryIntent,
  };

  // Handle different intents with enhanced contextual awareness
  if (primaryIntent === 'bookingModification') {
    const clientBookings = await db.query.bookings.findMany({
      where: and(
        eq(bookings.clientId, clientId),
        gte(bookings.scheduledDateTime, startOfDay(new Date()))
      ),
    });
    
    if (clientBookings.length === 0) {
      const response = responseContext.sentiment === 'negative' ?
        "I understand this might be frustrating. I don't see any upcoming bookings to modify, but I'd be happy to help you schedule a new cleaning service." :
        "I don't see any upcoming bookings to modify. Would you like to schedule a new cleaning service?";
      
      return {
        text: responseContext.urgency ? 
          response + " I can help you find the earliest available slot." :
          response,
        action: "suggest_new_booking",
        confidence: confidence
      };
    }
    
    return {
      text: "I can help you modify your booking. Here are your upcoming appointments. Which one would you like to change?",
      action: "show_bookings",
      data: clientBookings
    };
  }

  if (primaryIntent === 'bookingCancellation') {
    const upcomingBooking = await db.query.bookings.findFirst({
      where: and(
        eq(bookings.clientId, clientId),
        gte(bookings.scheduledDateTime, startOfDay(new Date()))
      ),
    });
    
    if (!upcomingBooking) {
      return {
        text: "I don't see any upcoming bookings to cancel. Is there something else I can help you with?",
      };
    }
    
    return {
      text: `I can help you cancel your booking scheduled for ${format(new Date(upcomingBooking.scheduledDateTime), 'PPP p')}. Would you like to proceed with the cancellation?`,
      action: "confirm_cancellation",
      data: upcomingBooking
    };
  }

  if (primaryIntent === 'supplyRequest') {
    // Create a new interaction for supply request
    await db.insert(interactions).values({
      clientId,
      interactionType: 'supply_request',
      details: message,
    });
    
    return {
      text: "I've noted your supply request. Our team will review it and ensure to bring the necessary items during your next cleaning service. Is there anything specific you need?",
      action: "confirm_supplies"
    };
  }

  if (primaryIntent === 'availabilityQuestion') {
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
