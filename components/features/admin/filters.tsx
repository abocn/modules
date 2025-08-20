"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet"
import { Filter, RotateCcw } from "lucide-react"
import type { FilterField, FilterValues, FilterValue } from "@/types/admin"

export type { FilterField, FilterValues } from "@/types/admin"

interface FiltersProps {
  fields: FilterField[]
  values: FilterValues
  onChange: (values: FilterValues) => void
  onReset: () => void
  triggerButton?: React.ReactNode
}

export function Filters({
  fields,
  values,
  onChange,
  onReset,
  triggerButton
}: FiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const updateValue = (key: string, value: FilterValue) => {
    onChange({ ...values, [key]: value })
  }

  const activeFiltersCount = fields.reduce((count, field) => {
    const value = values[field.key]
    if (field.type === 'multiselect') {
      return count + (Array.isArray(value) && value.length > 0 ? 1 : 0)
    }
    if (field.type === 'daterange') {
      const dateRangeValue = value as { from?: string; to?: string } | undefined
      return count + (dateRangeValue?.from || dateRangeValue?.to ? 1 : 0)
    }
    if (field.type === 'checkbox') {
      return count + (value === true ? 1 : 0)
    }
    if (field.type === 'slider' || field.type === 'number') {
      return count + (value !== undefined && value !== field.min && value !== 0 ? 1 : 0)
    }
    return count + (value && value !== '' && value !== 'all' ? 1 : 0)
  }, 0)

  const handleReset = () => {
    onReset()
    setIsOpen(false)
  }

  const handleApply = () => {
    setIsOpen(false)
  }

  const renderField = (field: FilterField) => {
    const value = values[field.key]

    switch (field.type) {
      case 'text':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.key} className="text-sm font-medium">
              {field.label}
            </Label>
            <Input
              id={field.key}
              placeholder={field.placeholder}
              value={(value as string) || ''}
              onChange={(e) => updateValue(field.key, e.target.value)}
              className="h-9"
            />
          </div>
        )

      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.key} className="text-sm font-medium">
              {field.label}
            </Label>
            <Select value={(value as string) || 'all'} onValueChange={(v) => updateValue(field.key, v)}>
              <SelectTrigger id={field.key} className="h-9">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {field.options?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )

      case 'multiselect':
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{field.label}</Label>
            <div className="space-y-2 rounded-md border p-3 max-h-36 overflow-y-auto">
              {field.options?.map(option => (
                <label
                  key={option.value}
                  className="flex items-center space-x-2 cursor-pointer hover:text-primary transition-colors"
                >
                  <Checkbox
                    id={`${field.key}-${option.value}`}
                    checked={Array.isArray(value) ? value.includes(option.value) : false}
                    onCheckedChange={(checked) => {
                      const currentValues = Array.isArray(value) ? value : []
                      if (checked) {
                        updateValue(field.key, [...currentValues, option.value])
                      } else {
                        updateValue(field.key, currentValues.filter(v => v !== option.value))
                      }
                    }}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        )

      case 'checkbox':
        return (
          <label className="flex items-center space-x-2 cursor-pointer py-2">
            <Checkbox
              id={field.key}
              checked={value === true}
              onCheckedChange={(checked) => updateValue(field.key, checked === true)}
            />
            <span className="text-sm font-medium">{field.label}</span>
          </label>
        )

      case 'date':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.key} className="text-sm font-medium">
              {field.label}
            </Label>
            <DatePicker
              date={value ? new Date(value as string) : undefined}
              onDateChange={(date) => updateValue(field.key, date?.toISOString().split('T')[0])}
            />
          </div>
        )

      case 'daterange':
        const dateRangeValue = value as { from?: string; to?: string } | undefined
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{field.label}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">From</Label>
                <DatePicker
                  date={dateRangeValue?.from ? new Date(dateRangeValue.from) : undefined}
                  onDateChange={(date) => updateValue(field.key, {
                    ...dateRangeValue,
                    from: date?.toISOString().split('T')[0]
                  })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <DatePicker
                  date={dateRangeValue?.to ? new Date(dateRangeValue.to) : undefined}
                  onDateChange={(date) => updateValue(field.key, {
                    ...dateRangeValue,
                    to: date?.toISOString().split('T')[0]
                  })}
                />
              </div>
            </div>
          </div>
        )

      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.key} className="text-sm font-medium">
              {field.label}
            </Label>
            <Input
              id={field.key}
              type="number"
              placeholder={field.placeholder || '0'}
              value={(value as number) || ''}
              onChange={(e) => updateValue(field.key, e.target.value ? Number(e.target.value) : undefined)}
              min={field.min}
              max={field.max}
              step={field.step}
              className="h-9"
            />
          </div>
        )

      case 'slider':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
              <span className="text-sm font-medium text-primary">
                {(value as number) ?? field.min ?? 0}
              </span>
            </div>
            <Slider
              id={field.key}
              value={[(value as number) ?? field.min ?? 0]}
              onValueChange={([v]) => updateValue(field.key, v)}
              min={field.min ?? 0}
              max={field.max ?? 100}
              step={field.step ?? 1}
              className="w-full"
            />
          </div>
        )

      default:
        return null
    }
  }

  const TriggerButton = triggerButton || (
    <Button variant="outline" size="default" className="gap-2">
      <Filter className="h-4 w-4" />
      Filters
      {activeFiltersCount > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-xs">
          {activeFiltersCount}
        </Badge>
      )}
    </Button>
  )

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {TriggerButton}
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[480px] flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </SheetTitle>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeFiltersCount} active
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="h-8 w-8"
                title="Reset filters"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {fields.map((field) => (
              <div key={field.key}>
                {renderField(field)}
              </div>
            ))}
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t">
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1"
            >
              Apply Filters
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}