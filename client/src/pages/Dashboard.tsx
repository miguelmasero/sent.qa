import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import NotesDialog from "../components/NotesDialog";
import ScheduleCalendar from "../components/ScheduleCalendar";
import { fetchBookings, fetchClientInfo, createBooking } from "../lib/api";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [messages, setMessages] = useState<Array<{type: 'user' | 'ai', text: string}>>([]);
  const [threadId, setThreadId] = useState<string>();
  const [inputMessage, setInputMessage] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clientInfo } = useQuery({
    queryKey: ["clientInfo"],
    queryFn: fetchClientInfo,
  });

  const { data: bookings } = useQuery({
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
      scheduledDateTime: selectedDate,
      status: 'scheduled'
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    setMessages(prev => [...prev, { type: 'user', text: inputMessage }]);
    setInputMessage('');

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputMessage, threadId }),
      });

      if (!response.ok) throw new Error("Failed to get AI response");
      
      const { message, threadId: newThreadId } = await response.json();
      setThreadId(newThreadId);
      setMessages(prev => [...prev, { type: 'ai', text: message }]);
    } catch (error) {
      console.error('AI response error:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Welcome, {clientInfo ? `${clientInfo.firstName} ${clientInfo.lastName}` : ''}</h1>
        <NotesDialog />
      </header>

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
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="h-[200px] overflow-y-auto border rounded p-4 space-y-2">
              {messages.map((msg, i) => (
                <div key={i} className={`${msg.type === 'user' ? 'text-right' : ''}`}>
                  <p className={`inline-block p-2 rounded text-sm ${
                    msg.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {msg.text}
                  </p>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">How can I assist you with scheduling?</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button variant="outline" size="sm" className="w-full text-sm" onClick={() => handlePresetMessage("modify")}>
                Modify Booking
              </Button>
              <Button variant="outline" size="sm" className="w-full text-sm" onClick={() => handlePresetMessage("cancel")}>
                Cancel Booking
              </Button>
              <Button variant="outline" size="sm" className="w-full text-sm" onClick={() => handlePresetMessage("message")}>
                Leave Message
              </Button>
              <Button variant="outline" size="sm" className="w-full text-sm" onClick={() => handlePresetMessage("products")}>
                Products Needed
              </Button>
            </div>

            <div className="flex gap-2">
              <Input 
                value={inputMessage} 
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button variant="outline" size="sm" onClick={handleSendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
