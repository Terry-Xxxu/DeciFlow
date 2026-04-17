import { cn } from "../../lib/utils"


interface DeciFlowLogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export function DeciFlowLogo({ className, size = "md", showText = true }: DeciFlowLogoProps) {
  const sizes = {
    sm: { icon: "h-7 w-7", text: "text-sm" },
    md: { icon: "h-9 w-9", text: "text-lg" },
    lg: { icon: "h-11 w-11", text: "text-xl" },
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Logo Icon - White background with abstract data flow design */}
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 dark:ring-white/10",
          sizes[size].icon
        )}
      >
        <svg
          viewBox="0 0 28 28"
          fill="none"
          className="h-6 w-6"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Abstract data flow - solid block and outline block pattern */}
          {/* Top left - solid square */}
          <rect x="4" y="4" width="8" height="8" rx="2" fill="#0a0a0a" />
          
          {/* Top right - outline square */}
          <rect x="16" y="4" width="8" height="8" rx="2" stroke="#0a0a0a" strokeWidth="1.5" fill="none" />
          
          {/* Bottom left - outline square */}
          <rect x="4" y="16" width="8" height="8" rx="2" stroke="#0a0a0a" strokeWidth="1.5" fill="none" />
          
          {/* Bottom right - solid square */}
          <rect x="16" y="16" width="8" height="8" rx="2" fill="#0a0a0a" />
          
          {/* Flow connection lines */}
          <path
            d="M12 8L16 8M12 20L16 20M8 12L8 16M20 12L20 16"
            stroke="#0a0a0a"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="2 2"
          />
        </svg>
      </div>

      {showText && (
        <span className={cn("font-semibold tracking-tight text-foreground", sizes[size].text)}>
          DeciFlow
        </span>
      )}
    </div>
  )
}
