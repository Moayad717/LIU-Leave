"use client"

import { useState } from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn, parseDate } from "@/lib/utils"
import "react-day-picker/dist/style.css"

interface Props {
  dates: string[] // ISO strings
}

export function SubmittedCalendar({ dates }: Props) {
  const parsed = dates.map((d) => parseDate(d))
  const defaultMonth = parsed.length > 0
    ? new Date(parsed[0].getFullYear(), parsed[0].getMonth(), 1)
    : new Date()

  const [month, setMonth] = useState(defaultMonth)

  return (
    <div className="flex justify-center overflow-x-auto">
      <DayPicker
        mode="multiple"
        selected={parsed}
        onSelect={() => {}}
        month={month}
        onMonthChange={setMonth}
        numberOfMonths={2}
        pagedNavigation
        showOutsideDays={false}
        disabled={() => true}
        components={{
          IconLeft: () => <ChevronLeft className="h-4 w-4" />,
          IconRight: () => <ChevronRight className="h-4 w-4" />,
        }}
        classNames={{
          months: "flex flex-wrap gap-8 justify-center",
          month: "space-y-3",
          caption: "flex justify-center pt-1 relative items-center mb-2",
          caption_label: "text-base font-semibold",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            "h-8 w-8 bg-transparent p-0 border border-input rounded-md",
            "hover:bg-accent hover:text-accent-foreground",
            "inline-flex items-center justify-center"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse",
          head_row: "flex",
          head_cell: "text-muted-foreground rounded-md w-11 font-medium text-xs text-center py-1.5",
          row: "flex w-full mt-1",
          cell: "h-11 w-11 text-center text-sm p-0 relative",
          day: cn(
            "h-11 w-11 p-0 font-normal rounded-lg text-sm",
            "inline-flex items-center justify-center",
            "cursor-default"
          ),
          day_selected: "bg-blue-600 text-white font-bold shadow-md ring-2 ring-blue-300 !opacity-100",
          day_today: "ring-2 ring-primary/40 font-semibold",
          day_outside: "invisible",
          day_disabled: "text-muted-foreground opacity-30 cursor-default",
        }}
      />
    </div>
  )
}
