import { cn } from "@/lib/utils/cn";
import type { CertificateStatus } from "@/lib/types/database";
import { certificateStatusLabel } from "@/lib/utils/certificates";

const colors: Record<CertificateStatus, { dot: string; bg: string; text: string }> = {
  ok: { dot: "bg-status-green", bg: "bg-status-green-bg", text: "text-green-800" },
  in_scadenza: {
    dot: "bg-status-yellow",
    bg: "bg-status-yellow-bg",
    text: "text-yellow-800",
  },
  scaduto: { dot: "bg-status-red", bg: "bg-status-red-bg", text: "text-red-800" },
  mancante: { dot: "bg-neutral-400", bg: "bg-neutral-100", text: "text-neutral-700" },
};

export function Semaforo({
  status,
  label,
  className,
}: {
  status: CertificateStatus;
  label?: string;
  className?: string;
}) {
  const c = colors[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        c.bg,
        c.text,
        className,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", c.dot)} />
      {label ?? certificateStatusLabel(status)}
    </span>
  );
}

export function SemaforoDot({
  status,
  className,
}: {
  status: CertificateStatus;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 rounded-full", colors[status].dot, className)}
      title={certificateStatusLabel(status)}
    />
  );
}
