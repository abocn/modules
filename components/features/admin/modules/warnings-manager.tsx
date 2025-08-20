"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Plus, X, Shield, Code, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export type WarningType = "malware" | "closed-source" | "stolen-code"

export interface Warning {
  type: WarningType
  message: string
}

interface WarningsManagerProps {
  warnings: Warning[]
  onChange: (warnings: Warning[]) => void
}

const warningTypes: { value: WarningType; label: string; icon: React.ReactNode; color: string }[] = [
  {
    value: "malware",
    label: "Malware",
    icon: <Shield className="h-4 w-4" />,
    color: "destructive"
  },
  {
    value: "closed-source",
    label: "Closed Source",
    icon: <Lock className="h-4 w-4" />,
    color: "warning"
  },
  {
    value: "stolen-code",
    label: "Stolen Code",
    icon: <Code className="h-4 w-4" />,
    color: "destructive"
  },
]

export function WarningsManager({ warnings, onChange }: WarningsManagerProps) {
  const [newWarningType, setNewWarningType] = useState<WarningType>("closed-source")
  const [newWarningMessage, setNewWarningMessage] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  const addWarning = () => {
    if (newWarningMessage.trim()) {
      onChange([...warnings, { type: newWarningType, message: newWarningMessage.trim() }])
      setNewWarningMessage("")
      setIsAdding(false)
    }
  }

  const removeWarning = (index: number) => {
    onChange(warnings.filter((_, i) => i !== index))
  }

  const getWarningBadgeVariant = (type: WarningType): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case "malware":
      case "stolen-code":
        return "destructive"
      case "closed-source":
        return "secondary"
      default:
        return "default"
    }
  }

  const getWarningIcon = (type: WarningType) => {
    const warningType = warningTypes.find(w => w.value === type)
    return warningType?.icon || <AlertTriangle className="h-4 w-4" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Module Warnings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {warnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No warnings added</p>
          ) : (
            warnings.map((warning, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-card">
                <Badge variant={getWarningBadgeVariant(warning.type)} className="mt-0.5">
                  <span className="flex items-center gap-1">
                    {getWarningIcon(warning.type)}
                    {warningTypes.find(w => w.value === warning.type)?.label}
                  </span>
                </Badge>
                <div className="flex-1">
                  <p className="text-sm">{warning.message}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeWarning(index)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {isAdding ? (
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <Label>Warning Type</Label>
              <Select value={newWarningType} onValueChange={(value) => setNewWarningType(value as WarningType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {warningTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        {type.icon}
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Warning Message</Label>
              <Textarea
                placeholder="Describe the warning or concern..."
                value={newWarningMessage}
                onChange={(e) => setNewWarningMessage(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" onClick={addWarning} size="sm">
                Add Warning
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setIsAdding(false)
                  setNewWarningMessage("")
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Warning
          </Button>
        )}
      </CardContent>
    </Card>
  )
}