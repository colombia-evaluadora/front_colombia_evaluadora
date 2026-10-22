import { useQuery } from "@tanstack/react-query"

import { selectCategoryQueryOptions, type SelectCategoryRow } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { resolveCatalogId } from "@/features/establishment/academic-period/api/query/resolve-catalog-id"
import type { ActividadTipo, Adaptacion, EscalaValoracionTipo, RecursoTipo } from "@/features/planeador/api/types/actividad"
import type { MetodoCalculo } from "@/features/planeador/api/types/unidad-tematica"

// Catálogos de `TLISTA_VALOR` del planeador. Los `resolveXxxId` piden el
// catálogo justo al armar el body, así nunca mandan un pk viejo.

// ---- TIPO_ACTIVIDAD ----

const toTipoActividadCatalog = (rows: SelectCategoryRow[]): ActividadTipo[] =>
  rows.map((row) => row.nombre as ActividadTipo)

export function useTipoActividadCatalogQuery() {
  return useQuery({ ...selectCategoryQueryOptions("TIPO_ACTIVIDAD"), select: toTipoActividadCatalog })
}

export async function resolveTipoActividadId(tipo: ActividadTipo): Promise<number | undefined> {
  return resolveCatalogId(undefined, "TIPO_ACTIVIDAD", tipo)
}

// ---- MOMENTO_REGISTRO ----

const toMomentosRegistro = (rows: SelectCategoryRow[]) =>
  rows.map((row) => ({ id: row.pk_lista_valor, nombre: row.nombre }))

export function useMomentoRegistroCatalog() {
  return useQuery({ ...selectCategoryQueryOptions("MOMENTO_REGISTRO"), select: toMomentosRegistro })
}

// ---- TIPO_ADAPTACION (match por substring de `nombre`) ----

const TIPO_ADAPTACION_VALORES = [
  "Discapacidad visual",
  "Discapacidad auditiva",
  "Dificultades cognitivas",
  "Estilo de aprendizaje",
  "Modalidad",
  "Nivel de desempeño",
  "Otro",
] as const

function toTipoAdaptacion(nombre: string): Adaptacion["tipo"] | undefined {
  const lower = nombre.toLowerCase()
  return TIPO_ADAPTACION_VALORES.find((valor) => lower.includes(valor.toLowerCase()))
}

export interface TipoAdaptacionOption {
  id: number
  tipo: string
}

export function toTipoAdaptacionOptions(rows: SelectCategoryRow[]): TipoAdaptacionOption[] {
  return rows
    .map((row) => {
      const tipo = toTipoAdaptacion(row.nombre)
      return tipo ? { id: row.pk_lista_valor, tipo } : undefined
    })
    .filter((option): option is TipoAdaptacionOption => option != null)
}

export async function resolveTipoAdaptacionId(tipo: string): Promise<number | undefined> {
  return resolveCatalogId(undefined, "TIPO_ADAPTACION", tipo, { normalize: (row) => toTipoAdaptacion(row.nombre) })
}

export function useTipoAdaptacionCatalogQuery() {
  return useQuery({ ...selectCategoryQueryOptions("TIPO_ADAPTACION"), select: toTipoAdaptacionOptions })
}

// ---- APLICA_A ----

const APLICA_A_VALORES = ["A todo el grupo", "Estudiantes específicos"] as const

function toAplicaA(nombre: string): (typeof APLICA_A_VALORES)[number] | undefined {
  const lower = nombre.toLowerCase()
  if (lower.includes("todo") && lower.includes("grupo")) return "A todo el grupo"
  if (lower.includes("específic") || lower.includes("seleccionad")) return "Estudiantes específicos"
  return undefined
}

export interface AplicaAOption {
  id: number
  valor: (typeof APLICA_A_VALORES)[number]
}

export function toAplicaAOptions(rows: SelectCategoryRow[]): AplicaAOption[] {
  return rows
    .map((row) => {
      const valor = toAplicaA(row.nombre)
      return valor ? { id: row.pk_lista_valor, valor } : undefined
    })
    .filter((option): option is AplicaAOption => option != null)
}

export async function resolveAplicaAId(valor: string): Promise<number | undefined> {
  return resolveCatalogId(undefined, "APLICA_A", valor, { normalize: (row) => toAplicaA(row.nombre) })
}

// ---- TIPO_RECURSO ----

