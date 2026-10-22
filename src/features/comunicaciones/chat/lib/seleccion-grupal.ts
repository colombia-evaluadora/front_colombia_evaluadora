import type { OpcionSeleccion, Persona } from "@/features/comunicaciones/chat/api/types"

/**
 * Alta masiva en un grupo (decisión de Natalia): además de buscar personas una por una, se eligen
 * grados, grupos académicos o cargos y comms-service resuelve sus miembros en el servidor (solo
 * de los establecimientos de quien agrega, sin duplicados y sin acudientes, que irán por
 * invitación). Antes de agregar se confirma con el conteo ("Se agregarán 32 personas").
 */
export interface SeleccionGrupal {
  grados: OpcionSeleccion[]
  grupos: OpcionSeleccion[]
  roles: OpcionSeleccion[]
}

export const SELECCION_VACIA: SeleccionGrupal = { grados: [], grupos: [], roles: [] }

/** Cuerpo de `/grupos/seleccion/resolver`, `/miembros/masivo` y de crear un grupo (UPPER_SNAKE). */
export interface CuerpoSeleccion {
  GRADOS: string[]
  GRUPOS: number[]
  ROLES: string[]
  USUARIOS: number[]
}

export function haySeleccionGrupal(s: SeleccionGrupal): boolean {
  return s.grados.length + s.grupos.length + s.roles.length > 0
}

/** Grados por nombre, grupos por pk_tgrupo (número) y cargos por nombre; personas por id, sin repetir. */
export function aCuerpoSeleccion(s: SeleccionGrupal, personas: readonly Pick<Persona, "id">[] = []): CuerpoSeleccion {
  return {
    GRADOS: [...new Set(s.grados.map((o) => o.valor))],
    GRUPOS: [...new Set(s.grupos.map((o) => Number(o.valor)).filter((n) => Number.isFinite(n)))],
    ROLES: [...new Set(s.roles.map((o) => o.valor))],
    USUARIOS: [...new Set(personas.map((p) => p.id))],
  }
}

/** "Se agregarán 32 personas" / "Se agregará 1 persona" / nadie nuevo. */
export function textoConfirmacion(total: number): string {
  if (total <= 0) return "No hay personas nuevas para agregar."
  return total === 1 ? "Se agregará 1 persona." : `Se agregarán ${total} personas.`
}

/** Aviso de las elegidas que ya estaban (no se duplican). */
export function textoYaEnElGrupo(n: number): string | null {
  if (n <= 0) return null
  return n === 1 ? "1 persona ya está en el grupo." : `${n} personas ya están en el grupo.`
}

/** Etiqueta de una opción en el selector: el grupo lleva la sede si viene. */
export function etiquetaOpcion(o: OpcionSeleccion): string {
  return o.detalle ? `${o.etiqueta} · ${o.detalle}` : o.etiqueta
}

/** Resumen de lo elegido para el diálogo de confirmación ("Grado Sexto, Rol Docente"). */
export function resumenSeleccion(s: SeleccionGrupal, personas = 0): string {
  const partes = [
    ...s.grados.map((o) => `grado ${o.etiqueta}`),
    ...s.grupos.map((o) => `grupo ${etiquetaOpcion(o)}`),
    ...s.roles.map((o) => `rol ${o.etiqueta}`),
  ]
  if (personas > 0) partes.push(personas === 1 ? "1 persona elegida" : `${personas} personas elegidas`)
  const texto = partes.join(", ")
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
