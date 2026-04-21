import type { CertificateStatus } from "@/lib/types/database";

export const SCADENZA_GIORNI_SOGLIA = 30;

export function certificateStatus(
  dataScadenza: string | null | undefined,
): CertificateStatus {
  if (!dataScadenza) return "mancante";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(dataScadenza);
  exp.setHours(0, 0, 0, 0);
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "scaduto";
  if (diffDays <= SCADENZA_GIORNI_SOGLIA) return "in_scadenza";
  return "ok";
}

export function certificateStatusRank(s: CertificateStatus): number {
  // Più alto = più critico (scaduto > mancante > in scadenza > ok)
  switch (s) {
    case "scaduto":
      return 3;
    case "mancante":
      return 2;
    case "in_scadenza":
      return 1;
    default:
      return 0;
  }
}

export function certificateStatusLabel(s: CertificateStatus): string {
  switch (s) {
    case "ok":
      return "Valido";
    case "in_scadenza":
      return "In scadenza";
    case "scaduto":
      return "Scaduto";
    case "mancante":
      return "Mancante";
  }
}

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(date);
  exp.setHours(0, 0, 0, 0);
  return Math.floor((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
