/**
 * Política de comunicación con menores (PLAN-comunicaciones §6 y pregunta
 * abierta 3/4). **Es una decisión pendiente del usuario**: nada de esto está
 * aprobado, por eso NO se hardcodea en los componentes. La política la entrega
 * el backend por institución (`GET /comunicaciones/politica`, hoy solo MSW) y
 * el front solo la consulta con `reglaDirecto` / `puedeMencionarMasivo`.
 *
 * `POLITICA_CHAT_SUGERIDA` es la "matriz por defecto sugerida" del plan; el
 * mock la sirve tal cual y se puede cambiar en `src/mocks/db/comunicaciones.ts`
 * (`politicaChat`) para probar otras combinaciones. El backend real debe
 * aplicar la misma regla (403 en DMs prohibidos; `@todos` sin permiso se
 * guarda como texto y no notifica): el front solo oculta la acción.
 */

export type PerfilChat = "DIRECTIVO" | "DOCENTE" | "ACUDIENTE" | "ESTUDIANTE"

/**
 * - `PERMITIDO`: DM normal.
 * - `CON_COPIA`: DM visible para coordinación (moderación).
 * - `PROHIBIDO`: la acción no aparece y el backend responde 403.
 */
export type ReglaDirecto = "PERMITIDO" | "CON_COPIA" | "PROHIBIDO"

export interface PoliticaForos {
  publicar: PerfilChat[]
  responder: PerfilChat[]
  moderar: PerfilChat[]
}

export interface PoliticaChat {
  /** `directos[origen][destino]`: quién puede abrir un DM con quién. */
  directos: Record<PerfilChat, Record<PerfilChat, ReglaDirecto>>
  /** Perfiles que pueden usar `@canal` / `@todos` y notificar a todo el canal. */
  mencionesMasivas: PerfilChat[]
  /**
   * Foros: perfiles que abren publicaciones, que responden y que moderan (además
   * del administrador del canal). Opcional: un backend sin foros no lo manda.
   */
  foros?: PoliticaForos
  /** `true` mientras la institución no haya confirmado la política. */
  pendienteDeAprobacion: boolean
}

const todos = (regla: ReglaDirecto): Record<PerfilChat, ReglaDirecto> => ({
  DIRECTIVO: regla,
  DOCENTE: regla,
  ACUDIENTE: regla,
  ESTUDIANTE: regla,
})

/** Matriz sugerida por el plan (§6), sin aprobar. */
export const POLITICA_CHAT_SUGERIDA: PoliticaChat = {
  directos: {
    DIRECTIVO: { ...todos("PERMITIDO"), ESTUDIANTE: "CON_COPIA" },
    DOCENTE: { ...todos("PERMITIDO"), ESTUDIANTE: "PROHIBIDO" },
    ACUDIENTE: { ...todos("PERMITIDO"), ACUDIENTE: "PROHIBIDO", ESTUDIANTE: "PROHIBIDO" },
    ESTUDIANTE: todos("PROHIBIDO"),
  },
  mencionesMasivas: ["DIRECTIVO", "DOCENTE"],
  // Mismos defaults que comms-service (`comms.politica.foros`): todos participan y modera dirección.
  foros: {
    publicar: ["DIRECTIVO", "DOCENTE", "ACUDIENTE", "ESTUDIANTE"],
    responder: ["DIRECTIVO", "DOCENTE", "ACUDIENTE", "ESTUDIANTE"],
    moderar: ["DIRECTIVO"],
  },
  pendienteDeAprobacion: true,
}

/** Mientras la política no cargó, todo denegado (como `useMenuPermission`). */
export const POLITICA_CHAT_DENEGADA: PoliticaChat = {
  directos: {
    DIRECTIVO: todos("PROHIBIDO"),
    DOCENTE: todos("PROHIBIDO"),
    ACUDIENTE: todos("PROHIBIDO"),
    ESTUDIANTE: todos("PROHIBIDO"),
  },
  mencionesMasivas: [],
  pendienteDeAprobacion: true,
}

const ROLES_DIRECTIVOS = [
  "CEVAL-RECTOR",
  "CEVAL-COORDINADOR",
  "CEVAL-SUPER_ADMINISTRADOR",
  "CEVAL-JEFE_SISTEMA_ESTABLECIMIENTO",
]

/** Perfil de chat a partir de los roles del token (el más privilegiado gana). */
export function perfilDeRoles(roles: readonly string[]): PerfilChat {
  if (roles.some((r) => ROLES_DIRECTIVOS.includes(r))) return "DIRECTIVO"
  if (roles.some((r) => r.includes("DOCENTE") || r.includes("DIRECTOR_GRUPO"))) return "DOCENTE"
  if (roles.some((r) => r.includes("ACUDIENTE"))) return "ACUDIENTE"
  if (roles.includes("CEVAL-ESTUDIANTE")) return "ESTUDIANTE"
  // Funcionarios administrativos y roles sin mapear se tratan como docentes.
  return "DOCENTE"
}

export function reglaDirecto(politica: PoliticaChat, de: PerfilChat, a: PerfilChat): ReglaDirecto {
  return politica.directos[de]?.[a] ?? "PROHIBIDO"
}

export function puedeMencionarMasivo(politica: PoliticaChat, perfil: PerfilChat) {
  return politica.mencionesMasivas.includes(perfil)
}
