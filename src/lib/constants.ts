import type { CoachRole, DocumentKind, PaymentMethod } from "@/lib/types/database";

export const SQUADRE_CALCIO = [
  "Under 10",
  "Under 11",
  "Under 13",
  "Under 15",
  "Juniores",
  "Open SBC",
  "Open NEW",
  "Open Bianca",
] as const;

export const COACH_ROLE_LABELS: Record<CoachRole, string> = {
  principale: "Allenatore principale",
  secondo: "Allenatore in seconda",
  dirigente: "Dirigente accompagnatore",
};

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  certificato_medico: "Certificato medico agonistico",
  documento_identita: "Documento d'identità",
  foto_tessera: "Foto tessera",
  altro: "Altro",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  contanti: "Contanti",
  bonifico: "Bonifico",
};

export const APP_NAME = "Gestionale Virtus Lissone";
export const FOUNDED_YEAR = 1903;
