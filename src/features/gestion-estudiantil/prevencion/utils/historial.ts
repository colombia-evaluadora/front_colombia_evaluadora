import type { Historial, HistorialEvento } from "@/features/gestion-estudiantil/prevencion/api/types"

/** Título en negrita por tipo de evento; el resto de la frase del backend queda como detalle. */
const TITULO_EVENTO: Record<string, string> = {
  VALORACION: "Valoración del riesgo",
  PLAN_CREADO: "Plan de acompañamiento creado",
  PLAN_ACEPTADO: "Plan de acompañamiento aceptado",
  AVANCE: "Avance",
  ACCION_CUMPLIDA: "Acción cumplida",
  ACCION_VENCIDA: "Acción vencida",
  PLAN_ANULADO: "Plan anulado",
}

export interface FilaHistorial {
  clave: string
  fecha: string
  titulo: string
  detalle: string | null
  autor: string | null
  nivel: HistorialEvento["nivel"]
}

function desdeEvento(e: HistorialEvento, i: number): FilaHistorial {
  const titulo = TITULO_EVENTO[e.tipo]
  if (!titulo) return { clave: `e-${i}`, fecha: e.fecha, titulo: e.texto, detalle: null, autor: e.autor, nivel: e.nivel }
  // «Acción cumplida: Tutoría» → detalle «Tutoría»; si la frase repite el título no hay detalle.
  const resto = e.texto.startsWith(`${titulo}:`) ? e.texto.slice(titulo.length + 1).trim() : e.texto
  return {
    clave: `e-${i}`,
    fecha: e.fecha,
    titulo,
    detalle: resto && resto !== titulo ? resto : null,
    autor: e.autor,
    nivel: e.nivel,
  }
}

/** Eventos y anotaciones de permanencia en una sola línea de tiempo, de lo más reciente a lo más antiguo. */
export function construirFilas(h: Historial): FilaHistorial[] {
  const eventos = h.eventos.map(desdeEvento)
  const anotaciones: FilaHistorial[] = h.anotaciones_permanencia.map((a, i) => ({
    clave: `a-${i}`,
    fecha: a.fecha,
    titulo: "Anotación",
    detalle: a.codigo,
    autor: a.autor,
    nivel: null,
  }))
  return [...eventos, ...anotaciones].sort((x, y) => y.fecha.localeCompare(x.fecha))
}

/** pk de la última valoración no anulada del historial (origen por defecto de un plan nuevo), o undefined. */
export function ultimaValoracionVigente(h: Pick<Historial, "valoraciones">): number | undefined {
  const vigentes = h.valoraciones.filter((v) => !v.anulada)
  if (vigentes.length === 0) return undefined
  return vigentes.reduce((a, b) => (b.fecha > a.fecha || (b.fecha === a.fecha && b.id > a.id) ? b : a)).id
}
