"use client"

import * as React from "react"
import { addDays, format, getDaysInMonth, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns"

import { cn } from "@/lib/utils"
import { useCalendarView } from "./calendar-view-context"
import { CalendarViewEvent } from "./calendar-view-event"
import { Badge } from "@/components/ui/badge"

export function CalendarViewGrid() {
  const { currentDate, selectedDate, events, onDateClick, view } = useCalendarView()

  // Generate days for the month view
  const generateMonthDays = () => {
    const days = []
    const monthStart = startOfMonth(currentDate)
    const startDate = startOfWeek(monthStart)
    const daysInMonth = getDaysInMonth(currentDate)

    // Create 6 weeks (42 days) to ensure we cover the month
    for (let i = 0; i < 42; i++) {
      const day = addDays(startDate, i)
      days.push(day)
    }

    return days
  }

  const days = generateMonthDays()

  // Group events by date for the month view
  const eventsByDate = React.useMemo(() => {
    const grouped: Record<string, typeof events> = {}

    events.forEach((event) => {
      const dateKey = format(event.start, "yyyy-MM-dd")
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(event)
    })

    return grouped
  }, [events])

  return (
    <div className="grid grid-cols-7 h-full border-l">
      {/* Weekday headers */}
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
        <div key={day} className="p-2 text-center text-sm font-medium border-r border-b bg-gray-50">
          {day}
        </div>
      ))}

      {/* Calendar days */}
      {days.map((day, index) => {
        const dateKey = format(day, "yyyy-MM-dd")
        const dayEvents = eventsByDate[dateKey] || []
        const isCurrentMonth = isSameMonth(day, currentDate)
        const isSelected = isSameDay(day, selectedDate)
        const isToday = isSameDay(day, new Date())

        return (
          <div
            key={index}
            className={cn(
              "min-h-[100px] p-1 border-r border-b relative transition-colors",
              !isCurrentMonth && "bg-gray-50/50 text-gray-400",
              isSelected && "bg-blue-50",
              "hover:bg-gray-50 cursor-pointer",
            )}
            onClick={() => onDateClick(day)}
          >
            <div className="flex justify-end">
              <span
                className={cn(
                  "flex items-center justify-center h-7 w-7 text-sm rounded-full",
                  isToday && "bg-blue-600 text-white font-medium",
                  isSelected && !isToday && "border-2 border-blue-600 text-blue-600 font-medium",
                )}
              >
                {format(day, "d")}
              </span>
            </div>
            <div className="mt-1 space-y-1 max-h-[80px] overflow-hidden">
              {dayEvents.slice(0, 3).map((event) => (
                <CalendarViewEvent key={event.id} event={event} isCompact />
              ))}
              {dayEvents.length > 3 && (
                <Badge variant="outline" className="bg-white w-full justify-start font-normal text-xs">
                  +{dayEvents.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
