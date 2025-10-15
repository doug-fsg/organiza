"use client"
import { format } from "date-fns"
import { ChevronLeft, ChevronRight, Menu } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMediaQuery } from "@/hooks/use-media-query"

interface CalendarViewHeaderProps {
  view: "day" | "week" | "month"
  onViewChange: (view: "day" | "week" | "month") => void
  currentDate: Date
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  className?: string
}

export function CalendarViewHeader({
  view,
  onViewChange,
  currentDate,
  onPrev,
  onNext,
  onToday,
  className,
}: CalendarViewHeaderProps) {
  const isMobile = useMediaQuery("(max-width: 640px)")

  // Format the header title based on the current view
  const formatHeaderTitle = () => {
    if (view === "day") {
      return format(currentDate, "EEEE, MMMM d, yyyy")
    } else if (view === "week") {
      return format(currentDate, "MMMM yyyy")
    } else {
      return format(currentDate, "MMMM yyyy")
    }
  }

  return (
    <header className={cn("flex items-center justify-between p-4 border-b bg-white", className)}>
      <div className="flex items-center gap-2">
        {isMobile && (
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onToday} className="rounded-full px-4 text-sm font-medium">
          Today
        </Button>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onPrev} className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext} className="rounded-full">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <h2 className="text-lg font-semibold">{formatHeaderTitle()}</h2>
      </div>
      <Tabs value={view} onValueChange={(v) => onViewChange(v as "day" | "week" | "month")} className="w-auto">
        <TabsList className="grid w-auto grid-cols-3 h-9 rounded-lg">
          <TabsTrigger value="day" className="px-3 text-xs sm:text-sm">
            Day
          </TabsTrigger>
          <TabsTrigger value="week" className="px-3 text-xs sm:text-sm">
            Week
          </TabsTrigger>
          <TabsTrigger value="month" className="px-3 text-xs sm:text-sm">
            Month
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </header>
  )
}
