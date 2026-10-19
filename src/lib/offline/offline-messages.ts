/**
 * Textos de "sin conexión" que comparten las pantallas, las tablas, los
 * selects y el cliente HTTP (auditoría de cargas infinitas offline,
 * `docs/offline/AUDITORIA-RUTAS.md`). Viven en un módulo sin dependencias
 * para que `api-client`, `components/ui` y `lib/offline` los usen sin ciclos.
 */

/** Una lectura sin red y sin copia guardada en el equipo. */
export const OFFLINE_NO_DATA_MESSAGE = "Sin conexión: esta información no está guardada en este equipo."

/** Qué hacer para tenerla la próxima vez (solo se puede con red). */
export const OFFLINE_PREPARE_HINT =
  "Cuando tengas conexión, usa «Preparar sin conexión» para guardarla en este equipo."

/** Mensaje completo de una lectura sin datos guardados. */
export const OFFLINE_NO_DATA_FULL_MESSAGE = `${OFFLINE_NO_DATA_MESSAGE} ${OFFLINE_PREPARE_HINT}`

/** Una escritura que no pasa por la outbox (acción solo en línea). */
export const OFFLINE_WRITE_MESSAGE =
  "Sin conexión: esta acción necesita internet. Inténtalo de nuevo cuando vuelva la conexión."

/** Opciones de un select/combobox que no se guardaron en el equipo. */
export const OFFLINE_NO_OPTIONS_MESSAGE = "Sin conexión: estas opciones no están guardadas en este equipo."

/**
 * Banner global: la pantalla abierta tiene al menos una consulta sin datos
 * guardados (red de seguridad para las vistas que no pintan su propio aviso).
 */
export const OFFLINE_MISSING_DATA_BANNER =
  "Parte de esta pantalla no está guardada en este equipo. Cuando tengas conexión, usa «Preparar sin conexión»."

/** El guard de sesión no pudo llegar al servidor y no hay sesión guardada. */
export const OFFLINE_SESSION_TITLE = "Sin conexión"
export const OFFLINE_SESSION_MESSAGE =
  "No pudimos verificar tu sesión porque no hay internet. Para trabajar sin conexión en este equipo, inicia sesión una vez con internet y usa «Preparar sin conexión»."

/** Red caída pero el equipo todavía no se declaró sin conexión (degradado). */
export const NETWORK_ERROR_MESSAGE = "No pudimos comunicarnos con el servidor. Revisa tu conexión e intenta de nuevo."
