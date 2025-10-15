"use client"

import * as React from "react"
import { addDays, addMonths, addWeeks, subMonths, subWeeks } from "date-fns"

import { cn } from "@/lib/utils"
import { CalendarViewContext } from "./calendar-view-context"
import { CalendarViewHeader } from "./calendar-view-header"
import { CalendarViewGrid } from "./calendar-view-grid"
import { CalendarViewTimeGrid } from "./calendar-view-time-grid"
import { CalendarViewSidebar } from "./calendar-view-sidebar"
import { CalendarViewEventDialog } from "./calendar-view-event-dialog"

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  color?: string
  description?: string
  location?: string
}

export interface CalendarViewProps extends React.HTMLAttributes<HTMLDivElement> {
  events?: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onDateClick?: (date: Date) => void
  onEventAdd?: (start: Date, end: Date) => void
  onEventUpdate?: (event: CalendarEvent) => void
  onEventDelete?: (eventId: string) => void
  defaultView?: "day" | "week" | "month"
  minTime?: number
  maxTime?: number
}

export function CalendarView({
  events = [],
  onEventClick,
  onDateClick,
  onEventAdd,
  onEventUpdate,
  onEventDelete,
  defaultView = "week",
  minTime = 0,
  maxTime = 24,
  className,
  ...props
}: CalendarViewProps) {
  const [view, setView] = React.useState<"day" | "week" | "month">(defaultView)
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date())
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState<boolean>(false)

  // Navigate to today
  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  // Navigate to previous period
  const goToPrev = () => {
    if (view === "day") {
      setCurrentDate((prev) => addDays(prev, -1))
    } else if (view === "week") {
      setCurrentDate((prev) => subWeeks(prev, 1))
    } else {
      setCurrentDate((prev) => subMonths(prev, 1))
    }
  }

  // Navigate to next period
  const goToNext = () => {
    if (view === "day") {
      setCurrentDate((prev) => addDays(prev, 1))
    } else if (view === "week") {
      setCurrentDate((prev) => addWeeks(prev, 1))
    } else {
      setCurrentDate((prev) => addMonths(prev, 1))
    }
  }

  // Handle date click
  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    onDateClick?.(date)
  }

  // Handle event click
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsDialogOpen(true)
    onEventClick?.(event)
  }

  // Handle creating a new event
  const handleCreateEvent = (start: Date, end: Date) => {
    onEventAdd?.(start, end)
  }

  // Handle event update
  const handleEventUpdate = (event: CalendarEvent) => {
    setIsDialogOpen(false)
    setSelectedEvent(null)
    onEventUpdate?.(event)
  }

  // Handle event delete
  const handleEventDelete = (eventId: string) => {
    setIsDialogOpen(false)
    setSelectedEvent(null)
    onEventDelete?.(eventId)
  }

  // Context value
  const contextValue = React.useMemo(
    () => ({
      view,
      currentDate,
      selectedDate,
      events,
      minTime,
      maxTime,
      onDateClick: handleDateClick,
      onEventClick: handleEventClick,
      onEventAdd: handleCreateEvent,
    }),
    [view, currentDate, selectedDate, events, minTime, maxTime],
  )

  return (
    <CalendarViewContext.Provider value={contextValue}>
      <div className={cn("flex flex-col h-full bg-white rounded-lg shadow-sm border", className)} {...props}>
        <CalendarViewHeader
          view={view}
          onViewChange={setView}
          currentDate={currentDate}
          onPrev={goToPrev}
          onNext={goToNext}
          onToday={goToToday}
        />
        <div className="flex flex-1 overflow-hidden">
          <CalendarViewSidebar />
          <div className="flex-1 overflow-auto">
            {view === "month" ? <CalendarViewGrid /> : <CalendarViewTimeGrid />}
          </div>
        </div>

        {selectedEvent && (
          <CalendarViewEventDialog
            event={selectedEvent}
            isOpen={isDialogOpen}
            onClose={() => {
              setIsDialogOpen(false)
              setSelectedEvent(null)
            }}
            onUpdate={handleEventUpdate}
            onDelete={handleEventDelete}
          />
        )}
      </div>
    </CalendarViewContext.Provider>
  )
}
