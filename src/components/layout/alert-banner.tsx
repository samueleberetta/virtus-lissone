import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function AlertBanner({
  scaduti,
  inScadenza,
}: {
  scaduti: number;
  inScadenza: number;
}) {
  if (scaduti === 0 && inScadenza === 0) return null;

  return (
    <Link
      href="/avvisi"
      className="block bg-virtus-red text-white border-l-4 border-virtus-yellow"
    >
      <div className="px-6 py-3 flex items-center gap-3 text-sm hover:bg-virtus-red-dark transition-colors">
        <AlertTriangle className="h-5 w-5 text-virtus-yellow shrink-0" />
        <div className="flex-1">
          <span className="font-semibold">Attenzione:</span>{" "}
          {scaduti > 0 && (
            <span>
              {scaduti} certificat{scaduti === 1 ? "o" : "i"}{" "}
              <span className="font-semibold">scadut{scaduti === 1 ? "o" : "i"}</span>
            </span>
          )}
          {scaduti > 0 && inScadenza > 0 && <span>, </span>}
          {inScadenza > 0 && (
            <span>
              {inScadenza} in scadenza nei prossimi 30 giorni
            </span>
          )}
          . Controlla la lista avvisi.
        </div>
        <span className="text-xs underline underline-offset-2">Apri</span>
      </div>
    </Link>
  );
}
