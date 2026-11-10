import type { AfectadoSiuce } from "@/features/gestion-estudiantil/convivencia/api/types"
import { formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"

/** Rango válido para el reporte: ambas fechas y desde no posterior a hasta (`AAAA-MM-DD` se compara como texto). */
export const rangoValido = (desde: string, hasta: string) => Boolean(desde && hasta && desde <= hasta)

const sinTildes = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim()

/** Columnas cuyo rótulo contiene el texto (sin tildes ni mayúsculas). */
export const filtrarColumnas = <C extends { rotulo: string }>(columnas: C[], texto: string) => {
  const q = sinTildes(texto)
  return q ? columnas.filter((c) => sinTildes(c.rotulo).includes(q)) : columnas
}

/** Agrupa conservando el orden de aparición de los grupos. */
export function agruparColumnas<C extends { grupo: string }>(columnas: C[]) {
  const grupos = new Map<string, C[]>()
  for (const c of columnas) grupos.set(c.grupo, [...(grupos.get(c.grupo) ?? []), c])
  return [...grupos].map(([grupo, items]) => ({ grupo, items }))
}

/** Clave estable de un afectado: `m:<matrícula>` o `f:<funcionario>` (la misma de Registrar acción). */
export const claveAfectado = (a: Pick<AfectadoSiuce, "fk_matricula" | "fk_funcionario">) =>
  a.fk_matricula ? `m:${a.fk_matricula}` : `f:${a.fk_funcionario}`

/** Afectados que aún no tienen código SIUCE. */
export const afectadosSinCodigo = (afectados: AfectadoSiuce[] | null | undefined) =>
  (afectados ?? []).filter((a) => !a.codigo)

/** Afectados ya reportados, para el aviso bajo el constructor. */
export const afectadosReportados = (afectados: AfectadoSiuce[] | null | undefined) =>
  (afectados ?? []).filter((a) => a.codigo)

/** «X se reportó el 28/10/2026 (código Y)». */
export const textoReportado = (a: AfectadoSiuce) =>
  `${a.nombre} se reportó el ${formatFecha(a.fecha_reporte)} (código ${a.codigo})`

/** Con los códigos que se están agregando, ¿todos los afectados del caso quedan reportados? */
export function todosQuedanReportados(afectados: AfectadoSiuce[] | null | undefined, elegidos: string[]) {
  const lista = afectados ?? []
  if (!lista.length) return false
  const claves = new Set(elegidos.filter(Boolean))
  return lista.every((a) => a.codigo || claves.has(claveAfectado(a)))
}

/** Errores del formulario de exportación (`undefined` = válido). */
export function erroresExportarSiuce(desde: string, hasta: string, columnas: string[]) {
  return {
    rango: !desde || !hasta
      ? "El rango de fechas es obligatorio."
      : desde > hasta
        ? "La fecha inicial no puede ser posterior a la final."
        : undefined,
    columnas: columnas.length ? undefined : "Elija al menos una columna.",
  }
}
