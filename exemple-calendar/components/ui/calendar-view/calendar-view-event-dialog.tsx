"use client"

import { cn } from "@/lib/utils"

import * as React from "react"
import { format } from "date-fns"
import { Clock, MapPin, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CalendarEvent } from "./calendar-view"

interface CalendarViewEventDialogProps {
  event: CalendarEvent
  isOpen: boolean
  onClose: () => void
  onUpdate?: (event: CalendarEvent) => void
  onDelete?: (eventId: string) => void
}

export function CalendarViewEventDialog({ event, isOpen, onClose, onUpdate, onDelete }: CalendarViewEventDialogProps) {
  const [title, setTitle] = React.useState(event.title)
  const [location, setLocation] = React.useState(event.location || "")
  const [description, setDescription] = React.useState(event.description || "")

  // Reset form when event changes
  React.useEffect(() => {
    setTitle(event.title)
    setLocation(event.location || "")
    setDescription(event.description || "")
  }, [event])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onUpdate) {
      onUpdate({
        ...event,
        title,
        location: location || undefined,
        description: description || undefined,
      })
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(event.id)
    }
  }

  // Get event color
  const getEventColor = () => {
    if (event.color) return event.color.replace("bg-", "border-")

    // Default colors
    const colors = ["border-blue-500", "border-green-500", "border-purple-500", "border-amber-500", "border-rose-500"]

    // Use a hash of the event title to pick a consistent color
    const hash = event.title.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + acc
    }, 0)

    return colors[hash % colors.length]
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className={cn("text-xl border-l-4 pl-3", getEventColor())}>{event.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-4 mt-2">
            <div className="flex items-center text-sm">
              <Clock className="w-4 h-4 mr-1" />
              {format(event.start, "EEE, MMM d • h:mm a")} - {format(event.end, "h:mm a")}
            </div>
            {event.location && (
              <div className="flex items-center text-sm">
                <MapPin className="w-4 h-4 mr-1" />
                {event.location}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {onDelete && (
              <Button type="button" variant="destructive" onClick={handleDelete} className="mr-auto">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
