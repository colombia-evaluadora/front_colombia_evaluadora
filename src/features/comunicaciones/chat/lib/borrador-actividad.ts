import type { AxiosRequestConfig } from "axios"

import type {
  CategoriaCanal,
  TipoBorradorActividad,
  TipoPregunta,
} from "@/features/comunicaciones/chat/api/types"
import { nuevaClave, type PreguntaLocal } from "@/features/comunicaciones/chat/lib/preguntas"

// Borradores de actividades: el estado de los diálogos de creación se guarda
// tal cual (JSON) en comms-service y se retoma desde "Borradores y enviados".

export const ETIQUETA_TIPO_BORRADOR: Record<TipoBorradorActividad, string> = {
  COMUNICADO: "Comunicado",
  ENCUESTA: "Encuesta",
  ELECCION: "Elección",
  EVALUACION: "Evaluación",
}

export const CATEGORIA_TIPO_BORRADOR: Record<TipoBorradorActividad, CategoriaCanal> = {
  COMUNICADO: "ANUNCIO",
  ENCUESTA: "ENCUESTA",
  ELECCION: "VOTACION",
  EVALUACION: "EXAMEN",
}

// Mismo tope que comms-service (bytes del JSON).
export const MAX_DATOS_BORRADOR = 3_000_000
export const MAX_TITULO_BORRADOR = 150
export const AUTOGUARDADO_MS = 1_500

/** `?borrador=<id>`: al publicar, comms-service elimina el borrador del que salió. */
export function conBorrador(borradorId: number | null | undefined): AxiosRequestConfig | undefined {
  return borradorId ? { params: { borrador: borradorId } } : undefined
}

export function bytesDatos(datos: unknown): number {
  return new TextEncoder().encode(JSON.stringify(datos ?? {})).length
}

/** Título que se lista en Borradores: el escrito o "Sin título". */
export function tituloBorrador(titulo: string | null | undefined): string {
  const t = (titulo ?? "").trim()
  return t ? t.slice(0, MAX_TITULO_BORRADOR) : "Sin título"
}

/** Hay algo que valga la pena guardar: algún texto no vacío o una lista con elementos. */
export function hayContenido(...valores: unknown[]): boolean {
  return valores.some((v) => {
    if (typeof v === "string") return v.trim().length > 0
    if (Array.isArray(v)) return v.length > 0
    if (v instanceof Set) return v.size > 0
    return false
  })
}

/**
 * Valores del borrador sobre una base: solo se toman las claves que existen en la base y con el
 * mismo tipo (un borrador viejo o alterado no rompe el formulario). `null` vale donde la base
 * admite null.
 */
export function datosDe<T extends Record<string, unknown>>(
  datos: Record<string, unknown> | null | undefined,
  base: T,
): T {
  if (!datos || typeof datos !== "object") return base
  const out: Record<string, unknown> = { ...base }
  for (const [k, v0] of Object.entries(base)) {
    const v = datos[k]
    if (v === undefined) continue
    if (v === null) {
      if (v0 === null) out[k] = null
      continue
    }
    if (
      v0 === null
        ? typeof v === "string"
        : typeof v === typeof v0 && Array.isArray(v) === Array.isArray(v0)
    ) {
      out[k] = v
    }
  }
  return out as T
}

const TIPOS_PREGUNTA: TipoPregunta[] = ["MULTIPLE", "UNICA", "REDACCION", "SI_NO"]

/** Preguntas guardadas (sin claves) → preguntas del editor con claves nuevas. */
export function revivirPreguntas(raw: unknown): PreguntaLocal[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((p) => {
    if (!p || typeof p !== "object") return []
    const q = p as Record<string, unknown>
    const tipo = TIPOS_PREGUNTA.find((t) => t === q.tipo)
    if (!tipo) return []
    const opciones = Array.isArray(q.opciones)
      ? q.opciones.flatMap((o) => {
          if (!o || typeof o !== "object") return []
          const x = o as Record<string, unknown>
          return [
            { clave: nuevaClave(), texto: String(x.texto ?? ""), correcta: x.correcta === true },
          ]
        })
      : []
    return [
      {
        clave: nuevaClave(),
        tipo,
        texto: String(q.texto ?? ""),
        opciones,
        puntos: String(q.puntos ?? ""),
      },
    ]
  })
}

/** Preguntas del editor → forma guardable (las claves se regeneran al retomar). */
export function preguntasGuardables(preguntas: PreguntaLocal[]) {
  return preguntas.map((p) => ({
    tipo: p.tipo,
    texto: p.texto,
    puntos: p.puntos,
    opciones: p.opciones.map((o) => ({ texto: o.texto, correcta: o.correcta })),
  }))
}

/** Ids de personas guardados (participantes o votantes). */
export function idsDe(raw: unknown): Set<number> {
  return new Set(Array.isArray(raw) ? raw.filter((x): x is number => typeof x === "number") : [])
}

interface CandidatoGuardado {
  nombre: string
  numero: string
  lema: string
  fotoUrl: string | null
}

/** Candidatos de la elección → forma guardable (solo fotos en data URL o ya publicadas). */
export function candidatosGuardables(
  candidatos: Array<{ nombre: string; numero: string; lema: string; fotoUrl?: string | null }>,
): CandidatoGuardado[] {
  return candidatos.map((c) => ({
    nombre: c.nombre,
    numero: c.numero,
    lema: c.lema,
    fotoUrl: c.fotoUrl ?? null,
  }))
}

export function revivirCandidatos(raw: unknown): CandidatoGuardado[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((c) => {
    if (!c || typeof c !== "object") return []
    const x = c as Record<string, unknown>
    if (typeof x.nombre !== "string" || typeof x.numero !== "string") return []
    return [
      {
        nombre: x.nombre,
        numero: x.numero,
        lema: typeof x.lema === "string" ? x.lema : "",
        fotoUrl: typeof x.fotoUrl === "string" ? x.fotoUrl : null,
      },
    ]
  })
}
