import type { Client, Booking } from "@db/schema";

export async function fetchClientInfo(): Promise<Client> {
  const response = await fetch("/api/client");
  if (!response.ok) throw new Error("Failed to fetch client info");
  return response.json();
}

export async function fetchBookings(): Promise<Booking[]> {
  const response = await fetch("/api/bookings");
  if (!response.ok) throw new Error("Failed to fetch bookings");
  return response.json();
}

export async function createBooking(data: Partial<Booking>): Promise<Booking> {
  const response = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create booking");
  return response.json();
}

export async function updateBooking(id: number, data: Partial<Booking>): Promise<Booking> {
  const response = await fetch(`/api/bookings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update booking");
  return response.json();
}
