import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/server";
import { certificateStatus, certificateStatusLabel } from "@/lib/utils/certificates";
import { formatDate } from "@/lib/utils/format";
import type { CertificateStatus } from "@/lib/types/database";

export const dynamic = "force-dynamic";

interface CriticalRow {
  subject: string;
  squadra: string | null;
  cert_label: string;
  status: CertificateStatus;
  data_scadenza: string | null;
}

function renderSection(title: string, rows: CriticalRow[]): string {
  if (rows.length === 0) return "";
  const items = rows
    .map((r) => {
      const color =
        r.status === "scaduto"
          ? "#DC2626"
          : r.status === "in_scadenza"
            ? "#CA8A04"
            : "#6B7280";
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee"><strong>${r.subject}</strong></td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;color:#555">${r.squadra ?? "—"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.cert_label}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${r.data_scadenza ? formatDate(r.data_scadenza) : "—"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;color:${color};font-weight:600">${certificateStatusLabel(r.status)}</td>
      </tr>`;
    })
    .join("");
  return `<h3 style="font-size:14px;margin:18px 0 8px;color:#1a1a1a">${title} (${rows.length})</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:#1a1a1a;color:#E8C01A;text-align:left">
          <th style="padding:8px 10px">Nome</th>
          <th style="padding:8px 10px">Squadra</th>
          <th style="padding:8px 10px">Certificato</th>
          <th style="padding:8px 10px">Scadenza</th>
          <th style="padding:8px 10px">Stato</th>
        </tr>
      </thead>
      <tbody>${items}</tbody>
    </table>`;
}

function renderEmail(
  heading: string,
  intro: string,
  atleti: CriticalRow[],
  allenatori: CriticalRow[],
): string {
  return `<!doctype html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;margin:0;background:#f5f5f5">
  <div style="max-width:680px;margin:0 auto;padding:20px">
    <div style="background:#1a1a1a;color:white;padding:18px 20px;border-left:4px solid #E8C01A">
      <div style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.05em">Virtus Lissone · 1903</div>
      <div style="font-size:20px;font-weight:700;color:#E8C01A;margin-top:4px">${heading}</div>
    </div>
    <div style="background:white;padding:20px">
      <p style="margin:0 0 16px;color:#333;font-size:14px">${intro}</p>
      ${renderSection("Atleti · Certificati medici", atleti)}
      ${renderSection("Allenatori · Certificati DAE / Patentino CSI", allenatori)}
      ${atleti.length === 0 && allenatori.length === 0
        ? '<p style="color:#16A34A;font-weight:600">Nessuna criticità. Tutto in regola. ✅</p>'
        : ""}
    </div>
    <p style="font-size:11px;color:#888;text-align:center;margin-top:12px">
      Messaggio automatico inviato dal Gestionale Virtus Lissone.
    </p>
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY non configurata" }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? "gestionale@virtuslissone.it";
  const service = createServiceClient();

  const { data: season } = await service
    .from("seasons")
    .select("id")
    .eq("corrente", true)
    .maybeSingle();
  if (!season) {
    return NextResponse.json({ ok: true, skipped: "no current season" });
  }

  // --- Raccogli criticità atleti ---
  const { data: athleteRows } = await service
    .from("athlete_seasons")
    .select(
      `
      team_id,
      teams ( nome ),
      athletes (
        id, nome, cognome,
        documents ( tipo, data_scadenza )
      )
    `,
    )
    .eq("season_id", season.id);

  const atleti: (CriticalRow & { team_id: string })[] = [];
  for (const r of (athleteRows ?? []) as unknown as {
    team_id: string;
    teams: { nome: string } | null;
    athletes: {
      id: string;
      nome: string;
      cognome: string;
      documents: { tipo: string; data_scadenza: string | null }[] | null;
    } | null;
  }[]) {
    const a = r.athletes;
    if (!a) continue;
    const med = (a.documents ?? []).find((d) => d.tipo === "certificato_medico");
    const status = certificateStatus(med?.data_scadenza ?? null);
    if (status === "ok") continue;
    atleti.push({
      subject: `${a.cognome} ${a.nome}`,
      squadra: r.teams?.nome ?? null,
      cert_label: "Certificato medico",
      status,
      data_scadenza: med?.data_scadenza ?? null,
      team_id: r.team_id,
    });
  }

  // --- Raccogli criticità allenatori ---
  const { data: coachRows } = await service.from("coaches").select(`
      id, nome, cognome,
      coach_certificates ( tipo, data_scadenza ),
      coach_team_roles ( season_id, team_id, teams(nome) )
    `);

  const allenatori: CriticalRow[] = [];
  for (const c of (coachRows ?? []) as unknown as {
    id: string;
    nome: string;
    cognome: string;
    coach_certificates: { tipo: "dae" | "patentino_csi"; data_scadenza: string }[];
    coach_team_roles: { season_id: string; teams: { nome: string } | null }[];
  }[]) {
    const teamsLabel =
      c.coach_team_roles
        .filter((r) => r.season_id === season.id)
        .map((r) => r.teams?.nome)
        .filter(Boolean)
        .join(", ") || null;

    const types: { tipo: "dae" | "patentino_csi"; label: string }[] = [
      { tipo: "dae", label: "Certificato DAE" },
      { tipo: "patentino_csi", label: "Patentino allenatore CSI" },
    ];
    for (const t of types) {
      const cert = c.coach_certificates.find((x) => x.tipo === t.tipo);
      const status = certificateStatus(cert?.data_scadenza ?? null);
      if (status === "ok") continue;
      allenatori.push({
        subject: `${c.cognome} ${c.nome}`,
        squadra: teamsLabel,
        cert_label: t.label,
        status,
        data_scadenza: cert?.data_scadenza ?? null,
      });
    }
  }

  // --- Email al superadmin ---
  const { data: superadmins } = await service
    .from("users")
    .select("email")
    .eq("ruolo", "superadmin")
    .eq("attivo", true);

  const sent: string[] = [];

  for (const sa of superadmins ?? []) {
    if (!sa.email) continue;
    await resend.emails.send({
      from,
      to: sa.email,
      subject: `[Virtus Lissone] Riepilogo settimanale certificati — ${atleti.length + allenatori.length} criticità`,
      html: renderEmail(
        "Riepilogo settimanale",
        `Ci sono ${atleti.length} atleti e ${allenatori.length} allenatori con certificati non in regola.`,
        atleti,
        allenatori,
      ),
    });
    sent.push(sa.email);
  }

  // --- Email per ciascun allenatore, solo i suoi atleti ---
  const { data: coachUsers } = await service
    .from("coaches")
    .select(
      `
      id, nome, cognome, email,
      users!coaches_user_id_fkey ( email ),
      coach_team_roles ( season_id, team_id )
    `,
    );

  for (const c of (coachUsers ?? []) as unknown as {
    nome: string;
    cognome: string;
    email: string | null;
    users: { email: string } | null;
    coach_team_roles: { season_id: string; team_id: string }[];
  }[]) {
    const email = c.users?.email ?? c.email;
    if (!email) continue;
    const teamIds = new Set(
      c.coach_team_roles.filter((r) => r.season_id === season.id).map((r) => r.team_id),
    );
    const myAthletes = atleti.filter((a) => teamIds.has(a.team_id));
    if (myAthletes.length === 0) continue;

    await resend.emails.send({
      from,
      to: email,
      subject: `[Virtus Lissone] I tuoi atleti con certificato critico — ${myAthletes.length}`,
      html: renderEmail(
        `Ciao ${c.nome}`,
        `Questi atleti della tua squadra hanno il certificato medico in stato critico. Ricorda di sollecitarne l'aggiornamento.`,
        myAthletes,
        [],
      ),
    });
    sent.push(email);
  }

  return NextResponse.json({
    ok: true,
    season: season.id,
    critical: { atleti: atleti.length, allenatori: allenatori.length },
    sent,
  });
}
