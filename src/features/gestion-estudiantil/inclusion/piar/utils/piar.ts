import type { EstadoPiar, PiarDetalle } from "@/features/gestion-estudiantil/inclusion/piar/api/types"

export const COLOR_ESTADO: Record<EstadoPiar, "success" | "muted" | "info"> = {
  BORRADOR: "muted",
  VIGENTE: "success",
  REVISION_CONCLUIDA: "info",
  CERRADO: "muted",
}

export const COLOR_COBERTURA = { PENDIENTE_REVISION: "warning", CON_AJUSTES: "success", SIN_AJUSTES: "muted" } as const

export const esEditable = (estado: EstadoPiar) => estado === "BORRADOR" || estado === "VIGENTE"

/**
 * Completitud (5.1): datos existentes, voz, caracterización y valoración, cobertura y ajustes, actividades/acuerdo
 * y documento firmado. La voz es opcional: sin datos cuenta como No aplica. Completo no equivale a Vigente.
 */
export function progresoBloques(p: PiarDetalle) {
  const cobertura = p.cobertura ?? []
  const pendientes = cobertura.filter((c) => c.cobertura === "PENDIENTE_REVISION").length
  const v = p.version_actual
  const firmas = v?.firmantes_faltantes?.length ?? 0
  const acuerdo = [
    !v?.fecha_acuerdo && "la fecha del acuerdo",
    !v?.compromisos_establecimiento && "los compromisos del establecimiento",
    firmas > 0 && "las firmas requeridas",
  ].filter(Boolean)
  const bloques = [
    { ok: true, falta: "" },
    { ok: true, falta: "" },
    {
      ok: Boolean(p.caracterizacion?.fortalezas && p.caracterizacion?.barreras && p.valoracion_pedagogica),
      falta: "la caracterización y la valoración pedagógica",
    },
    {
      ok: cobertura.length > 0 && pendientes === 0,
      falta: pendientes ? `la cobertura de ${pendientes} asignatura${pendientes === 1 ? "" : "s"}` : "la cobertura",
    },
    { ok: acuerdo.length === 0, falta: acuerdo.join(", ") },
    { ok: Boolean(v?.acta), falta: "el acta de acuerdo firmada" },
  ]
  return { completos: bloques.filter((b) => b.ok).length, total: bloques.length, faltan: bloques.filter((b) => !b.ok).map((b) => b.falta) }
}

export const sinAjustesTodas = (p: PiarDetalle) =>
  (p.cobertura?.length ?? 0) > 0 && (p.cobertura ?? []).every((c) => c.cobertura === "SIN_AJUSTES") && p.ajustes.length === 0

/** Al elegir, el combo reporta el valor o la etiqueta como texto: eso no es una búsqueda, filtraría a cero y perdería la selección. */
export const esOpcionElegida = (texto: string, opciones: { value: string; label: string }[]) =>
  opciones.some((o) => o.value === texto || o.label === texto)

/** CIC.7: fn_piar_activacion_faltantes devuelve códigos; el usuario lee qué hacer. */
const TEXTO_FALTANTE: Record<string, string> = {
  COBERTURA_INCOMPLETA: "Revisar la cobertura de las asignaturas pendientes.",
  SIN_AJUSTE_APLICABLE: "Registrar al menos un ajuste con su asignatura.",
  AJUSTES_POR_MAPEAR: "Asignar una asignatura a los ajustes Por mapear.",
  SIN_ACTA_FIRMADA: "Cargar el acta de acuerdo firmada.",
  FIRMAS_PENDIENTES: "Marcar como Firmó, con su fecha, a orientación, un docente de una asignatura con ajustes, rector y acudiente.",
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** Con el PIAR, los textos de cobertura y de ajustes Por mapear llevan sus conteos (CIC.7). */
export const textosFaltantes = (codigos: string[] | null | undefined, piar?: Pick<PiarDetalle, "cobertura" | "ajustes">) =>
  (codigos ?? []).map((c) => {
    if (piar && c === "COBERTURA_INCOMPLETA") {
      const n = (piar.cobertura ?? []).filter((x) => x.cobertura === "PENDIENTE_REVISION").length
      if (n > 0) return `Revisar la cobertura de ${plural(n, "asignatura", "asignaturas")} (Pendiente de revisión).`
    }
    if (piar && c === "AJUSTES_POR_MAPEAR") {
      const n = piar.ajustes.filter((x) => x.por_mapear).length
      if (n > 0) return `Asignar una asignatura a ${plural(n, "ajuste", "ajustes")} (Por mapear).`
    }
    return TEXTO_FALTANTE[c] ?? "Completar los datos del PIAR."
  })

/** El acta se carga cuando es lo único que falta; lo demás se explica antes de pedir el archivo. */
export const soloFaltaActa = (codigos: string[] | null | undefined) => (codigos ?? []).every((c) => c === "SIN_ACTA_FIRMADA")

/** query-service solo admite claves A-Z, 0-9 y _ en un JSON: «Ajuste de Matemáticas» viaja como AJUSTE_DE_MATEMATICAS. */
export const claveElemento = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^(?=\d)/, "E_")

export const textoElemento = (clave: string) => {
  const campo = /^AJUSTE_\d+_(.+)$/.exec(clave)?.[1]
  if (campo) return `Ajuste: ${campo.replace(/_/g, " ").toLowerCase()}`
  const t = clave.replace(/_/g, " ").toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}
