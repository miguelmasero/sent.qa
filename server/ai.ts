import { db } from "../db";
import { bookings } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { addHours, format, parse, startOfDay, endOfDay } from "date-fns";

export async function suggestBookingTime(requestedDate: string): Promise<Date> {
  // Get all bookings for the requested date
  const date = new Date(requestedDate);
  const existingBookings = await db.query.bookings.findMany({
    where: and(
      gte(bookings.scheduledDateTime, startOfDay(date)),
      lte(bookings.scheduledDateTime, endOfDay(date))
    ),
  });

  // Simple algorithm to find the next available 2-hour slot
  const workingHours = { start: 9, end: 17 }; // 9 AM to 5 PM
  const cleaningDuration = 2; // 2 hours per cleaning

  let proposedTime = new Date(date.setHours(workingHours.start, 0, 0, 0));

  while (proposedTime.getHours() + cleaningDuration <= workingHours.end) {
    const conflictingBooking = existingBookings.find(booking => {
      const bookingTime = new Date(booking.date);
      return Math.abs(bookingTime.getTime() - proposedTime.getTime()) < cleaningDuration * 60 * 60 * 1000;
    });

    if (!conflictingBooking) {
      return proposedTime;
    }

    proposedTime = addHours(proposedTime, 2);
  }

  // If no time found today, suggest first slot next day
  return new Date(date.setHours(workingHours.start, 0, 0, 0) + 24 * 60 * 60 * 1000);
}
