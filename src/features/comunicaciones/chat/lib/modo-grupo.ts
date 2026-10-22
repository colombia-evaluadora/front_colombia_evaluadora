import type { Conversacion, ModoGrupo } from "@/features/comunicaciones/chat/api/types"
import type { OpcionesGrupo } from "@/features/comunicaciones/chat/api/mutations/use-acciones-conversacion"
import type { PerfilChat } from "@/features/comunicaciones/chat/lib/politica-chat"

/**
 * Quién escribe en un grupo (decisión de Natalia), elegido y cambiable por quien lo crea:
 * - ABIERTO: todos los miembros.
 * - SOLO_LECTURA: solo quien gestiona el grupo.
 * - MODERADO: quien gestiona y los perfiles elegidos (`rolesEscritura`).
 *
 * Misma regla que comms-service (`ChatService.puedeEscribir`): el servidor responde 403 al enviar;
 * aquí solo se deshabilita el compositor con la explicación.
 */
export const MODOS_GRUPO: { valor: ModoGrupo; etiqueta: string; ayuda: string }[] = [
  { valor: "ABIERTO", etiqueta: "Abierto", ayuda: "Todos los miembros pueden escribir." },
  { valor: "SOLO_LECTURA", etiqueta: "Solo lectura", ayuda: "Solo tú escribes; los demás leen." },
  { valor: "MODERADO", etiqueta: "Moderado", ayuda: "Tú y los perfiles que elijas pueden escribir." },
]

/** Grupo nuevo: sin descripción ni imagen y abierto. */
export const OPCIONES_GRUPO_INICIALES: OpcionesGrupo = {
  descripcion: "",
  modo: "ABIERTO",
  rolesEscritura: [],
  imagen: undefined,
}

export const PERFILES_ESCRITURA: { valor: PerfilChat; etiqueta: string }[] = [
  { valor: "DIRECTIVO", etiqueta: "Directivos" },
  { valor: "DOCENTE", etiqueta: "Docentes" },
  { valor: "ACUDIENTE", etiqueta: "Acudientes" },
  { valor: "ESTUDIANTE", etiqueta: "Estudiantes" },
]

const PLURAL = Object.fromEntries(PERFILES_ESCRITURA.map((p) => [p.valor, p.etiqueta])) as Record<PerfilChat, string>

/** "Docentes y Acudientes" / "Directivos, Docentes y Estudiantes". */
export function listaPerfiles(perfiles: readonly PerfilChat[]): string {
  const nombres = PERFILES_ESCRITURA.filter((p) => perfiles.includes(p.valor)).map((p) => PLURAL[p.valor])
  if (nombres.length <= 1) return nombres.join("")
  return `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`
}

type ConversacionModo = Pick<Conversacion, "tipo" | "modo" | "rolesEscritura" | "esAdmin">

/** El usuario puede escribir en la conversación según el modo del grupo (otros tipos: siempre). */
export function puedeEscribir(c: ConversacionModo, perfil: PerfilChat): boolean {
  if (c.tipo !== "GRUPO" || !c.modo || c.modo === "ABIERTO" || c.esAdmin) return true
  if (c.modo === "SOLO_LECTURA") return false
  return (c.rolesEscritura ?? []).includes(perfil)
}

/** Explicación en lugar del compositor para quien no puede escribir; null si puede. */
export function motivoSinEscritura(c: ConversacionModo, perfil: PerfilChat): string | null {
  if (puedeEscribir(c, perfil)) return null
  if (c.modo === "SOLO_LECTURA") return "Este grupo es de solo lectura: solo quien lo gestiona puede escribir."
  const quienes = listaPerfiles(c.rolesEscritura ?? [])
  return quienes
    ? `En este grupo solo escriben quien lo gestiona y ${quienes}.`
    : "En este grupo solo escribe quien lo gestiona."
}

/** Resumen corto para el encabezado y el panel de información ("Solo lectura", "Moderado: Docentes"). */
export function resumenModo(c: Pick<Conversacion, "modo" | "rolesEscritura">): string | null {
  if (!c.modo || c.modo === "ABIERTO") return null
  if (c.modo === "SOLO_LECTURA") return "Solo lectura"
  const quienes = listaPerfiles(c.rolesEscritura ?? [])
  return quienes ? `Moderado: ${quienes}` : "Moderado"
}

/** Lo que se envía a comms-service (`MODO`, `ROLES_ESCRITURA`): fuera de MODERADO, sin perfiles. */
export function cuerpoModo(modo: ModoGrupo, roles: readonly PerfilChat[]) {
  return { MODO: modo, ROLES_ESCRITURA: modo === "MODERADO" ? [...roles] : [] }
}

/** Un grupo MODERADO necesita al menos un perfil (el servidor responde 400). */
export function modoValido(modo: ModoGrupo, roles: readonly PerfilChat[]): boolean {
  return modo !== "MODERADO" || roles.length > 0
}
