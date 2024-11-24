import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Calendar } from "lucide-react";
import { useLocation } from "wouter";
import BookingCard from "../components/BookingCard";
import NotesDialog from "../components/NotesDialog";
import { fetchBookings, fetchClientInfo } from "../lib/api";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: clientInfo } = useQuery({
    queryKey: ["clientInfo"],
    queryFn: fetchClientInfo,
  });

  const { data: bookings } = useQuery({
    queryKey: ["bookings"],
    queryFn: fetchBookings,
  });

  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Welcome, {clientInfo?.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/schedule")}>
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Cleaning
          </Button>
          <NotesDialog />
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bookings?.length === 0 ? (
              <p className="text-muted-foreground">No upcoming bookings</p>
            ) : (
              bookings?.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <CalendarUI
              mode="single"
              className="rounded-md border"
              disabled={(date) => date < new Date()}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
