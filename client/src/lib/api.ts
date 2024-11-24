import type { Client, Booking } from "@db/schema";

export async function fetchClientInfo(): Promise<Client> {
  try {
    const response = await fetch("/api/client");
    if (response.status === 401) {
      window.location.href = '/';
      throw new Error("Session expired");
    }
    if (!response.ok) throw new Error("Failed to fetch client info");
    return response.json();
  } catch (error) {
    console.error('Client fetch error:', error);
    throw error;
  }
}

export async function fetchBookings(): Promise<Booking[]> {
  try {
    const response = await fetch("/api/bookings");
    if (response.status === 401) {
      window.location.href = '/';
      throw new Error("Session expired");
    }
    if (!response.ok) throw new Error("Failed to fetch bookings");
    return response.json();
  } catch (error) {
    console.error('Bookings fetch error:', error);
    throw error;
  }
}

export async function createBooking(data: Partial<Booking>): Promise<Booking> {
  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (response.status === 401) {
      window.location.href = '/';
      throw new Error("Session expired");
    }
    if (!response.ok) throw new Error("Failed to create booking");
    return response.json();
  } catch (error) {
    console.error('Booking creation error:', error);
    throw error;
  }
}

export async function updateBooking(id: number, data: Partial<Booking>): Promise<Booking> {
  try {
    const response = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (response.status === 401) {
      window.location.href = '/';
      throw new Error("Session expired");
    }
    if (!response.ok) throw new Error("Failed to update booking");
    return response.json();
  } catch (error) {
    console.error('Booking update error:', error);
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to logout");
    window.location.href = '/';
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}
