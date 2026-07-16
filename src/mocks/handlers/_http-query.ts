import { http } from "msw"

/**
 * Helper para mockear el método QUERY (RFC 10008) en MSW v2.
 *
 * MSW no expone `http.query` nativamente — `http.all` matchea cualquier
 * verb, así que filtramos por método adentro del resolver. Si llega un
 * method distinto a QUERY devolvemos `undefined` para que MSW haga
 * passthrough (siguiente handler o warning de "unhandled").
 */
export function httpQuery(...args: Parameters<typeof http.all>) {
  const [predicate, resolver, options] = args
  return http.all(predicate, async (info) => {
    if (info.request.method !== "QUERY") return undefined
    return resolver(info)
  }, options)
}