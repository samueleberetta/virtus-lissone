"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { FOUNDED_YEAR } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Credenziali non valide. Verifica email e password.");
      setLoading(false);
      return;
    }

    router.push(nextUrl);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-virtus-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-virtus-red border-4 border-virtus-yellow mb-3">
            <span className="text-virtus-yellow font-bold text-lg">VL</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Virtus Lissone</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Polisportiva · Fondata nel {FOUNDED_YEAR} · Affiliata CSI
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-6 border-t-4 border-virtus-yellow">
          <h2 className="text-lg font-semibold text-neutral-900 mb-1">
            Accedi al gestionale
          </h2>
          <p className="text-sm text-neutral-500 mb-5">
            Inserisci le tue credenziali per continuare.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" required>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@virtuslissone.it"
              />
            </div>

            <div>
              <Label htmlFor="password" required>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-sm text-virtus-red bg-red-50 border border-red-200 rounded p-2">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Accesso in corso..." : "Accedi"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-500 mt-6">
          <Link href="/privacy" className="hover:text-neutral-300">
            Privacy policy
          </Link>
        </p>
      </div>
    </div>
  );
}
