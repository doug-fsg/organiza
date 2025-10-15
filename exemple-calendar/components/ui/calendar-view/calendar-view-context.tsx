"use client"

import * as React from "react"
import type { CalendarEvent } from "./calendar-view"

interface CalendarViewContextType {
  view: "day" | "week" | "month"
  currentDate: Date
  selectedDate: Date
  events: CalendarEvent[]
  minTime: number
  maxTime: number
  onDateClick: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  onEventAdd?: (start: Date, end: Date) => void
}

export const CalendarViewContext = React.createContext<CalendarViewContextType | undefined>(undefined)

export function useCalendarView() {
  const context = React.useContext(CalendarViewContext)

  if (!context) {
    throw new Error("useCalendarView must be used within a CalendarViewProvider")
  }

  return context
}
