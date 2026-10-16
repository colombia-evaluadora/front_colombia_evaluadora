/**
 * Menciones estilo Discord.
 *
 * En el texto guardado una mención a persona es un token `<@id>` (estable si
 * la persona cambia de nombre); `@canal` y `@todos` van literales. El
 * compositor muestra `@Nombre` y codifica al enviar; para editar se decodifica.
 * El servidor decide qué menciones valen (permisos de `@todos`) y las devuelve
 * en `Mensaje.menciones`; solo esas se resaltan.
 */
import type { Mencion, TipoMencion } from "@/features/comunicaciones/chat/api/types"

export const MENCIONES_MASIVAS: { tipo: Exclude<TipoMencion, "USUARIO">; nombre: string; ayuda: string }[] = [
  { tipo: "CANAL", nombre: "canal", ayuda: "Notifica a los miembros conectados" },
  { tipo: "TODOS", nombre: "todos", ayuda: "Notifica a todos los miembros" },
]

const TOKEN_USUARIO = /<@(\d+)>/g
const MASIVA = /(^|[^\p{L}\d_])@(canal|todos)(?![\p{L}\d_])/giu

export interface Mencionable {
  id: number
  nombre: string
}

function normalizar(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
}

/** `@consulta` que se está escribiendo justo antes del cursor, si la hay. */
export function consultaMencion(texto: string, cursor: number): { inicio: number; consulta: string } | null {
  const antes = texto.slice(0, cursor)
  const m = /(^|\s)@([\p{L}\d_]{0,30})$/u.exec(antes)
  if (!m) return null
  return { inicio: cursor - m[2].length - 1, consulta: m[2] }
}

export type Sugerencia =
  | { tipo: "USUARIO"; id: number; nombre: string; detalle?: string }
  | { tipo: "CANAL" | "TODOS"; nombre: string; detalle: string }

/** Coincide con el inicio de cualquier palabra del nombre, sin tildes. */
export function sugerenciasMencion(
  consulta: string,
  miembros: readonly (Mencionable & { rol?: string })[],
  permitirMasivas: boolean,
  max = 8,
): Sugerencia[] {
  const q = normalizar(consulta)
  const coincide = (nombre: string) => !q || normalizar(nombre).split(/\s+/).some((p) => p.startsWith(q))
  const masivas: Sugerencia[] = permitirMasivas
    ? MENCIONES_MASIVAS.filter((x) => coincide(x.nombre)).map((x) => ({
        tipo: x.tipo,
        nombre: x.nombre,
        detalle: x.ayuda,
      }))
    : []
  const personas: Sugerencia[] = miembros
    .filter((m) => coincide(m.nombre))
    .slice(0, max)
    .map((m) => ({ tipo: "USUARIO", id: m.id, nombre: m.nombre, detalle: m.rol }))
  return [...personas, ...masivas].slice(0, max)
}

/** `@Nombre Completo` → `<@id>` para las personas elegidas en el autocompletado. */
export function codificarMenciones(texto: string, elegidos: readonly Mencionable[]): string {
  const unicos = [...new Map(elegidos.map((e) => [e.id, e])).values()]
  // Los nombres largos primero: "Ana María" no debe partir "Ana María Ríos".
  unicos.sort((a, b) => b.nombre.length - a.nombre.length)
  let out = texto
  for (const e of unicos) out = out.split(`@${e.nombre}`).join(`<@${e.id}>`)
  return out
}

/** `<@id>` → `@Nombre` (para editar un mensaje propio). */
export function decodificarMenciones(texto: string, menciones: readonly Mencion[] = []): string {
  return texto.replace(TOKEN_USUARIO, (token, id: string) => {
    const m = menciones.find((x) => x.tipo === "USUARIO" && x.usuarioId === Number(id))
    return m ? `@${m.nombre}` : token
  })
}

/** Personas ya presentes como `<@id>` (para volver a codificar al editar). */
export function mencionadosEn(texto: string, menciones: readonly Mencion[] = []): Mencionable[] {
  const ids = new Set([...texto.matchAll(TOKEN_USUARIO)].map((m) => Number(m[1])))
  return menciones
    .filter((m) => m.tipo === "USUARIO" && m.usuarioId != null && ids.has(m.usuarioId))
    .map((m) => ({ id: m.usuarioId as number, nombre: m.nombre }))
}

/**
 * Lo que haría el servidor: reconoce los `<@id>` de miembros y, solo si el
 * autor tiene permiso, `@canal`/`@todos`. Lo usa el mock.
 */
export function extraerMenciones(
  texto: string,
  miembros: readonly Mencionable[],
  permitirMasivas: boolean,
): Mencion[] {
  const out: Mencion[] = []
  for (const [, id] of texto.matchAll(TOKEN_USUARIO)) {
    const m = miembros.find((x) => x.id === Number(id))
    if (m && !out.some((x) => x.usuarioId === m.id)) {
      out.push({ tipo: "USUARIO", usuarioId: m.id, nombre: m.nombre })
    }
  }
  if (permitirMasivas) {
    for (const [, , nombre] of texto.matchAll(MASIVA)) {
      const tipo: TipoMencion = nombre.toLowerCase() === "canal" ? "CANAL" : "TODOS"
      if (!out.some((x) => x.tipo === tipo)) out.push({ tipo, usuarioId: null, nombre: nombre.toLowerCase() })
    }
  }
  return out
}

export type PiezaMencion = { tipo: "texto"; valor: string } | { tipo: "mencion"; mencion: Mencion }

/** Parte un texto en trozos y menciones válidas (las no reconocidas quedan como texto). */
export function segmentarMenciones(texto: string, menciones: readonly Mencion[] = []): PiezaMencion[] {
  if (!menciones.length) return [{ tipo: "texto", valor: texto }]
  const out: PiezaMencion[] = []
  const re = /<@(\d+)>|(^|[^\p{L}\d_])@(canal|todos)(?![\p{L}\d_])/giu
  let ultimo = 0
  for (const m of texto.matchAll(re)) {
    const idx = m.index ?? 0
    let mencion: Mencion | undefined
    let inicio = idx
    if (m[1] != null) {
      mencion = menciones.find((x) => x.tipo === "USUARIO" && x.usuarioId === Number(m[1]))
    } else {
      const tipo = m[3].toLowerCase() === "canal" ? "CANAL" : "TODOS"
      mencion = menciones.find((x) => x.tipo === tipo)
      inicio = idx + m[2].length
    }
    if (!mencion) continue
    if (inicio > ultimo) out.push({ tipo: "texto", valor: texto.slice(ultimo, inicio) })
    out.push({ tipo: "mencion", mencion })
    ultimo = idx + m[0].length
  }
  if (ultimo < texto.length) out.push({ tipo: "texto", valor: texto.slice(ultimo) })
  return out
}

/** Texto plano para citas y notificaciones: tokens → `@Nombre`. */
export function textoPlano(texto: string, menciones: readonly Mencion[] = []): string {
  return decodificarMenciones(texto, menciones)
}
