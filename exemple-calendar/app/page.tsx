import { addDays, setHours } from "date-fns"
import { CalendarView } from "@/components/ui/calendar-view/calendar-view"

// Sample events
const today = new Date()
const tomorrow = addDays(today, 1)
const dayAfter = addDays(today, 2)

const events = [
  {
    id: "1",
    title: "Team Meeting",
    start: setHours(today, 10),
    end: setHours(today, 11),
    location: "Conference Room A",
  },
  {
    id: "2",
    title: "Lunch with Client",
    start: setHours(today, 12),
    end: setHours(today, 13),
    location: "Bistro Downtown",
    color: "bg-amber-500 hover:bg-amber-600 border-amber-600",
  },
  {
    id: "3",
    title: "Project Review",
    start: setHours(today, 14),
    end: setHours(today, 15),
    description: "Quarterly project review with stakeholders",
  },
  {
    id: "4",
    title: "Doctor Appointment",
    start: setHours(tomorrow, 9),
    end: setHours(tomorrow, 10),
    location: "Medical Center",
    color: "bg-rose-500 hover:bg-rose-600 border-rose-600",
  },
  {
    id: "5",
    title: "Team Building",
    start: setHours(tomorrow, 13),
    end: setHours(tomorrow, 16),
    location: "City Park",
    color: "bg-green-500 hover:bg-green-600 border-green-600",
  },
  {
    id: "6",
    title: "Product Demo",
    start: setHours(dayAfter, 11),
    end: setHours(dayAfter, 12),
    location: "Main Conference Room",
    color: "bg-purple-500 hover:bg-purple-600 border-purple-600",
  },
  {
    id: "7",
    title: "Marketing Strategy",
    start: setHours(dayAfter, 14),
    end: setHours(dayAfter, 16),
    description: "Discuss Q3 marketing strategy and campaigns",
    color: "bg-blue-500 hover:bg-blue-600 border-blue-600",
  },
]

export default function Home() {
  return (
    <main className="container mx-auto p-4 h-[calc(100vh-2rem)]">
      <CalendarView
        events={events}
        onEventClick={(event) => console.log("Event clicked:", event)}
        onDateClick={(date) => console.log("Date clicked:", date)}
        onEventAdd={(start, end) => console.log("Create event:", { start, end })}
        onEventUpdate={(event) => console.log("Update event:", event)}
        onEventDelete={(eventId) => console.log("Delete event:", eventId)}
      />
    </main>
  )
}
