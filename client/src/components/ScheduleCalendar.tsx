import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { startOfDay, format, isToday, addDays } from "date-fns";
import type { Booking } from "@db/schema";

interface ScheduleCalendarProps {
  bookings: Booking[];
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
}

const timeSlots = [
  "09:00", "11:00", "13:00", "15:00"
];

export default function ScheduleCalendar({ bookings, selectedDate, onSelectDate }: ScheduleCalendarProps) {
  const isDateBooked = (date: Date) => {
    return bookings.some(booking => 
      startOfDay(new Date(booking.date)).getTime() === startOfDay(date).getTime()
    );
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    onSelectDate(date);
  };

  const handleTimeSelect = (time: string) => {
    if (!selectedDate) return;
    const [hours, minutes] = time.split(":").map(Number);
    const newDate = new Date(selectedDate);
    newDate.setHours(hours, minutes, 0, 0);
    onSelectDate(newDate);
  };

  return (
    <div className="space-y-4">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleDateSelect}
        modifiers={{
          booked: (date) => isDateBooked(date)
        }}
        modifiersStyles={{
          booked: { backgroundColor: 'hsl(220, 13%, 91%)' }  // stone-400 equivalent
        }}
        disabled={(date) => {
          const tomorrow = addDays(new Date(), 1);
          return (
            date < tomorrow ||
            date.getDay() === 0 ||
            date.getDay() === 6
          );
        }}
        className="rounded-md border"
      />

      {selectedDate && (
        <Card>
          <CardContent className="pt-4">
            <Select onValueChange={handleTimeSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {selectedDate && (
        <p className="text-sm text-muted-foreground">
          Selected: {format(selectedDate, "PPP p")}
        </p>
      )}
    </div>
  );
}
