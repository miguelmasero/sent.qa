import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ScheduleCalendar from "../components/ScheduleCalendar";
import { fetchBookings, createBooking } from "../lib/api";

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: fetchBookings,
  });

  const createBookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast({
        title: "Success",
        description: "Booking request sent successfully",
      });
      setSelectedDate(undefined);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create booking request",
        variant: "destructive",
      });
    },
  });

  const handleScheduleBooking = () => {
    if (!selectedDate) return;
    createBookingMutation.mutate({
      date: selectedDate.toISOString(),
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Schedule Cleaning</h1>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Date & Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ScheduleCalendar
              bookings={bookings || []}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleScheduleBooking}
                disabled={!selectedDate || createBookingMutation.isPending}
              >
                {createBookingMutation.isPending ? "Scheduling..." : "Schedule Cleaning"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="prose">
            <ul className="list-disc pl-4 space-y-2">
              <li>Bookings are available Monday through Friday</li>
              <li>Each cleaning session is 2 hours</li>
              <li>Available time slots: 9 AM - 5 PM</li>
              <li>Please book at least 24 hours in advance</li>
              <li>Cancellations must be made 48 hours before appointment</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
