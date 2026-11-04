import "server-only";
import { headers } from "next/headers";

/** Origem do request atual (ex.: http://localhost:3010), para links de e-mail. */
export async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) throw new Error("Não foi possível determinar o domínio do app.");
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
