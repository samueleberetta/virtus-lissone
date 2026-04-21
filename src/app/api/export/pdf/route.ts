import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/utils/auth";
import {
  certificateStatus,
  certificateStatusLabel,
} from "@/lib/utils/certificates";
import { formatDate, computeAge } from "@/lib/utils/format";

// Genera un HTML formattato stampabile come PDF dal browser.
// Scelta volutamente dependency-free: Next.js non include un renderer PDF di default.
export async function GET(request: NextRequest) {
  await requireUser();
  const { searchParams } = new URL(request.url);
  const seasonId = searchParams.get("season");
  const teamId = searchParams.get("team");
  if (!seasonId || !teamId) {
    return NextResponse.json(
      { error: "Stagione e squadra richieste" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const [{ data: team }, { data: season }, { data: rows }] = await Promise.all([
    supabase.from("teams").select("nome").eq("id", teamId).maybeSingle(),
    supabase.from("seasons").select("etichetta").eq("id", seasonId).maybeSingle(),
    supabase
      .from("athlete_seasons")
      .select(
        `
        numero_maglia,
        athletes (
          id, nome, cognome, data_nascita, codice_fiscale,
          documents (tipo, data_scadenza)
        )
      `,
      )
      .eq("season_id", seasonId)
      .eq("team_id", teamId),
  ]);

  type Row = {
    numero_maglia: number | null;
    athletes: {
      nome: string;
      cognome: string;
      data_nascita: string;
      codice_fiscale: string | null;
      documents: { tipo: string; data_scadenza: string | null }[] | null;
    } | null;
  };

  const sorted = ((rows ?? []) as unknown as Row[])
    .filter((r) => r.athletes)
    .sort((a, b) =>
      (a.athletes!.cognome ?? "").localeCompare(b.athletes!.cognome ?? ""),
    );

  const rowsHtml = sorted
    .map((r, i) => {
      const a = r.athletes!;
      const med = (a.documents ?? []).find((d) => d.tipo === "certificato_medico");
      const status = certificateStatus(med?.data_scadenza ?? null);
      const color =
        status === "ok"
          ? "#16A34A"
          : status === "in_scadenza"
            ? "#CA8A04"
            : "#DC2626";
      return `
      <tr>
        <td>${i + 1}</td>
        <td>${r.numero_maglia ?? ""}</td>
        <td><strong>${a.cognome}</strong> ${a.nome}</td>
        <td>${formatDate(a.data_nascita)} (${computeAge(a.data_nascita)})</td>
        <td>${a.codice_fiscale ?? ""}</td>
        <td>${med?.data_scadenza ? formatDate(med.data_scadenza) : "—"}</td>
        <td style="color:${color};font-weight:600">${certificateStatusLabel(status)}</td>
      </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>Lista atleti — ${team?.nome ?? ""} — ${season?.etichetta ?? ""}</title>
  <style>
    @page { size: A4 portrait; margin: 16mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; }
    header { border-bottom: 3px solid #C0392B; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: end; }
    header h1 { margin: 0; font-size: 18px; }
    header .sub { color: #666; font-size: 11px; }
    .badge { background: #E8C01A; color: #1a1a1a; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e5e5; }
    th { background: #1a1a1a; color: #E8C01A; text-transform: uppercase; font-size: 10px; letter-spacing: 0.03em; }
    tr:nth-child(even) td { background: #fafafa; }
    footer { margin-top: 24px; font-size: 10px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
    .actions { margin: 12px 0 18px; text-align: right; }
    .actions button { background: #C0392B; color: white; border: 0; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    @media print { .actions { display: none; } }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Virtus Lissone · ${team?.nome ?? ""}</h1>
      <div class="sub">Lista atleti stagione ${season?.etichetta ?? ""} · ${sorted.length} atleti</div>
    </div>
    <div class="badge">CSI 1903</div>
  </header>
  <div class="actions">
    <button onclick="window.print()">Stampa / Salva PDF</button>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>N°</th>
        <th>Atleta</th>
        <th>Nato il</th>
        <th>Cod. fiscale</th>
        <th>Scad. cert. medico</th>
        <th>Stato</th>
      </tr>
    </thead>
    <tbody>${rowsHtml || '<tr><td colspan="7" style="text-align:center;color:#888;padding:20px">Nessun atleta iscritto.</td></tr>'}</tbody>
  </table>
  <footer>
    Polisportiva Virtus Lissone · affiliata CSI · documento generato il ${new Date().toLocaleString("it-IT")}
  </footer>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
