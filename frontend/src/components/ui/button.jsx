import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white/80 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 hover:shadow-md active:scale-95",
        destructive:
          "bg-gradient-to-b from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:shadow-md active:scale-95",
        outline:
          "border-2 border-ocean-600 bg-transparent text-ocean-600 hover:bg-ocean-600 hover:text-white hover:shadow-md active:scale-95",
        secondary:
          "bg-ocean-100 text-ocean-700 hover:bg-ocean-200 hover:shadow-sm active:scale-95",
        ghost: "hover:bg-ocean-50 hover:text-ocean-700 active:scale-95",
        link: "text-ocean-600 underline underline-offset-2 hover:no-underline hover:text-ocean-700 focus-visible:ring-2 focus-visible:ring-ocean-500",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-[44px]",
        sm: "h-9 rounded-lg px-3 min-h-[36px]",
        lg: "h-11 rounded-lg px-8 min-h-[44px]",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px] p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
