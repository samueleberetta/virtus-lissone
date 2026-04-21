import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-virtus-red hover:bg-virtus-red-dark text-white shadow-sm disabled:opacity-50",
  secondary:
    "bg-virtus-yellow hover:bg-virtus-yellow-dark text-neutral-900 shadow-sm disabled:opacity-50",
  danger: "bg-status-red hover:bg-red-700 text-white shadow-sm disabled:opacity-50",
  ghost: "text-neutral-700 hover:bg-neutral-100 disabled:opacity-50",
  outline:
    "border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 disabled:opacity-50",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
