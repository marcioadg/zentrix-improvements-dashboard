import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
}

const DATE_FORMAT = "MM/dd/yyyy"
const PARSE_FORMATS = ["MM/dd/yyyy", "M/d/yyyy", "yyyy-MM-dd", "MM-dd-yyyy"]

function tryParseDate(value: string): Date | null {
  for (const fmt of PARSE_FORMATS) {
    const parsed = parse(value, fmt, new Date())
    if (isValid(parsed) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
      return parsed
    }
  }
  return null
}

export function DatePicker({ date, onSelect, placeholder = "MM/DD/YYYY", className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [displayMonth, setDisplayMonth] = React.useState<Date>(date || new Date())
  const [inputValue, setInputValue] = React.useState(date ? format(date, DATE_FORMAT) : "")

  React.useEffect(() => {
    if (date) {
      setDisplayMonth(date)
      setInputValue(format(date, DATE_FORMAT))
    } else {
      setInputValue("")
    }
  }, [date])

  const handleDaySelect = (selectedDate: Date | undefined) => {
    onSelect?.(selectedDate)
    setOpen(false)
  }

  const handleDropdownSelect = (selectedDate: Date) => {
    onSelect?.(selectedDate)
    setDisplayMonth(selectedDate)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)

    if (value.length >= 8) {
      const parsed = tryParseDate(value)
      if (parsed) {
        onSelect?.(parsed)
        setDisplayMonth(parsed)
      }
    }
  }

  const handleInputBlur = () => {
    if (!inputValue.trim()) {
      onSelect?.(undefined)
      return
    }

    const parsed = tryParseDate(inputValue)
    if (parsed) {
      onSelect?.(parsed)
      setDisplayMonth(parsed)
      setInputValue(format(parsed, DATE_FORMAT))
    } else {
      setInputValue(date ? format(date, DATE_FORMAT) : "")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleInputBlur()
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative flex items-center w-full", className)}>
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pr-9"
        />
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            className="absolute right-0 h-full px-2 hover:bg-transparent"
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-0 z-50" align="start" side="bottom" sideOffset={4}>
        <Calendar
          mode="single"
          selected={date}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          onSelect={handleDaySelect}
          onDropdownSelect={handleDropdownSelect}
          initialFocus
          className={cn("p-3 pointer-events-auto rounded-md")}
        />
      </PopoverContent>
    </Popover>
  )
}
