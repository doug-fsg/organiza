"use client"
import { Plus, ChevronDown, CheckSquare, User, Users } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CalendarViewSidebarProps {
  className?: string
}

export function CalendarViewSidebar({ className }: CalendarViewSidebarProps) {
  // In a real implementation, these would come from props or context
  const calendars = [
    { id: "1", name: "My Calendar", color: "bg-blue-500" },
    { id: "2", name: "Work", color: "bg-green-500" },
    { id: "3", name: "Family", color: "bg-purple-500" },
    { id: "4", name: "Holidays", color: "bg-amber-500" },
    { id: "5", name: "Birthdays", color: "bg-rose-500" },
  ]

  const sharedCalendars = [
    { id: "6", name: "Team Projects", owner: "Alex Kim", color: "bg-teal-500" },
    { id: "7", name: "Company Events", owner: "HR Department", color: "bg-indigo-500" },
  ]

  return (
    <div className={cn("w-64 p-4 border-r shrink-0 hidden md:block bg-white", className)}>
      <Button className="w-full mb-6 gap-2 shadow-sm" size="sm">
        <Plus className="w-4 h-4" />
        Create
      </Button>

      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="space-y-6">
          <div>
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full mb-2 group">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="w-4 h-4 text-gray-500" />
                  My calendars
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1 pl-6">
                  {calendars.map((calendar) => (
                    <div key={calendar.id} className="flex items-center space-x-2 group py-1">
                      <Checkbox id={`calendar-${calendar.id}`} defaultChecked className="rounded-sm" />
                      <div className={cn("w-3 h-3 rounded-sm", calendar.color)} />
                      <label
                        htmlFor={`calendar-${calendar.id}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 group-hover:text-blue-600"
                      >
                        {calendar.name}
                      </label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div>
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full mb-2 group">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="w-4 h-4 text-gray-500" />
                  Shared with me
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1 pl-6">
                  {sharedCalendars.map((calendar) => (
                    <div key={calendar.id} className="flex items-center space-x-2 group py-1">
                      <Checkbox id={`calendar-${calendar.id}`} defaultChecked className="rounded-sm" />
                      <div className={cn("w-3 h-3 rounded-sm", calendar.color)} />
                      <label
                        htmlFor={`calendar-${calendar.id}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 group-hover:text-blue-600"
                      >
                        {calendar.name}
                        <div className="text-xs text-gray-500">{calendar.owner}</div>
                      </label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center space-x-2 py-1">
              <Checkbox id="calendar-tasks" defaultChecked className="rounded-sm" />
              <div className="bg-gray-500 w-3 h-3 rounded-sm" />
              <label
                htmlFor="calendar-tasks"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Tasks
                <div className="text-xs text-gray-500">
                  <CheckSquare className="w-3 h-3 inline mr-1" />
                  To-do items
                </div>
              </label>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