function toRecursoTipo(nombre: string): RecursoTipo | undefined {
  const lower = nombre.toLowerCase()
  if (lower.includes("url") || lower.includes("sitio web")) return "URL"
  if (lower.includes("archivo")) return "Archivo"
  if (lower.includes("virtual") || lower.includes("repositorio")) return "Unidad virtual"
  return undefined
}

export interface TipoRecursoOption {
  id: number
  tipo: RecursoTipo
}

export function toTipoRecursoOptions(rows: SelectCategoryRow[]): TipoRecursoOption[] {
  return rows
    .map((row) => {
      const tipo = toRecursoTipo(row.nombre)
      return tipo ? { id: row.pk_lista_valor, tipo } : undefined
    })
    .filter((option): option is TipoRecursoOption => option != null)
}

export async function resolveTipoRecursoId(tipo: RecursoTipo): Promise<number | undefined> {
  return resolveCatalogId(undefined, "TIPO_RECURSO", tipo, { normalize: (row) => toRecursoTipo(row.nombre) })
}

// ---- CALCULO_DEFINITIVA ----

function toMetodoCalculo(nombre: string): MetodoCalculo {
  const lower = nombre.toLowerCase()
  if (lower.includes("promediar")) return "Promedio simple"
  if (lower.includes("suma")) return "Suma de puntos"
  return "Ponderado"
}

export async function resolveCalculoDefinitivaId(metodo: MetodoCalculo): Promise<number | undefined> {
  return resolveCatalogId(undefined, "CALCULO_DEFINITIVA", metodo, { normalize: (row) => toMetodoCalculo(row.nombre) })
}

// ---- FORMATO_ADAPTACION (por `valor`; el back espera el pk, no el código) ----

const FORMATO_ADAPTACION_VALORES: Record<string, Exclude<Adaptacion["versionModificada"], "no" | "">> = {
  ARCHIVO: "archivo",
  ENLACE: "enlace",
  BIBLIOTECA: "biblioteca",
}

export async function resolveFormatoAdaptacionId(
  versionModificada: Adaptacion["versionModificada"],
): Promise<number | undefined> {
  if (versionModificada === "no" || versionModificada === "") return undefined
  return resolveCatalogId(undefined, "FORMATO_ADAPTACION", versionModificada, {
    normalize: (row) => FORMATO_ADAPTACION_VALORES[row.valor],
  })
}

// ---- TIPO_ESCALA (por `valor`: el `nombre` devolvía la opción equivocada) ----

function toEscalaTipo(valor: string): EscalaValoracionTipo | undefined {
  const upper = valor.toUpperCase()
  if (upper === "NUMERICA") return "Numérica"
  if (upper === "CUALITATIVA") return "Cualitativa"
  return undefined
}

export async function resolveTipoEscalaId(tipo: EscalaValoracionTipo): Promise<number | undefined> {
  return resolveCatalogId(undefined, "TIPO_ESCALA", tipo, { normalize: (row) => toEscalaTipo(row.valor) })
}

// ---- TIPO_EVIDENCIA_OTRO ----

const TIPO_EVIDENCIA_OTRO_VALORES = ["Archivo", "Enlace", "Observación directa", "Registro en campo"] as const

function toTipoEvidenciaOtro(nombre: string): (typeof TIPO_EVIDENCIA_OTRO_VALORES)[number] | undefined {
  const lower = nombre.toLowerCase()
  return TIPO_EVIDENCIA_OTRO_VALORES.find((valor) => lower.includes(valor.toLowerCase()))
}

export async function resolveTipoEvidenciaOtroId(tipo: string): Promise<number | undefined> {
  return resolveCatalogId(undefined, "TIPO_EVIDENCIA_OTRO", tipo, { normalize: (row) => toTipoEvidenciaOtro(row.nombre) })
}

// ---- DOMINIO_MATERIAL_* (lista blanca que también valida el back al guardar) ----

const toDominios = (rows: SelectCategoryRow[]): string[] =>
  rows.map((row) => row.valor.trim().toLowerCase()).filter(Boolean)

export function useDominioMaterialCatalog(categoria: "DOMINIO_MATERIAL_URL" | "DOMINIO_MATERIAL_REPOSITORIO") {
  return useQuery({ ...selectCategoryQueryOptions(categoria), select: toDominios })
}

/** Host exacto o subdominio, igual que `fn_actividad_validar_url_dominio`. */
export function esDominioPermitido(url: string, dominiosPermitidos: string[]): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return dominiosPermitidos.some((dominio) => host === dominio || host.endsWith(`.${dominio}`))
  } catch {
    return false
  }
}
