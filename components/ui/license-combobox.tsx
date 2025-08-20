"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getLicenseOptions } from "@/lib/utils/license-utils"

/**
 * @interface LicenseComboboxProps
 * @description Props for the LicenseCombobox component specialized for license selection
 * @property {string} [value] - Currently selected license value
 * @property {(license: string, customValue?: string) => void} [onValueChange] - Callback when license changes
 * @property {string} [customValue] - Current custom license value (when "Custom" is selected)
 * @property {(customValue: string) => void} [onCustomValueChange] - Callback when custom license value changes
 * @property {string} [placeholder] - Placeholder text for the trigger button
 * @property {string} [className] - Additional CSS classes
 * @property {boolean} [disabled] - Whether the combobox is disabled
 * @property {boolean} [required] - Whether license selection is required
 */
interface LicenseComboboxProps {
  value?: string
  onValueChange?: (license: string, customValue?: string) => void
  customValue?: string
  onCustomValueChange?: (customValue: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
}

/**
 * @component LicenseCombobox
 * @description A specialized combobox component for license selection with built-in custom license support
 * @param {LicenseComboboxProps} props - The component props
 * @returns {JSX.Element} The rendered license combobox component
 *
 * @example
 * ```tsx
 * // React Hook Form usage
 * <LicenseCombobox
 *   value={form.watch("license")}
 *   onValueChange={(license) => form.setValue("license", license)}
 *   customValue={form.watch("customLicense")}
 *   onCustomValueChange={(value) => form.setValue("customLicense", value)}
 *   required
 * />
 * ```
 *
 * @example
 * ```tsx
 * // State management usage
 * <LicenseCombobox
 *   value={selectedLicense}
 *   onValueChange={setSelectedLicense}
 *   customValue={customLicense}
 *   onCustomValueChange={setCustomLicense}
 * />
 * ```
 */
export function LicenseCombobox({
  value,
  onValueChange,
  customValue = "",
  onCustomValueChange,
  placeholder = "Select a license",
  className,
  disabled,
  required = false,
}: LicenseComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const licenseOptions = React.useMemo(() => getLicenseOptions(), [])
  const selectedOption = licenseOptions.find((option) => option.value === value)
  const isCustomSelected = value === "Custom"

  /**
   * @function handleSelect
   * @description Handles license option selection
   * @param {string} selectedValue - The selected license value
   */
  const handleSelect = (selectedValue: string) => {
    const newValue = selectedValue === value ? "" : selectedValue
    onValueChange?.(newValue, customValue)
    
    // Clear custom value if switching away from Custom
    if (selectedValue !== "Custom" && onCustomValueChange) {
      onCustomValueChange("")
    }
    
    setOpen(false)
  }

  /**
   * @function handleCustomValueChange
   * @description Handles changes to the custom license input
   * @param {string} newCustomValue - The new custom license value
   */
  const handleCustomValueChange = (newCustomValue: string) => {
    onCustomValueChange?.(newCustomValue)
    onValueChange?.(value || "Custom", newCustomValue)
  }

  /**
   * @function getDisplayLabel
   * @description Gets the display label for the selected license
   * @returns {string} The display label
   */
  const getDisplayLabel = (): string => {
    if (!selectedOption) return placeholder
    
    if (isCustomSelected && customValue.trim()) {
      return `Custom: ${customValue.trim()}`
    }
    
    return selectedOption.label
  }

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-required={required}
            className={cn(
              "w-full justify-between",
              !selectedOption && "text-muted-foreground",
              disabled && "cursor-not-allowed opacity-50",
              className
            )}
            disabled={disabled}
          >
            {getDisplayLabel()}
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search licenses..." className="h-9" />
            <CommandList>
              <CommandEmpty>No license found.</CommandEmpty>
              <CommandGroup>
                {licenseOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => handleSelect(currentValue)}
                  >
                    {option.label}
                    <Check
                      className={cn(
                        "ml-auto",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {isCustomSelected && (
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg border border-muted">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none text-foreground">
              Custom License Name {required && <span className="text-destructive">*</span>}
            </label>
            <Input
              placeholder="Enter your custom license name..."
              value={customValue}
              onChange={(e) => handleCustomValueChange(e.target.value)}
              className="w-full border-input bg-background"
              disabled={disabled}
              aria-describedby="custom-license-help"
            />
            <p id="custom-license-help" className="text-xs text-muted-foreground leading-relaxed">
              Specify the name of your custom license (e.g., &quot;My Project License&quot;, &quot;Proprietary License&quot;)
            </p>
          </div>
        </div>
      )}
    </div>
  )
}