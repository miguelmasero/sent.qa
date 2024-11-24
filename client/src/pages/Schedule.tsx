import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send } from "lucide-react";
import { useLocation } from "wouter";
import ScheduleCalendar from "../components/ScheduleCalendar";
import { fetchBookings, createBooking } from "../lib/api";

export default function Schedule() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [, setLocation] = useLocation();
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
      date: selectedDate,
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Schedule Cleaning</h1>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="md:col-span-2">
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

        <Card>
          <CardHeader>
            <CardTitle>AI Assistant</CardTitle>
          </CardHeader>
          <CardContent className="prose">
            <div className="h-[300px] overflow-y-auto border rounded p-4 space-y-4">
              {/* AI Chat messages will go here */}
              <p className="text-muted-foreground">How can I assist you with scheduling?</p>
            </div>
            <div className="mt-4 flex gap-2">
              <Input placeholder="Type your message..." />
              <Button variant="outline">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
