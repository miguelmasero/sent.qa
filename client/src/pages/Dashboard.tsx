import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import BookingCard from "../components/BookingCard";
import NotesDialog from "../components/NotesDialog";
import { fetchBookings, fetchClientInfo } from "../lib/api";

export default function Dashboard() {
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
        <NotesDialog />
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bookings?.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
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
