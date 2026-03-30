import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-lg border px-[10px] py-1 text-xs font-semibold uppercase tracking-[0.02em] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        success:
          "border-transparent bg-[#D1FAE5] text-[#065F46] [a&]:hover:bg-success/90",
        warning:
          "border-transparent bg-[#FEF3C7] text-[#92400E] [a&]:hover:bg-warning/90",
        info:
          "border-transparent bg-[#DBEAFE] text-[#1E40AF] [a&]:hover:bg-info/90",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        // Meetalo CRM Design System - Status variants
        preSale: "border-transparent bg-[#FEF3C7] text-[#92400E]",
        closing: "border-transparent bg-[#DBEAFE] text-[#1E40AF]",
        closed: "border-transparent bg-[#D1FAE5] text-[#065F46]",
        lost: "border-transparent bg-[#FEE2E2] text-[#991B1B]",
        new: "border-transparent bg-[#E0E7FF] text-[#3730A3]",
        organic: "border-transparent bg-[#F3F4F6] text-[#374151]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
