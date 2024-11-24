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
  const [messages, setMessages] = useState<Array<{type: 'user' | 'ai', text: string}>>([]);
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

  const handlePresetMessage = (type: 'modify' | 'cancel' | 'message' | 'products') => {
    const messageMap = {
      modify: "I would like to modify my booking",
      cancel: "I need to cancel my booking",
      message: "I want to leave a message",
      products: "I need to request cleaning products"
    };
    
    setMessages(prev => [...prev, 
      { type: 'user', text: messageMap[type] },
      { type: 'ai', text: "I'll help you with that. Please provide more details." }
    ]);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold">Schedule Cleaning</h1>
        </div>
      </header>

      <div className="space-y-6">
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
            <CardTitle>AI Assistant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full" onClick={() => handlePresetMessage("modify")}>
                  Modify Booking
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handlePresetMessage("cancel")}>
                  Cancel Booking
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handlePresetMessage("message")}>
                  Leave Message
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handlePresetMessage("products")}>
                  Products Needed
                </Button>
              </div>
              <div className="h-[200px] overflow-y-auto border rounded p-4 space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`${msg.type === 'user' ? 'text-right' : ''}`}>
                    <p className={`inline-block p-2 rounded ${
                      msg.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {msg.text}
                    </p>
                  </div>
                ))}
                {messages.length === 0 && (
                  <p className="text-muted-foreground">How can I assist you with scheduling?</p>
                )}
              </div>
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
