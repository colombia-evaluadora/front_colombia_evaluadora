import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import type { CasoDetalle, OpcionRazon } from "@/features/gestion-estudiantil/reintegracion/api/types"

export const OTRA_RAZON_MAX = 300
export const MOTIVO_APERTURA_MAX = 1000
export const OBSERVACIONES_MAX = 3000

/** Razones del abandono tal como las edita un formulario. */
export interface RazonesForm {
  /** pk de las razones marcadas (incluida «Otra razón»). */
  marcadas: number[]
  otraRazon: string
  /** pk de la causa principal, o vacío. */
  causa: string
}

export const RAZONES_VACIAS: RazonesForm = { marcadas: [], otraRazon: "", causa: "" }

export interface GrupoRazones {
  dimension_valor: string
  dimension_nombre: string
  razones: OpcionRazon[]
}

/** Agrupa por dimensión conservando el orden del Anexo A con que llegan. */
export function agruparRazones(opciones: OpcionRazon[]): GrupoRazones[] {
  const grupos = new Map<string, GrupoRazones>()
  for (const o of opciones) {
    const g = grupos.get(o.dimension_valor) ?? {
      dimension_valor: o.dimension_valor,
      dimension_nombre: o.dimension_nombre,
      razones: [],
    }
    g.razones.push(o)
    grupos.set(o.dimension_valor, g)
  }
  return [...grupos.values()]
}

/** Alterna una razón; al desmarcarla, la causa principal y el texto de «Otra razón» se limpian si dependían de ella. */
export function alternarRazon(f: RazonesForm, opciones: OpcionRazon[], id: number, marcada: boolean): RazonesForm {
  const marcadas = marcada ? [...f.marcadas, id] : f.marcadas.filter((x) => x !== id)
  const esOtra = opciones.find((o) => o.fk_tlv_razon === id)?.es_otra
  return {
    marcadas,
    otraRazon: !marcada && esOtra ? "" : f.otraRazon,
    causa: !marcada && f.causa === String(id) ? "" : f.causa,
  }
}

/** Opciones de Causa principal: solo las razones marcadas. */
export function opcionesCausa(f: RazonesForm, opciones: OpcionRazon[]): Opcion[] {
  return opciones
    .filter((o) => f.marcadas.includes(o.fk_tlv_razon))
    .map((o) => ({ value: String(o.fk_tlv_razon), label: o.nombre }))
}

export function hayOtraMarcada(f: RazonesForm, opciones: OpcionRazon[]): boolean {
  return opciones.some((o) => o.es_otra && f.marcadas.includes(o.fk_tlv_razon))
}

/** Error de «Otra razón»: obligatoria si se marcó (máximo 300). */
export function errorOtraRazon(f: RazonesForm, opciones: OpcionRazon[]): string | undefined {
  if (!hayOtraMarcada(f, opciones)) return undefined
  const n = f.otraRazon.trim().length
  if (n === 0) return "La otra razón es obligatoria si se marca «Otra razón»."
  if (n > OTRA_RAZON_MAX) return `La otra razón admite máximo ${OTRA_RAZON_MAX} caracteres.`
  return undefined
}

/** Campos de razones que viajan al backend (vacíos si no se marcó ninguna). */
export function razonesParaBackend(f: RazonesForm, opciones: OpcionRazon[]) {
  if (f.marcadas.length === 0) return {}
  return {
    RAZONES: f.marcadas,
    OTRA_RAZON: hayOtraMarcada(f, opciones) ? f.otraRazon.trim() : null,
    FK_CAUSA_PRINCIPAL: f.causa ? Number(f.causa) : null,
  }
}

/** Razones marcadas del caso, como las edita un formulario. */
export const razonesDeCaso = (c: CasoDetalle): RazonesForm => ({
  marcadas: c.razones.flatMap((g) => g.razones.map((r) => r.id)),
  otraRazon: c.otra_razon ?? "",
  causa: c.causa_principal ? String(c.causa_principal.id) : "",
})
