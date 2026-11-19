import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import type { IndicadoresFiltros, IndicadoresQueryFilters } from "@/features/gestion-estudiantil/prevencion/api/types"

/** Agrupaciones que acepta `AGRUPAR` de `/indicadores` (GRADO por defecto). */
export const AGRUPACIONES: Opcion[] = [
  { value: "SEDE", label: "Sede" },
  { value: "GRADO", label: "Grado" },
  { value: "DOCENTE", label: "Responsable de enseñanza" },
]

export const etiquetaAgrupacion = (valor: string): string => AGRUPACIONES.find((a) => a.value === valor)?.label ?? "Grado"

const FORMATO = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1, minimumFractionDigits: 0 })

/** «94,2 %»; «—» si no hay dato. */
export function formatPorcentaje(valor: number | null | undefined): string {
  return valor == null ? "—" : `${FORMATO.format(valor)} %`
}

/** Decimal con coma («3,8»). */
export function formatDecimal(valor: number | null | undefined): string {
  return valor == null ? "—" : FORMATO.format(valor)
}

const id = (v: string) => (v ? Number(v) : null)

/** Filtros de la pantalla → parámetros del endpoint (y `FILTERS` de la exportación). */
export function toIndicadoresFilters(establecimiento: number, f: IndicadoresFiltros): IndicadoresQueryFilters {
  return {
    ESTABLECIMIENTO: establecimiento,
    PERIODO_ACADEMICO: id(f.periodoAcademico),
    PERIODO: id(f.periodo),
    SEDE: id(f.sede),
    JORNADA: id(f.jornada),
    AGRUPAR: f.agrupar || null,
    MOTIVO_RETIRO: f.motivoRetiro || null,
  }
}

/** «1 (Cambio de domicilio)»; «—» sin retiros. */
export function textoRetiros(retiros: number, motivo: string | null): string {
  if (!retiros) return "—"
  return motivo ? `${retiros} (${motivo})` : String(retiros)
}

/** % de beneficiarios que siguen Cursando (retenidos de la base); null sin beneficiarios. */
export function porcentajeBeneficiarios(retenidos: number, base: number): number | null {
  return base > 0 ? Math.round((1000 * retenidos) / base) / 10 : null
}

/** % de no beneficiarios que sigue Cursando, de la frase del backend («No beneficiarios: 91 % siguen Cursando»). */
export function porcentajeNoBeneficiarios(frase: string | null | undefined): number | null {
  const m = frase?.match(/(\d+(?:[.,]\d+)?)\s*%/)
  return m ? Number(m[1].replace(",", ".")) : null
}
