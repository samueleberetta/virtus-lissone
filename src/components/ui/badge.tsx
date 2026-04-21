import { cn } from "@/lib/utils/cn";

type Variant = "default" | "red" | "yellow" | "green" | "neutral";

const variantStyles: Record<Variant, string> = {
  default: "bg-neutral-100 text-neutral-800",
  red: "bg-red-100 text-red-800",
  yellow: "bg-yellow-100 text-yellow-800",
  green: "bg-green-100 text-green-800",
  neutral: "bg-neutral-200 text-neutral-700",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
