import type { TipoConversacion } from "@/features/comunicaciones/chat/api/types"
import type { PerfilChat } from "@/features/comunicaciones/chat/lib/politica-chat"

/**
 * Historial y filtros del chat (HU "Consultar historial" y "Filtrar mensajes por grupo, rol o
 * usuario"): palabras clave, tipo de conversación, rango de fechas, persona (nombre o documento),
 * estado del mensaje, rol y grupo académico ("Sexto 601"). Se combinan (Y; dentro de una misma
 * lista basta uno) y los resuelve comms-service (`POST /comunicaciones/buscar`) dentro de las
 * conversaciones del usuario: el front no filtra mensajes, solo arma la consulta.
 *
 * Viven en la URL (search params del chat): un filtro se comparte o se guarda como marcador del
 * navegador. No hay "favoritos" en el servidor (requieren esquema) ni se registra cada consulta.
 */
export type EstadoFiltro = "NO_LEIDO" | "LEIDO" | "EDITADO" | "ELIMINADO"

export interface FiltrosChat {
  q: string
  persona: string
  perfiles: PerfilChat[]
  grupos: number[]
  tipos: TipoConversacion[]
  // yyyy-MM-dd (días de Colombia; ambos incluidos).
  desde: string
  hasta: string
  estados: EstadoFiltro[]
}

export const FILTROS_VACIOS: FiltrosChat = {
  q: "",
  persona: "",
  perfiles: [],
  grupos: [],
  tipos: [],
  desde: "",
  hasta: "",
  estados: [],
}

/** Mínimo de letras para buscar por palabras o por persona en el servidor. */
export const MIN_LETRAS = 3

export const PERFILES_FILTRO = [
  { valor: "DIRECTIVO", etiqueta: "Directivos" },
  { valor: "DOCENTE", etiqueta: "Docentes" },
  { valor: "ACUDIENTE", etiqueta: "Acudientes" },
  { valor: "ESTUDIANTE", etiqueta: "Estudiantes" },
] as const satisfies readonly { valor: PerfilChat; etiqueta: string }[]

// En el chat los CANAL son los foros y comunicados de la institución.
export const TIPOS_FILTRO = [
  { valor: "CANAL", etiqueta: "Institucional" },
  { valor: "GRUPO", etiqueta: "Grupal" },
  { valor: "DIRECTO", etiqueta: "Individual" },
] as const satisfies readonly { valor: TipoConversacion; etiqueta: string }[]

export const ESTADOS_FILTRO = [
  { valor: "NO_LEIDO", etiqueta: "No leídos" },
  { valor: "LEIDO", etiqueta: "Leídos" },
  { valor: "EDITADO", etiqueta: "Editados" },
  { valor: "ELIMINADO", etiqueta: "Eliminados" },
] as const satisfies readonly { valor: EstadoFiltro; etiqueta: string }[]

export const VALORES_PERFIL = PERFILES_FILTRO.map((p) => p.valor)
export const VALORES_TIPO = TIPOS_FILTRO.map((t) => t.valor)
export const VALORES_ESTADO = ESTADOS_FILTRO.map((e) => e.valor)

const FECHA = /^\d{4}-\d{2}-\d{2}$/

/** Filtros que se mandan al servidor: textos recortados, los cortos fuera y listas sin repetidos. */
export function filtrosEfectivos(f: FiltrosChat): FiltrosChat {
  const q = f.q.trim()
  const persona = f.persona.trim()
  let desde = FECHA.test(f.desde) ? f.desde : ""
  let hasta = FECHA.test(f.hasta) ? f.hasta : ""
  // Un rango al revés se corrige en lugar de fallar.
  if (desde && hasta && desde > hasta) [desde, hasta] = [hasta, desde]
  return {
    q: q.length >= MIN_LETRAS ? q : "",
    persona: persona.length >= MIN_LETRAS ? persona : "",
    perfiles: [...new Set(f.perfiles)].sort(),
    grupos: [...new Set(f.grupos)].sort((a, b) => a - b),
    tipos: [...new Set(f.tipos)].sort(),
    desde,
    hasta,
    estados: [...new Set(f.estados)].sort(),
  }
}

/** Filtros por quién escribe (persona, rol o grupo): la lista se recorta por sus miembros. */
export function hayFiltrosDeAutor(f: FiltrosChat) {
  const e = filtrosEfectivos(f)
  return e.persona !== "" || e.perfiles.length > 0 || e.grupos.length > 0
}

export function hayFiltros(f: FiltrosChat) {
  const e = filtrosEfectivos(f)
  return (
    e.q !== "" ||
    hayFiltrosDeAutor(e) ||
    e.tipos.length > 0 ||
    e.desde !== "" ||
    e.hasta !== "" ||
    e.estados.length > 0
  )
}

/** Filtros del panel (sin las palabras del buscador): el contador del botón. */
export function contarFiltrosAvanzados(f: FiltrosChat) {
  const e = filtrosEfectivos(f)
  return (
    (e.persona ? 1 : 0) +
    e.perfiles.length +
    e.grupos.length +
    e.tipos.length +
    (e.desde || e.hasta ? 1 : 0) +
    e.estados.length
  )
}

