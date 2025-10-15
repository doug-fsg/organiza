"use client"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { useCalendarView } from "./calendar-view-context"
import type { CalendarEvent } from "./calendar-view"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MapPin, Clock } from "lucide-react"

interface CalendarViewEventProps {
  event: CalendarEvent
  isCompact?: boolean
}

export function CalendarViewEvent({ event, isCompact = false }: CalendarViewEventProps) {
  const { onEventClick } = useCalendarView()

  // Default colors based on event type or use provided color
  const getEventColor = () => {
    if (event.color) return event.color

    // Default colors - Google Calendar-like
    const colors = [
      "bg-blue-500 hover:bg-blue-600 border-blue-600",
      "bg-green-500 hover:bg-green-600 border-green-600",
      "bg-purple-500 hover:bg-purple-600 border-purple-600",
      "bg-amber-500 hover:bg-amber-600 border-amber-600",
      "bg-rose-500 hover:bg-rose-600 border-rose-600",
      "bg-teal-500 hover:bg-teal-600 border-teal-600",
      "bg-indigo-500 hover:bg-indigo-600 border-indigo-600",
    ]

    // Use a hash of the event title to pick a consistent color
    const hash = event.title.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + acc
    }, 0)

    return colors[hash % colors.length]
  }

  const eventColor = getEventColor()

  if (isCompact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className={cn(
                "w-full text-left px-2 py-0.5 rounded text-xs font-medium text-white truncate border-l-4",
                eventColor,
              )}
              onClick={(e) => {
                e.stopPropagation()
                onEventClick(event)
              }}
            >
              {event.title}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm space-y-1">
              <div className="font-medium">{event.title}</div>
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                {format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}
              </div>
              {event.location && (
                <div className="flex items-center text-xs text-gray-500">
                  <MapPin className="w-3 h-3 mr-1" />
                  {event.location}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <button
      className={cn(
        "w-full h-full p-1.5 overflow-hidden text-left rounded-md text-white border-l-4 shadow-sm transition-all",
        eventColor,
        "hover:shadow-md",
      )}
      onClick={(e) => {
        e.stopPropagation()
        onEventClick(event)
      }}
    >
      <div className="font-medium truncate">{event.title}</div>
      <div className="text-xs opacity-90 flex items-center">
        <Clock className="w-3 h-3 mr-1 inline" />
        {format(event.start, "h:mm a")} - {format(event.end, "h:mm a")}
      </div>
      {event.location && (
        <div className="text-xs truncate opacity-90 flex items-center mt-0.5">
          <MapPin className="w-3 h-3 mr-1 inline" />
          {event.location}
        </div>
      )}
    </button>
  )
}
