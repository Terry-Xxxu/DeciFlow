import { useState, useRef, useEffect } from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"
import { useTheme } from "../../contexts/ThemeContext"

interface SelectOption {
  value: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

interface SelectProps {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function Select({ options, value, onChange, placeholder = "请选择", className }: SelectProps) {
  const { mode } = useTheme()
  const isDark = mode === 'dark'
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)
  const selectedOption = options.find((opt) => opt.value === value)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={selectRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-lg border border-border",
          "bg-card px-3 py-2 text-sm text-left",
          "transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
          isDark ? "hover:border-white/20" : "hover:border-primary/50",
          isOpen && "border-primary ring-2 ring-primary/20"
        )}
      >
        <span className={cn("flex-1", !selectedOption && "text-muted-foreground")}>
          {selectedOption ? (
            <span className={cn("flex items-center gap-2", isDark ? "text-foreground" : "text-gray-900")}>
              {selectedOption.icon && <selectedOption.icon className={cn("h-4 w-4", isDark ? "text-muted-foreground" : "text-gray-500")} />}
              {selectedOption.label}
            </span>
          ) : (
            <span className={isDark ? "text-muted-foreground" : "text-gray-500"}>{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            isDark ? "text-muted-foreground" : "text-gray-500",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-1 w-full rounded-xl border border-border shadow-lg",
            "bg-card backdrop-blur-md",
            "max-h-60 overflow-y-auto dropdown-scroll",
            "animate-in fade-in slide-in-from-top-1 duration-200"
          )}
        >
          <div className="py-1">
            {options.map((option) => {
              const isSelected = option.value === value
              const Icon = option.icon

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors",
                    isDark ? "hover:bg-white/5" : "hover:bg-primary/10",
                    isSelected && (isDark ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"),
                    isSelected && "font-medium",
                    "focus:outline-none",
                    isDark ? "focus:bg-white/10" : "focus:bg-primary/15"
                  )}
                >
                  {Icon && <Icon className={cn("h-4 w-4", isDark ? "text-muted-foreground" : "text-gray-500")} />}
                  <span className={cn("flex-1 text-left", isDark ? "text-foreground" : "text-gray-700")}>{option.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary ml-auto" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
