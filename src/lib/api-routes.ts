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
 * @param mockPath Ruta que ya intercepta el handler de MSW.
 * @param realPath Ruta tal como está registrada en la tabla `query` del SSO.
 */
export function apiPath(mockPath: string, realPath: string): string {
  return env.ENABLE_API_MOCKING ? mockPath : realPath
}
