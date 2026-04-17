import * as React from "react"
import { cn } from "../../lib/utils"

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, ...props }, ref) => {
    return (
      <kbd
        ref={ref}
        data-slot="kbd"
        className={cn(
          "bg-muted w-fit text-muted-foreground pointer-events-none inline-flex h-5 min-w-5 items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium select-none",
          "[&_svg:not([class*='size-'])]:size-3",
          "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10",
          className
        )}
        {...props}
      />
    )
  }
)
Kbd.displayName = "Kbd"

export interface KbdGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

const KbdGroup = React.forwardRef<HTMLDivElement, KbdGroupProps>(
  ({ className, ...props }, ref) => {
    return (
      <kbd
        ref={ref}
        data-slot="kbd-group"
        className={cn("inline-flex items-center gap-1", className)}
        {...props}
      />
    )
  }
)
KbdGroup.displayName = "KbdGroup"

export { Kbd, KbdGroup }
