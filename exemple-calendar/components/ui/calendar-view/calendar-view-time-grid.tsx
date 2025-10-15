"use client"

import * as React from "react"
import { addDays, format, getHours, getMinutes, isSameDay, setHours, setMinutes, startOfDay, getDay } from "date-fns"

import { cn } from "@/lib/utils"
import { useCalendarView } from "./calendar-view-context"
import { CalendarViewEvent } from "./calendar-view-event"

export function CalendarViewTimeGrid() {
  const { view, currentDate, selectedDate, events, minTime, maxTime, onEventAdd } = useCalendarView()
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null)
  const [dragEnd, setDragEnd] = React.useState<{ x: number; y: number } | null>(null)
  const [now, setNow] = React.useState(new Date())

  // Update current time every minute
  React.useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Generate hours for the time grid
  const hours = React.useMemo(() => {
    const result = []
    for (let i = minTime; i <= maxTime; i++) {
      result.push(i)
    }
    return result
  }, [minTime, maxTime])

  // Generate days based on the view
  const days = React.useMemo(() => {
    const result = []
    if (view === "day") {
      result.push(currentDate)
    } else if (view === "week") {
      // Get the week starting from Sunday
      const dayOfWeek = getDay(currentDate)
      const start = addDays(currentDate, -dayOfWeek)
      for (let i = 0; i < 7; i++) {
        result.push(addDays(start, i))
      }
    }
    return result
  }, [view, currentDate])

  // Position events on the grid
  const positionedEvents = React.useMemo(() => {
    // Group events by day and time slot to handle overlapping
    const eventsByDay: Record<number, any[]> = {}

    const filteredEvents = events.filter((event) => {
      // Filter events for the current view
      if (view === "day") {
        return isSameDay(event.start, currentDate)
      } else if (view === "week") {
        const firstDay = days[0]
        const lastDay = days[days.length - 1]
        return event.start >= startOfDay(firstDay) && event.start <= addDays(lastDay, 1)
      }
      return false
    })

    // First pass: group events by day
    filteredEvents.forEach((event) => {
      const eventStart = event.start
      const eventEnd = event.end
      const dayIndex = days.findIndex((day) => isSameDay(day, eventStart))

      if (dayIndex === -1) return

      if (!eventsByDay[dayIndex]) {
        eventsByDay[dayIndex] = []
      }

      const startHour = getHours(eventStart) + getMinutes(eventStart) / 60
      const endHour = getHours(eventEnd) + getMinutes(eventEnd) / 60

      const top = (startHour - minTime) * 60
      const height = (endHour - startHour) * 60

      eventsByDay[dayIndex].push({
        ...event,
        dayIndex,
        top,
        height,
        column: 0, // Will be set in second pass
        width: 1, // Will be set in second pass
      })
    })

    // Second pass: handle overlapping events
    Object.keys(eventsByDay).forEach((dayIndex) => {
      const dayEvents = eventsByDay[Number(dayIndex)]

      // Sort events by start time
      dayEvents.sort((a, b) => a.top - b.top || b.height - a.height)

      // Find overlapping events and assign columns
      const columns: any[][] = []

      dayEvents.forEach((event) => {
        // Find the first column where this event doesn't overlap
        let columnIndex = 0
        while (
          columns[columnIndex]?.some(
            (existingEvent) =>
              event.top < existingEvent.top + existingEvent.height && event.top + event.height > existingEvent.top,
          )
        ) {
          columnIndex++
        }

        // Create column if it doesn't exist
        if (!columns[columnIndex]) {
          columns[columnIndex] = []
        }

        // Add event to column
        columns[columnIndex].push(event)
        event.column = columnIndex
      })

      // Set width based on number of columns
      const columnCount = columns.length
      dayEvents.forEach((event) => {
        event.width = 1 / columnCount
        event.left = event.dayIndex / days.length + (event.column * event.width) / days.length
      })
    })

    // Flatten the events back into a single array
    return Object.values(eventsByDay).flat()
  }, [events, days, view, currentDate, minTime])

  // Handle mouse down for creating new events
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !onEventAdd) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDragging(true)
    setDragStart({ x, y })
    setDragEnd({ x, y })
  }

  // Handle mouse move during drag
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current || !dragStart) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setDragEnd({ x, y })
  }

  // Handle mouse up to create the event
  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd || !containerRef.current || !onEventAdd) return

    const rect = containerRef.current.getBoundingClientRect()
    const hourHeight = 60
    const dayWidth = rect.width / days.length

    // Calculate day index
    const dayIndex = Math.floor(dragStart.x / dayWidth)
    if (dayIndex < 0 || dayIndex >= days.length) {
      setIsDragging(false)
      setDragStart(null)
      setDragEnd(null)
      return
    }

    // Calculate start and end times
    const startY = Math.min(dragStart.y, dragEnd.y)
    const endY = Math.max(dragStart.y, dragEnd.y)

    const startHour = minTime + startY / hourHeight
    const endHour = minTime + endY / hourHeight

    const day = days[dayIndex]
    const startDate = setMinutes(setHours(day, Math.floor(startHour)), Math.round((startHour % 1) * 60))
    const endDate = setMinutes(setHours(day, Math.floor(endHour)), Math.round((endHour % 1) * 60))

    onEventAdd(startDate, endDate)

    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }

  // Render selection box during drag
  const renderSelectionBox = () => {
    if (!isDragging || !dragStart || !dragEnd || !containerRef.current) return null

    const dayWidth = containerRef.current.getBoundingClientRect().width / days.length
    const dayIndex = Math.floor(dragStart.x / dayWidth)

    if (dayIndex < 0 || dayIndex >= days.length) return null

    const left = dayIndex * dayWidth
    const top = Math.min(dragStart.y, dragEnd.y)
    const height = Math.abs(dragEnd.y - dragStart.y)

    return (
      <div
        className="absolute bg-blue-100 border border-blue-500 z-10"
        style={{
          left: `${left}px`,
          top: `${top}px`,
          width: `${dayWidth}px`,
          height: `${height}px`,
        }}
      />
    )
  }

  // Calculate current time position
  const currentTimePosition = React.useMemo(() => {
    const hours = getHours(now)
    const minutes = getMinutes(now)
    return (hours + minutes / 60 - minTime) * 60
  }, [now, minTime])

  return (
    <div className="relative h-full overflow-auto" ref={containerRef}>
      <div className="sticky top-0 z-10 flex border-b bg-background">
        {/* Time gutter */}
        <div className="w-16 border-r" />

        {/* Day headers */}
        {days.map((day, index) => (
          <div key={index} className={cn("flex-1 p-2 text-center border-r", isSameDay(day, new Date()) && "bg-accent")}>
            <div className="font-medium">{format(day, "EEE")}</div>
            <div className={cn("text-sm", isSameDay(day, selectedDate) && "text-primary font-medium")}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      <div
        className="relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Time slots */}
        {hours.map((hour) => (
          <div key={hour} className="flex border-b">
            {/* Hour label */}
            <div className="w-16 p-1 text-xs text-right pr-2 border-r">
              {hour === 0 ? "12 AM" : hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </div>

            {/* Hour cells for each day */}
            {days.map((_, dayIndex) => (
              <div key={dayIndex} className="flex-1 h-[60px] border-r" />
            ))}
          </div>
        ))}

        {/* Current time indicator */}
        {days.some((day) => isSameDay(day, new Date())) && (
          <div
            className="absolute left-0 right-0 border-t border-primary z-10"
            style={{
              top: `${(getHours(new Date()) + getMinutes(new Date()) / 60 - minTime) * 60}px`,
            }}
          >
            <div className="w-2 h-2 rounded-full bg-primary -mt-1 -ml-1" />
          </div>
        )}

        {/* Events */}
        {positionedEvents.map((event: any) => (
          <div
            key={event.id}
            className="absolute"
            style={{
              left: `${(event.dayIndex / days.length) * 100}%`,
              top: `${event.top}px`,
              width: `${100 / days.length}%`,
              height: `${event.height}px`,
            }}
          >
            <CalendarViewEvent event={event} />
          </div>
        ))}

        {/* Selection box for creating events */}
        {renderSelectionBox()}
      </div>
    </div>
  )
}
