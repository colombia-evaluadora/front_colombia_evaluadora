import type { EstadoPiar, PiarDetalle } from "@/features/gestion-estudiantil/inclusion/piar/api/types"

export const COLOR_ESTADO: Record<EstadoPiar, "success" | "muted" | "info"> = {
  BORRADOR: "muted",
  VIGENTE: "success",
  REVISION_CONCLUIDA: "info",
  CERRADO: "muted",
}

export const COLOR_COBERTURA = { PENDIENTE_REVISION: "warning", CON_AJUSTES: "success", SIN_AJUSTES: "muted" } as const

/** Orientación escribe el PIAR (V602); coordinador y rector anulan; el resto solo consulta. */
export interface AccesoPiar {
  puedeGestionar: boolean
  puedeAnular: boolean
  /** Regla 28: el docente lista sus PIAR, pero no el aviso de estudiantes sin PIAR (V603). */
  veAvisoSinPiar: boolean
  veOrientacion: boolean
  registraAtencion: boolean
  /** Rector, coordinador y, por menú, territoriales (fn_piar_gate_informe); orientación no. */
  veInforme: boolean
  /** Ajustes y seguimiento: orientación o el docente al que se le concedió edición en el menú (D3). */
  puedeEditarAjustes: boolean
}

export function accesoPiar(roles: string[], permiso: { puedeCrear: boolean; puedeEditar: boolean }): AccesoPiar {
  const orientacion = roles.includes("CEVAL-PSICO_ORIENTADOR")
  return {
    veAvisoSinPiar: ["CEVAL-PSICO_ORIENTADOR", "CEVAL-TRABAJADOR_SOCIAL", "CEVAL-COORDINADOR", "CEVAL-RECTOR"].some((r) => roles.includes(r)),
    veOrientacion: ["CEVAL-PSICO_ORIENTADOR", "CEVAL-TRABAJADOR_SOCIAL", "CEVAL-COORDINADOR", "CEVAL-RECTOR"].some((r) => roles.includes(r)),
    registraAtencion: permiso.puedeEditar && (orientacion || roles.includes("CEVAL-RECTOR")),
    veInforme: ["CEVAL-RECTOR", "CEVAL-COORDINADOR"].some((r) => roles.includes(r)),
    puedeGestionar: orientacion && permiso.puedeEditar,
    puedeAnular: permiso.puedeEditar && (roles.includes("CEVAL-COORDINADOR") || roles.includes("CEVAL-RECTOR")),
    puedeEditarAjustes: permiso.puedeEditar && (orientacion || roles.includes("CEVAL-DOCENTE")),
  }
}

export const esEditable = (estado: EstadoPiar) => estado === "BORRADOR" || estado === "VIGENTE"

/** Los seis bloques del aviso de FIC.3. */
export function progresoBloques(p: PiarDetalle) {
  const cobertura = p.cobertura ?? []
  const pendientes = cobertura.filter((c) => c.cobertura === "PENDIENTE_REVISION").length
  const v = p.version_actual
  const bloques = [
    { ok: Boolean(p.caracterizacion?.fortalezas && p.caracterizacion?.barreras), falta: "la caracterización pedagógica" },
    { ok: Boolean(p.valoracion_pedagogica), falta: "la valoración pedagógica" },
    { ok: cobertura.length > 0 && pendientes === 0, falta: `la cobertura de ${pendientes} asignatura${pendientes === 1 ? "" : "s"}` },
    { ok: p.ajustes.length > 0 || (cobertura.length > 0 && cobertura.every((c) => c.cobertura === "SIN_AJUSTES")), falta: "los ajustes razonables" },
    { ok: Boolean(v?.participantes.length), falta: "los participantes del acta" },
    { ok: Boolean(v?.acta), falta: "el acta de acuerdo firmada" },
  ]
  return { completos: bloques.filter((b) => b.ok).length, total: bloques.length, faltan: bloques.filter((b) => !b.ok).map((b) => b.falta) }
}

export const sinAjustesTodas = (p: PiarDetalle) =>
  (p.cobertura?.length ?? 0) > 0 && (p.cobertura ?? []).every((c) => c.cobertura === "SIN_AJUSTES") && p.ajustes.length === 0

/** Al elegir, el combo reporta el valor o la etiqueta como texto: eso no es una búsqueda, filtraría a cero y perdería la selección. */
export const esOpcionElegida = (texto: string, opciones: { value: string; label: string }[]) =>
  opciones.some((o) => o.value === texto || o.label === texto)
