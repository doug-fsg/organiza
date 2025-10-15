"use client"

import * as React from "react"
import { addDays, format, isSameDay, startOfDay } from "date-fns"
import { Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

// Types for our appointments
interface Appointment {
  id: string
  date: Date
  time: string
  title: string
  duration: number // in minutes
}

// Generate time slots from 9 AM to 5 PM
const generateTimeSlots = () => {
  const slots = []
  for (let hour = 9; hour < 17; hour++) {
    const hourFormatted = hour % 12 === 0 ? 12 : hour % 12
    const period = hour < 12 ? "AM" : "PM"

    slots.push(`${hourFormatted}:00 ${period}`)
    slots.push(`${hourFormatted}:30 ${period}`)
  }
  return slots
}

const timeSlots = generateTimeSlots()

// Sample appointments data
const sampleAppointments: Appointment[] = [
  {
    id: "1",
    date: new Date(),
    time: "10:00 AM",
    title: "Doctor Appointment",
    duration: 30,
  },
  {
    id: "2",
    date: new Date(),
    time: "2:00 PM",
    title: "Dental Checkup",
    duration: 60,
  },
  {
    id: "3",
    date: addDays(new Date(), 1),
    time: "11:30 AM",
    title: "Team Meeting",
    duration: 45,
  },
]

export function AppointmentScheduler() {
  const [date, setDate] = React.useState<Date>(new Date())
  const [appointments, setAppointments] = React.useState<Appointment[]>(sampleAppointments)
  const [selectedTime, setSelectedTime] = React.useState<string>("")
  const [appointmentTitle, setAppointmentTitle] = React.useState<string>("")
  const [appointmentDuration, setAppointmentDuration] = React.useState<number>(30)
  const [isBookingOpen, setIsBookingOpen] = React.useState<boolean>(false)

  // Filter appointments for the selected date
  const appointmentsForSelectedDate = appointments.filter((appointment) => isSameDay(appointment.date, date))

  // Check if a time slot is available
  const isTimeSlotAvailable = (time: string) => {
    return !appointmentsForSelectedDate.some((appointment) => appointment.time === time)
  }

  // Handle booking a new appointment
  const handleBookAppointment = () => {
    if (!selectedTime || !appointmentTitle) return

    const newAppointment: Appointment = {
      id: Math.random().toString(36).substring(7),
      date: startOfDay(date),
      time: selectedTime,
      title: appointmentTitle,
      duration: appointmentDuration,
    }

    setAppointments([...appointments, newAppointment])
    setSelectedTime("")
    setAppointmentTitle("")
    setAppointmentDuration(30)
    setIsBookingOpen(false)
  }

  // Handle deleting an appointment
  const handleDeleteAppointment = (id: string) => {
    setAppointments(appointments.filter((appointment) => appointment.id !== id))
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
          <CardDescription>Select a date to view or schedule appointments</CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => newDate && setDate(newDate)}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Appointments</CardTitle>
            <CardDescription>{format(date, "MMMM d, yyyy")}</CardDescription>
          </div>
          <Button onClick={() => setIsBookingOpen(!isBookingOpen)}>
            {isBookingOpen ? "Cancel" : "Book Appointment"}
          </Button>
        </CardHeader>
        <CardContent>
          {isBookingOpen ? (
            <div className="space-y-4">
              <div className="grid gap-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Appointment Title
                </label>
                <input
                  id="title"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={appointmentTitle}
                  onChange={(e) => setAppointmentTitle(e.target.value)}
                  placeholder="Enter appointment title"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Time Slot</label>
                <Select onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time} disabled={!isTimeSlotAvailable(time)}>
                        {time} {!isTimeSlotAvailable(time) && "(Booked)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Duration (minutes)</label>
                <Select
                  value={appointmentDuration.toString()}
                  onValueChange={(value) => setAppointmentDuration(Number.parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={handleBookAppointment} disabled={!selectedTime || !appointmentTitle}>
                Confirm Booking
              </Button>
            </div>
          ) : appointmentsForSelectedDate.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {appointmentsForSelectedDate.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-1">
                      <h4 className="font-medium">{appointment.title}</h4>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-1 h-4 w-4" />
                        {appointment.time} ({appointment.duration} min)
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteAppointment(appointment.id)}>
                      <X className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-center">
              <div className="space-y-2">
                <p className="text-muted-foreground">No appointments for this date</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
