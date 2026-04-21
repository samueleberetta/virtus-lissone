# Gestionale Virtus Lissone

Gestionale web per la **Polisportiva Virtus Lissone**, società sportiva dilettantistica affiliata CSI (fondata nel 1903). Costruito su **Next.js 15 (App Router) + Supabase** con UI in italiano.

Architettura **modulare per sport**: ora è attivo il modulo calcio; il modulo basket è già predisposto a livello di schema (campo `sport_id` su tutte le entità principali).

## Stack

- **Next.js 15** (App Router, Server Actions, React 19)
- **Supabase**: Auth, Postgres, Storage (bucket privati), Row Level Security
- **Tailwind CSS** con palette brand Virtus (rosso `#C0392B`, giallo `#E8C01A`, scuro `#1a1a1a`)
- **Resend** per email settimanali
- **ExcelJS** per export Excel
- PDF generato via HTML stampabile (stampa browser → salva come PDF)

## Ruoli utente

| Ruolo | Permessi |
|---|---|
| `superadmin` | Accesso completo: utenti, allenatori, impostazioni, log attività |
| `segretario` | Gestisce atleti, documenti, quote, convocazioni, presenze |
| `allenatore` | Sola lettura sulla propria squadra (atleti, documenti, presenze, convocazioni) |

Gli atleti e i genitori **non** hanno accesso al gestionale.

## Squadre calcio (fisse)

Under 10 · Under 11 · Under 13 · Under 15 · Juniores · Open SBC · Open NEW · Open Bianca

Ogni anno cambiano gli atleti, non i nomi. Le 8 squadre sono pre-caricate nel DB.

## Funzionalità

1. **Autenticazione** — Supabase Auth (email + password), middleware di sessione, redirect per ruolo.
2. **Anno sportivo** — ogni stagione è un'entità separata; `athlete_seasons` lega atleti e squadre per stagione.
3. **Squadre** — 8 squadre pre-caricate, modificabili dal superadmin.
4. **Allenatori** — sezione riservata al superadmin, gestione ruoli per squadra/stagione, certificati DAE e patentino CSI con semaforo 🟢🟡🔴.
5. **Atleti** — scheda completa con dati anagrafici, genitore/tutore (obbligatorio se minorenne), foto, storico squadre/stagioni, consenso GDPR con data firma.
6. **Documenti** — certificato medico agonistico (scadenza obbligatoria), documento d'identità, foto tessera, allegati liberi. File su Supabase Storage **privato** con accesso solo tramite signed URL.
7. **Quote** — modalità unica o a rate (1+2) con metodo (contanti/bonifico); stato `non_pagato/parziale/pagato`; KPI riepilogo e vista per squadra.
8. **Avvisi** — banner rosso in dashboard, pagina `/avvisi` filtrabile per squadra e stato, email settimanale.
9. **Convocazioni** — crea gara (data, orario, luogo, avversario) e seleziona gli atleti convocati.
10. **Presenze allenamenti** — crea sessione per squadra, segna presente/assente/giustificato, storico consultabile.
11. **Export**
    - `/api/export/excel?season=...&team=...` → file XLSX con anagrafica + documenti + quote
    - `/api/export/pdf?season=...&team=...` → pagina HTML stampabile (stampa → salva come PDF) per gare/tornei CSI
12. **Log attività** — visibile al solo superadmin, tracciamento automatico via Server Actions.

## Schema database

Tabelle (tutte con `sport_id` dove applicabile, in `supabase/migrations/`):

```
sports, seasons, users, teams,
coaches, coach_team_roles, coach_certificates,
athletes, athlete_seasons,
documents, payments,
training_sessions, attendance,
matches, convocations,
activity_logs
```

Policy **RLS** attive su tutte le tabelle (vedi `20260421000001_rls_policies.sql`):
- allenatore → solo i dati della propria squadra stagione corrente
- segretario → tutti gli atleti, documenti, quote, presenze, convocazioni
- superadmin → tutto + impostazioni + log

Storage bucket privati:
- `documenti-atleti` (certificati medici, documenti d'identità, foto tessera)
- `certificati-allenatori` (DAE, patentini CSI)
- `foto-atleti`

## Setup locale

### 1. Variabili d'ambiente

```bash
cp .env.example .env.local
```

Compila:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=gestionale@virtuslissone.it
CRON_SECRET=una-stringa-lunga-random
```

### 2. Database

Dalla dashboard Supabase (SQL Editor) esegui in ordine i file in `supabase/migrations/`:

1. `20260421000000_initial_schema.sql` — tabelle, enum, helper functions
2. `20260421000001_rls_policies.sql` — Row Level Security
3. `20260421000002_storage.sql` — bucket privati e relative policy

Poi il seed con le 8 squadre e la stagione 2024/2025:

```
supabase/seed.sql
```

### 3. Primo utente superadmin

Crea l'utente dalla dashboard Supabase (Auth → Users → Invite) e poi, via SQL editor:

```sql
update public.users set ruolo = 'superadmin' where email = 'tu@virtuslissone.it';
```

### 4. Avvio

```bash
npm install
npm run dev
```

App su http://localhost:3000 — il middleware reindirizza al login.

## Cron email settimanale

L'endpoint `/api/cron/notifications` invia ogni lunedì (`0 8 * * 1` in `vercel.json`):
- al **superadmin**: riepilogo completo atleti + allenatori con certificati critici
- a ogni **allenatore**: solo gli atleti critici della propria squadra

Protezione: richiede header `Authorization: Bearer $CRON_SECRET`. Vercel Cron lo invia automaticamente.

## Palette e identità visiva

- Rosso `#C0392B` — brand primario, criticità, pulsanti principali
- Giallo `#E8C01A` — accenti, voce attiva sidebar, banner highlight
- Scuro `#1a1a1a` — sidebar, topbar login
- Semaforo documenti: 🟢 ok · 🟡 in scadenza ≤30gg · 🔴 scaduto · ⚪ mancante

## GDPR

- Consenso esplicito obbligatorio per minorenni (flag + data firma nella scheda atleta)
- File su Storage privati, no URL pubblici (solo signed URL dal server)
- Campo `scheduled_deletion_date` per la data retention
- Pagina pubblica `/privacy` con informativa

## Struttura progetto

```
src/
├── app/
│   ├── (app)/           # layout autenticato con sidebar
│   │   ├── dashboard/
│   │   ├── atleti/
│   │   ├── allenatori/
│   │   ├── squadre/
│   │   ├── documenti/
│   │   ├── quote/
│   │   ├── convocazioni/
│   │   ├── presenze/
│   │   ├── avvisi/
│   │   ├── log/
│   │   └── impostazioni/
│   ├── api/
│   │   ├── cron/notifications/   # email settimanali
│   │   └── export/{excel,pdf}/
│   ├── login/
│   └── privacy/
├── components/
│   ├── layout/      # sidebar, topbar, alert banner
│   ├── ui/          # button, input, card, table, semaforo, badge
│   ├── dashboard/
│   └── athletes/
└── lib/
    ├── actions/     # Server Actions (atleti, allenatori, quote, ecc.)
    ├── queries/     # query riutilizzabili (dashboard, avvisi)
    ├── supabase/    # client, server, middleware
    ├── utils/       # auth, format, certificates, cn
    ├── types/       # tipi TypeScript database
    └── constants.ts

supabase/
├── migrations/      # schema + RLS + storage
└── seed.sql         # 8 squadre calcio + stagione 2024/2025
```
