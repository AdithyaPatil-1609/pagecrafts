import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        // The headline action: brand gradient with a soft red halo (landing CTAs,
        // "Create My Site", "Get started"). One per screen at most.
        brand:
          "brand-gradient text-primary-foreground shadow-[0_8px_30px_var(--brand-glow)] hover:brightness-110",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline:
          "border border-border bg-background hover:bg-accent hover:text-accent-foreground",
        // Quiet twin of `brand` — sits next to it as the second choice.
        "outline-brand":
          "border border-primary/40 bg-transparent text-foreground hover:border-primary hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3",
        default: "h-9 px-4 py-2",
        lg: "h-10 px-6",
        xl: "h-14 px-7 text-base",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
