import { pgTable, text, timestamp, jsonb, integer, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

/** Clients Table **/
export const clients = pgTable("clients", {
  clientId: integer("client_id").primaryKey().notNull().default(sql`generated always as identity`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  preferences: jsonb("preferences"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("clients_idx_client_id").on(table.clientId),
  lastNameIdx: index("last_name_idx").on(table.lastName),
}));

/** Bookings Table **/
export const bookings = pgTable("bookings", {
  bookingId: integer("booking_id").primaryKey().notNull().default(sql`generated always as identity`),
  clientId: integer("client_id").references(() => clients.clientId),
  scheduledDateTime: timestamp("scheduled_date_time").notNull(),
  status: text("status").notNull().default('scheduled'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  compositeIdx: index("bookings_composite_idx").on(table.clientId, table.scheduledDateTime),
  statusIdx: index("bookings_status_idx").on(table.status),
}));

/** Supplies Table **/
export const supplies = pgTable("supplies", {
  id: integer("id").primaryKey().notNull().default(sql`generated always as identity`),
  clientId: integer("client_id").references(() => clients.clientId),
  item: text("item").notNull(),
  status: text("status").notNull().default('needed'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("supplies_client_id_idx").on(table.clientId),
  statusIdx: index("supplies_status_idx").on(table.status),
}));

/** Interactions Table **/
export const interactions = pgTable("interactions", {
  interactionId: integer("interaction_id").primaryKey().notNull().default(sql`generated always as identity`),
  clientId: integer("client_id").references(() => clients.clientId),
  interactionType: text("interaction_type").notNull(),
  details: text("details"),
  interactionDateTime: timestamp("interaction_date_time").defaultNow(),
  relatedBookingId: integer("related_booking_id").references(() => bookings.bookingId),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  compositeIdx: index("interactions_composite_idx").on(table.clientId, table.interactionDateTime),
}));

/** Zod Schemas **/
export const insertClientSchema = createInsertSchema(clients);
export const selectClientSchema = createSelectSchema(clients);
export const insertBookingSchema = createInsertSchema(bookings);
export const selectBookingSchema = createSelectSchema(bookings);
export const insertInteractionSchema = createInsertSchema(interactions);
export const selectInteractionSchema = createSelectSchema(interactions);
export const insertSupplySchema = createInsertSchema(supplies);
export const selectSupplySchema = createSelectSchema(supplies);

/** Type Definitions **/
export type Client = z.infer<typeof selectClientSchema>;
export type Booking = z.infer<typeof selectBookingSchema>;
export type Interaction = z.infer<typeof selectInteractionSchema>;
export type Supply = z.infer<typeof selectSupplySchema>;
