"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

/**
 * @interface ComboboxOption
 * @description Represents an option in the combobox dropdown
 * @property {string} value - The value of the option
 * @property {string} label - The display label for the option
 */
interface ComboboxOption {
  value: string
  label: string
}

/**
 * @interface ComboboxProps
 * @description Props for the Combobox component
 * @property {ComboboxOption[]} options - Array of options to display
 * @property {string} [value] - Currently selected value
 * @property {(value: string) => void} [onValueChange] - Callback when value changes
 * @property {string} [placeholder] - Placeholder text for the trigger button
 * @property {string} [searchPlaceholder] - Placeholder text for the search input
 * @property {string} [emptyText] - Text to show when no options match search
 * @property {string} [className] - Additional CSS classes
 * @property {boolean} [disabled] - Whether the combobox is disabled
 * @property {boolean} [allowCustom] - Whether to allow custom value input
 * @property {string} [customValue] - Current custom value if allowCustom is true
 * @property {(value: string) => void} [onCustomValueChange] - Callback for custom value changes
 * @property {string} [customPlaceholder] - Placeholder for custom input field
 */
interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  allowCustom?: boolean
  customValue?: string
  onCustomValueChange?: (value: string) => void
  customPlaceholder?: string
}

/**
 * @component Combobox
 * @description A searchable combobox component with optional custom value input
 * @param {ComboboxProps} props - The component props
 * @returns {JSX.Element} The rendered combobox component
 *
 * @example
 * ```tsx
 * <Combobox
 *   options={[{ value: "option1", label: "Option 1" }]}
 *   value={selectedValue}
 *   onValueChange={setSelectedValue}
 *   allowCustom={true}
 *   customValue={customValue}
 *   onCustomValueChange={setCustomValue}
 * />
 * ```
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search options...",
  emptyText = "No option found.",
  className,
  disabled,
  allowCustom = false,
  customValue = "",
  onCustomValueChange,
  customPlaceholder = "Enter custom value...",
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selectedOption = options.find((option) => option.value === value)
  const isCustomSelected = value === "Custom" && allowCustom

  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase()) ||
      option.value.toLowerCase().includes(search.toLowerCase())
    )
  }, [options, search])

  /**
   * @function handleSelect
   * @description Handles option selection
   * @param {string} selectedValue - The selected option value
   */
  const handleSelect = (selectedValue: string) => {
    const newValue = selectedValue === value ? "" : selectedValue
    onValueChange?.(newValue)
    setOpen(false)
    setSearch("")
  }

  /**
   * @function handleClear
   * @description Handles clearing the current selection
   * @param {React.MouseEvent} e - The mouse event
   */
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange?.("")
    if (allowCustom && onCustomValueChange) {
      onCustomValueChange("")
    }
    setSearch("")
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between h-auto min-h-[2.5rem] px-3 py-2",
              "border-input bg-background hover:bg-accent hover:text-accent-foreground",
              "focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "data-[state=open]:border-ring",
              disabled && "cursor-not-allowed opacity-50",
              className
            )}
            disabled={disabled}
          >
            <span className={cn(
              "flex-1 text-left truncate",
              selectedOption ? "text-foreground" : "text-muted-foreground"
            )}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <div className="flex items-center gap-1 ml-2">
              {selectedOption && !disabled && (
                <div
                  className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onClick={handleClear}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear selection</span>
                </div>
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 shadow-md border" align="start" sideOffset={4}>
          <div className="flex items-center border-b border-border px-3 py-2">
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
            />
          </div>
          <ScrollArea className="max-h-60">
            {filteredOptions.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              <div className="p-1">
                {filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-md px-3 py-2.5 text-sm outline-none transition-colors",
                      "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                      value === option.value && "bg-accent text-accent-foreground font-medium"
                    )}
                    onClick={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-3 h-4 w-4 flex-shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {isCustomSelected && allowCustom && (
        <div className="space-y-2 p-3 bg-muted/50 rounded-md border">
          <Input
            placeholder={customPlaceholder}
            value={customValue}
            onChange={(e) => onCustomValueChange?.(e.target.value)}
            className="w-full border-input bg-background"
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Enter your custom license type
          </p>
        </div>
      )}
    </div>
  )
}
