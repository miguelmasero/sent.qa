import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { Booking } from "@db/schema";

interface BookingCardProps {
  booking: Booking;
}

export default function BookingCard({ booking }: BookingCardProps) {
  return (
    <Card className="bg-card text-card-foreground">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {format(new Date(booking.date), "MMMM do, yyyy")}
        </CardTitle>
        <div className={`px-2 py-1 rounded-full text-xs ${
          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
          'bg-red-100 text-red-800'
        }`}>
          {booking.status}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{format(new Date(booking.date), "h:mm a")}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" size="sm">
          Reschedule
        </Button>
        <Button variant="destructive" size="sm">
          Cancel
        </Button>
      </CardFooter>
    </Card>
  );
}