/** Cuerpo de `POST /comunicaciones/buscar` (UPPER_SNAKE, sin claves vacías). */
export function cuerpoBusqueda(f: FiltrosChat, antes?: number | null) {
  const e = filtrosEfectivos(f)
  return {
    ...(e.q && { Q: e.q }),
    ...(e.persona && { PERSONA: e.persona }),
    ...(e.perfiles.length > 0 && { PERFILES: e.perfiles }),
    ...(e.grupos.length > 0 && { GRUPOS: e.grupos }),
    ...(e.tipos.length > 0 && { TIPOS: e.tipos }),
    ...(e.desde && { DESDE: e.desde }),
    ...(e.hasta && { HASTA: e.hasta }),
    ...(e.estados.length > 0 && { ESTADOS: e.estados }),
    ...(antes != null && { ANTES: antes }),
  }
}

// "2026-03-05" → "5/3/2026" (sin pasar por Date: no hay corrimiento de zona horaria).
function fechaCorta(v: string) {
  const [a, m, d] = v.split("-")
  return `${Number(d)}/${Number(m)}/${a}`
}

/** Resumen legible del panel ("Grupal · Docentes · Sexto 601 · Desde 1/3/2026"). */
export function describirFiltros(f: FiltrosChat, nombreGrupo: (id: number) => string | undefined = () => undefined) {
  const e = filtrosEfectivos(f)
  const etiqueta = <T extends string>(lista: readonly { valor: T; etiqueta: string }[], v: T) =>
    lista.find((x) => x.valor === v)?.etiqueta ?? v
  const rango =
    e.desde && e.hasta
      ? e.desde === e.hasta
        ? fechaCorta(e.desde)
        : `${fechaCorta(e.desde)} a ${fechaCorta(e.hasta)}`
      : e.desde
        ? `Desde ${fechaCorta(e.desde)}`
        : e.hasta
          ? `Hasta ${fechaCorta(e.hasta)}`
          : ""
  return [
    ...e.tipos.map((t) => etiqueta(TIPOS_FILTRO, t)),
    ...e.perfiles.map((p) => etiqueta(PERFILES_FILTRO, p)),
    ...e.grupos.map((g) => nombreGrupo(g) ?? `Grupo ${g}`),
    ...(e.persona ? [`Persona: ${e.persona}`] : []),
    ...(rango ? [rango] : []),
    ...e.estados.map((s) => etiqueta(ESTADOS_FILTRO, s)),
  ].join(" · ")
}

/** Search params del chat ↔ filtros (listas vacías y textos vacíos fuera de la URL). */
export interface FiltrosUrl {
  q?: string
  persona?: string
  roles?: PerfilChat[]
  grupos?: number[]
  tipos?: TipoConversacion[]
  desde?: string
  hasta?: string
  estados?: EstadoFiltro[]
}

export function filtrosDeUrl(s: FiltrosUrl): FiltrosChat {
  return {
    q: s.q ?? "",
    persona: s.persona ?? "",
    perfiles: s.roles ?? [],
    grupos: s.grupos ?? [],
    tipos: s.tipos ?? [],
    desde: s.desde ?? "",
    hasta: s.hasta ?? "",
    estados: s.estados ?? [],
  }
}

// Cada clave presente (aunque sea undefined) para que al aplicarlo se borren las que se quitaron.
export function filtrosAUrl(f: FiltrosChat): FiltrosUrl {
  const lista = <T>(l: T[]) => (l.length > 0 ? l : undefined)
  return {
    q: f.q || undefined,
    persona: f.persona || undefined,
    roles: lista(f.perfiles),
    grupos: lista(f.grupos),
    tipos: lista(f.tipos),
    desde: f.desde || undefined,
    hasta: f.hasta || undefined,
    estados: lista(f.estados),
  }
}

const sinMarcas = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()

/**
 * Tramos del texto con cada palabra buscada resaltada, sin distinguir mayúsculas ni tildes (como el
 * servidor). Quitar las marcas tras NFD conserva la longitud de cada letra latina, así que los
 * índices del texto normalizado sirven para el original (si no, se muestra sin resaltar).
 */
export function resaltarPalabras(texto: string, termino: string) {
  const palabras = sinMarcas(termino).trim().split(/\s+/).filter(Boolean)
  const base = sinMarcas(texto)
  if (palabras.length === 0 || base.length !== texto.length) return [{ texto, coincide: false }]
  const marca = new Array<boolean>(texto.length).fill(false)
  for (const p of palabras) {
    for (let i = base.indexOf(p); i >= 0; i = base.indexOf(p, i + p.length)) marca.fill(true, i, i + p.length)
  }
  const tramos: { texto: string; coincide: boolean }[] = []
  for (let i = 0; i < texto.length; i++) {
    const ultimo = tramos.at(-1)
    if (ultimo && ultimo.coincide === marca[i]) ultimo.texto += texto[i]
    else tramos.push({ texto: texto[i], coincide: marca[i] })
  }
  return tramos
}
