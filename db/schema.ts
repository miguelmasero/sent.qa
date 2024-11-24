import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const clients = pgTable("clients", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  pin: text("pin").notNull().unique(),
  email: text("email").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
});

export const bookings = pgTable("bookings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  clientId: integer("client_id").references(() => clients.id),
  date: timestamp("date").notNull(),
  status: text("status").notNull().default('confirmed'),
  isRecurring: boolean("is_recurring").default(false),
  notes: text("notes"),
});

export const supplies = pgTable("supplies", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  clientId: integer("client_id").references(() => clients.id),
  item: text("item").notNull(),
  status: text("status").default('needed'),
});

export const insertClientSchema = createInsertSchema(clients);
export const selectClientSchema = createSelectSchema(clients);
export const insertBookingSchema = createInsertSchema(bookings);
export const selectBookingSchema = createSelectSchema(bookings);
export const insertSupplySchema = createInsertSchema(supplies);
export const selectSupplySchema = createSelectSchema(supplies);

export type Client = z.infer<typeof selectClientSchema>;
export type Booking = z.infer<typeof selectBookingSchema>;
export type Supply = z.infer<typeof selectSupplySchema>;
