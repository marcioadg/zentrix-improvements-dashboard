
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[2px] border px-2 py-0.5 text-[11px] font-medium transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary/10 text-primary",
        secondary:
          "border-transparent bg-muted text-muted-foreground",
        destructive:
          "border-transparent bg-destructive/10 text-destructive",
        outline: "border border-border text-foreground",
        subtle: "text-muted-foreground bg-transparent border-transparent",
        // Status badges - flat Linear style
        todo: "border-transparent bg-primary/10 text-primary",
        inprogress: "border-transparent bg-orange-500/10 text-orange-500",
        done: "border-transparent bg-green-500/10 text-green-500",
        // Personal/Team badges
        personal: "border-transparent bg-muted text-muted-foreground",
        team: "border-transparent bg-purple-500/10 text-purple-500",
        // Flat badges for admin
        success: "border-transparent bg-green-500/10 text-green-500",
        warning: "border-transparent bg-yellow-500/10 text-yellow-500",
        danger: "border-transparent bg-destructive/10 text-destructive",
        premium: "border-transparent bg-purple-500/10 text-purple-500",
        trial: "border-transparent bg-primary/10 text-primary",
        free: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean;        // Enable pulse animation
  appearing?: boolean;    // Show appear animation
  interactive?: boolean;  // Make clickable with press effect
}

function Badge({ 
  className, 
  variant, 
  pulse = false,
  appearing = false,
  interactive = false,
  ...props 
}: BadgeProps) {
  return (
    <div 
      className={cn(
        badgeVariants({ variant }), 
        appearing && "animate-badge-in",
        pulse && "animate-badge-pulse",
        interactive && "cursor-pointer active:scale-95 hover:shadow-sm",
        className
      )} 
      {...props} 
    />
  )
}

export { Badge, badgeVariants }
