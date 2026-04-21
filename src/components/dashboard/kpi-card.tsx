import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "red" | "yellow" | "green";

const toneStyles: Record<Tone, { border: string; bg: string; value: string; icon: string }> = {
  neutral: { border: "border-neutral-200", bg: "bg-white", value: "text-neutral-900", icon: "text-neutral-400" },
  red: { border: "border-red-200", bg: "bg-white", value: "text-virtus-red", icon: "text-virtus-red" },
  yellow: { border: "border-yellow-200", bg: "bg-white", value: "text-yellow-600", icon: "text-virtus-yellow-dark" },
  green: { border: "border-green-200", bg: "bg-white", value: "text-green-700", icon: "text-green-600" },
};

export function KpiCard({
  label,
  value,
  sublabel,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: number | string;
  sublabel?: string;
  tone?: Tone;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const t = toneStyles[tone];
  return (
    <div className={cn("rounded-lg border shadow-sm px-5 py-4", t.border, t.bg)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
            {label}
          </div>
          <div className={cn("text-3xl font-bold mt-1", t.value)}>{value}</div>
          {sublabel && (
            <div className="text-xs text-neutral-500 mt-1">{sublabel}</div>
          )}
        </div>
        {Icon && <Icon className={cn("h-6 w-6", t.icon)} />}
      </div>
    </div>
  );
}
