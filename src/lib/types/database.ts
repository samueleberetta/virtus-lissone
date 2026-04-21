export type UserRole = "superadmin" | "segretario" | "allenatore";
export type AthleteStatus = "attivo" | "sospeso" | "ritirato";
export type PaymentMode = "unico" | "rate";
export type PaymentStatus = "non_pagato" | "parziale" | "pagato";
export type PaymentMethod = "contanti" | "bonifico";
export type CoachRole = "principale" | "secondo" | "dirigente";
export type DocumentKind =
  | "certificato_medico"
  | "documento_identita"
  | "foto_tessera"
  | "altro";
export type CertificateKind = "dae" | "patentino_csi";
export type AttendanceState = "presente" | "assente" | "giustificato";
export type ActivityAction =
  | "upload_documento"
  | "modifica_atleta"
  | "modifica_quota"
  | "modifica_allenatore"
  | "modifica_certificato"
  | "nuova_convocazione"
  | "nuova_presenza";

export type CertificateStatus = "ok" | "in_scadenza" | "scaduto" | "mancante";

export interface Sport {
  id: string;
  codice: string;
  nome: string;
  attivo: boolean;
}

export interface Season {
  id: string;
  sport_id: string;
  etichetta: string;
  data_inizio: string;
  data_fine: string;
  corrente: boolean;
}

export interface Team {
  id: string;
  sport_id: string;
  nome: string;
  ordine: number;
  attiva: boolean;
}

export interface AppUser {
  id: string;
  email: string;
  nome: string | null;
  cognome: string | null;
  ruolo: UserRole;
  attivo: boolean;
}

export interface Coach {
  id: string;
  user_id: string | null;
  nome: string;
  cognome: string;
  email: string | null;
  telefono: string | null;
  note: string | null;
}

export interface CoachCertificate {
  id: string;
  coach_id: string;
  tipo: CertificateKind;
  data_scadenza: string;
  file_path: string | null;
  note: string | null;
}

export interface CoachTeamRole {
  id: string;
  coach_id: string;
  team_id: string;
  season_id: string;
  ruolo: CoachRole;
}

export interface Athlete {
  id: string;
  sport_id: string;
  nome: string;
  cognome: string;
  data_nascita: string;
  codice_fiscale: string | null;
  indirizzo: string | null;
  citta: string | null;
  cap: string | null;
  provincia: string | null;
  telefono: string | null;
  email: string | null;
  genitore_nome: string | null;
  genitore_email: string | null;
  genitore_telefono: string | null;
  foto_path: string | null;
  stato: AthleteStatus;
  consenso_gdpr: boolean;
  data_consenso_gdpr: string | null;
  scheduled_deletion_date: string | null;
  note: string | null;
}

export interface AthleteSeason {
  id: string;
  athlete_id: string;
  season_id: string;
  team_id: string;
  numero_maglia: number | null;
  data_iscrizione: string;
}

export interface Document {
  id: string;
  athlete_id: string;
  tipo: DocumentKind;
  etichetta: string | null;
  file_path: string;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  data_scadenza: string | null;
}

export interface Payment {
  id: string;
  athlete_id: string;
  season_id: string;
  importo_totale: number;
  modalita: PaymentMode;
  stato: PaymentStatus;
  unico_importo: number | null;
  unico_data: string | null;
  unico_metodo: PaymentMethod | null;
  rata1_importo: number | null;
  rata1_data: string | null;
  rata1_metodo: PaymentMethod | null;
  rata2_importo: number | null;
  rata2_data: string | null;
  rata2_metodo: PaymentMethod | null;
  note: string | null;
}

export interface TrainingSession {
  id: string;
  team_id: string;
  season_id: string;
  data: string;
  orario_inizio: string | null;
  orario_fine: string | null;
  luogo: string | null;
  note: string | null;
}

export interface Attendance {
  id: string;
  session_id: string;
  athlete_id: string;
  stato: AttendanceState;
  note: string | null;
}

export interface Match {
  id: string;
  team_id: string;
  season_id: string;
  data: string;
  orario: string | null;
  luogo: string | null;
  avversario: string | null;
  casa_trasferta: "casa" | "trasferta" | null;
  note: string | null;
}

export interface Convocation {
  id: string;
  match_id: string;
  athlete_id: string;
  convocato: boolean;
  note: string | null;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  azione: ActivityAction;
  entity_type: string | null;
  entity_id: string | null;
  descrizione: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
