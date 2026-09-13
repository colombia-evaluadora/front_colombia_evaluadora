import { env } from "@/config/env"

/**
 * Resuelve la ruta a usar según el modo de la app: el mock (MSW) sigue
 * intercediendo las rutas "históricas" en inglés que ya tienen handlers y
 * tests escritos contra ellas; el backend real de la SSO registra sus
 * endpoints en español (`/establecimientos`, `/establecimientos/sedes`,
 * etc. — confirmado contra la tabla `query`). Reescribir todos los
 * handlers de MSW para que coincidan letra por letra con el backend real
 * es un cambio mucho más grande y riesgoso (rompe rutas que ya usan los
 * tests) que no aporta nada funcional: lo único que de verdad necesita
 * coincidir con el backend real es la ruta que se usa *cuando no se está
 * mockeando*. Por eso esta función, no un renombre masivo de mocks.
 *
 * `/eval-col` es el prefijo con el que el gateway del SSO enruta hacia el
 * motor de queries (microservice `eval-col`, `requesturi: /api/eval-col/**`
 * — confirmado contra la tabla `microservice`); TODO endpoint que resuelve
 * en la tabla `query` necesita ese prefijo en la URL real que sale del
 * front, aunque el `path_template` registrado ahí NO lo incluya (el gateway
 * lo saca antes de matchear contra `path_template`). Los endpoints que no
 * pasan por ese motor — como `/register/cval/funcionario`, servido directo por
 * `auth-center` — no lo llevan, así que no lo pongas a mano en un
 * `realPath`; queda centralizado acá.
 *
 * `/eval-col` no es el único prefijo posible: cada instancia del motor de
 * queries se registra con su propio `requesturi`. La auditoría corre en una
 * instancia aparte —`audit-clickhouse`, `requesturi: /api/audit-ch/**`
 * (V84), de SOLO LECTURA sobre ClickHouse— así que sus endpoints llevan
 * `/audit-ch`. De ahí el tercer parámetro; el default sigue siendo
 * `/eval-col` para no tocar los call sites que ya existen.
 *
 * @param mockPath Ruta que ya intercepta el handler de MSW.
 * @param realPath Ruta tal como está registrada en la tabla `query` del SSO,
 *   SIN el prefijo del microservicio (esta función lo agrega).
 * @param prefix Prefijo con el que el gateway rutea hacia la instancia que
 *   sirve ese endpoint. Ver `public.microservice.requesturi`.
 */
export function apiPath(mockPath: string, realPath: string, prefix = "/eval-col"): string {
  return env.ENABLE_API_MOCKING ? mockPath : `${prefix}${realPath}`
}

/** Prefijo de la instancia query-service dedicada a auditoría (V84). */
export const AUDIT_API_PREFIX = "/audit-ch"
