import { hashString } from "@/mocks/handlers/planeador/docentes"

import type { Actividad, Criterio } from "@/features/planeador/api/types/actividad"
import type { NotaCriterio } from "@/features/planeador/api/types/calificacion"
import type {
  CeldaEvidencia,
  InstrumentoActividad,
  InstrumentoNivel,
  InstrumentoTipo,
} from "@/features/planeador/api/types/planilla"

/**
 * Puente entre el modelo mock de `Actividad` (que ya trae `rubrica`/
 * `listaCotejo`/`escalaValoracion` embebidos, pensados para el form de
 * alta) y el contrato REAL de `/planeador/actividades/:id/instrumento`,
 * `/planeador/planilla/*` y `calificar` — confirmado contra el backend real
 * (ver `planeador-planilla-flujo-completo.postman_collection.json`). Sin
 * esto, con el mock activo, la Planilla volvería a mostrar datos que no
 * calzan con lo que el front real espera de esos endpoints.
 */

// Mismos ids hasheados que `/planeador/docentes/grupos` y
// `/planeador/docentes/grado-asignatura` — así "grupo=<id>&asignatura=<id>"
// de la URL se puede resolver de vuelta a qué actividades del mock
// corresponden, sin tener que guardar una tabla de ids aparte.
export function gradoIdDe(grado: string): number {
  return hashString(`grado-${grado}`) % 1000000
}
export function grupoIdDe(grado: string, grupo: string): number {
  return hashString(`grupo-${grado}|${grupo}`) % 1000000
}
export function asignaturaIdDe(asignatura: string): number {
  return hashString(`asignatura-${asignatura}`) % 1000000
}

/** Instrumento efectivo de la actividad, tal como lo modela el backend real
 *  (`RUBRICA`/`LISTA_COTEJO`/`ESCALA_VALORACION`/`OTRO`/`null`) — distinto
 *  del string libre `Actividad.instrumento` (pensado para el form de alta). */
export function tipoInstrumentoDe(actividad: Actividad): InstrumentoTipo | null {
  if (actividad.instrumento === "Lista de cotejo") return "LISTA_COTEJO"
  if (actividad.instrumento === "Escala de valoración") return "ESCALA_VALORACION"
  if (!actividad.instrumento || actividad.instrumento === "—") return null
  if (actividad.instrumento.startsWith("Rúbrica")) return "RUBRICA"
  // "Autoevaluación" y otros nombres libres del seed: el backend real sí
  // modela un cuarto tipo "OTRO", pero su `definicion` no está confirmada
  // contra ninguna respuesta real todavía (ver `use-nota-estudiante-query.ts`).
  return "OTRO"
}

/** Nivel "Excelente" reusa el `id` del propio criterio como su `pk` — no
 *  colisiona con los `pk` de `niveles[]` en el seed (namespaces de ids
 *  distintos) y evita inventar un id sintético aparte solo para el mock. */
function nivelesDeCriterio(criterio: Criterio): InstrumentoNivel[] {
  const niveles: InstrumentoNivel[] = []
  if (criterio.excelente) {
    niveles.push({
      pk: criterio.id,
      etiqueta: "Excelente",
      descripcion: criterio.excelente,
      ponderacion: criterio.excelentePonderacion ?? 100,
    })
  }
  for (const nivel of criterio.niveles) {
    niveles.push({
      pk: nivel.id,
      etiqueta: nivel.nombre,
      descripcion: nivel.descripcion,
      ponderacion: nivel.ponderacion ?? 100,
    })
  }
  return niveles
}

/** `GET /planeador/actividades/:id/instrumento` — deriva la respuesta real
 *  a partir de lo que ya trae la actividad del mock. */
export function instrumentoActividadDe(actividad: Actividad): InstrumentoActividad {
  const tipo = tipoInstrumentoDe(actividad)
  if (tipo === "RUBRICA") {
    return {
      instrumento: "RUBRICA",
      instrumentoNombre: actividad.instrumento,
      definicion: actividad.rubrica.criterios.map((criterio, index) => ({
        pk: criterio.id,
        orden: index + 1,
        nombre: criterio.nombre,
        descripcion: criterio.excelente,
        niveles: nivelesDeCriterio(criterio),
      })),
    }
  }
  if (tipo === "LISTA_COTEJO") {
    return {
      instrumento: "LISTA_COTEJO",
      instrumentoNombre: actividad.instrumento,
      definicion: actividad.listaCotejo.items.map((item, index) => ({
        pk: item.id,
        orden: index + 1,
        descripcion: item.descripcion,
      })),
    }
  }
  if (tipo === "ESCALA_VALORACION") {
    // Mismos ids que la categoría TIPO_ESCALA del mock (`select-catalog.ts`:
    // Numérica=1, Cualitativa=2) — `tipoEscala` es el id numérico, NO el
    // código; el código va aparte en `tipoEscalaValor` (confirmado real,
    // ver `escalaDesdeRaw` en use-instrumento-actividad-form-query.ts).
    const esNumerica = actividad.escalaValoracion.tipo === "Numérica"
    return {
      instrumento: "ESCALA_VALORACION",
      instrumentoNombre: actividad.instrumento,
      definicion: {
        pk: actividad.escalaValoracion.id,
        tipoEscala: esNumerica ? 1 : 2,
        tipoEscalaValor: esNumerica ? "NUMERICA" : "CUALITATIVA",
        tipoEscalaNombre: esNumerica ? "Numérica" : "Cualitativa",
        criteriosGenerales: actividad.escalaValoracion.criteriosGenerales || null,
        valorMin: esNumerica ? (actividad.escalaValoracion.valorMinimo ?? null) : null,
        valorMax: esNumerica ? (actividad.escalaValoracion.valorMaximo ?? null) : null,
        interpretacionRangos: esNumerica ? actividad.escalaValoracion.interpretacionRangos || null : null,
        niveles: actividad.escalaValoracion.niveles.map((nivel) => ({
          pk: nivel.id,
          etiqueta: nivel.nombre,
          descripcion: nivel.descripcion,
          ponderacion: nivel.ponderacion ?? 100,
        })),
      },
    }
  }
  if (tipo === "OTRO") {
    // El mock no modela el método de valoración configurado para "Otro"
    // (fuera de alcance del mock actual) — cae al caso "sin método", igual
    // que antes de que `InstrumentoOtroDefinicion` existiera.
    return {
      instrumento: "OTRO",
      instrumentoNombre: actividad.instrumento,
      definicion: { metodoValoracionValor: null, definicion: null },
    }
  }
  return { instrumento: null, instrumentoNombre: null, definicion: null }
}

/** Ponderación (0-100) de un `pkNivel` dentro de un criterio de rúbrica —
 *  resuelve tanto el nivel "Excelente" (pk = id del criterio) como uno de
 *  `niveles[]`. `undefined` si no matchea nada (payload inválido). */
export function ponderacionNivelRubrica(
  actividad: Actividad,
  pkCriterio: number,
  pkNivel: number,
): number | undefined {
  const criterio = actividad.rubrica.criterios.find((c) => c.id === pkCriterio)
  if (!criterio) return undefined
  if (pkNivel === criterio.id) return criterio.excelentePonderacion ?? 100
  return criterio.niveles.find((n) => n.id === pkNivel)?.ponderacion ?? 100
}

export function ponderacionItemCotejo(actividad: Actividad, pkItem: number): number | undefined {
  return actividad.listaCotejo.items.find((i) => i.id === pkItem)?.ponderacion ?? 100
}

export function ponderacionNivelEscala(actividad: Actividad, pkNivel: number): number | undefined {
  return actividad.escalaValoracion.niveles.find((n) => n.id === pkNivel)?.ponderacion ?? 100
}

/**
 * `pkTactividadEstudiante` sintético del mock: única por (actividad,
 * estudiante) — el backend real usa un id propio por esa combinación (así
 * es como confirmó el flujo de Postman que NO se puede reusar el mismo id
 * entre actividades distintas). Los ids de estudiante del mock son 1-35
 * (`buildEstudiantes` en `mocks/db/calificaciones.ts`), así que `*1000`
 * deja margen de sobra sin colisionar.
 */
export function pkTactividadEstudianteDe(actividadId: number, estudianteId: number): number {
  return actividadId * 1000 + estudianteId
}

export function decodePkTactividadEstudiante(pk: number): {
  actividadId: number
  estudianteId: number
} {
  return { actividadId: Math.floor(pk / 1000), estudianteId: pk % 1000 }
}

/**
 * Overrides de calificación en memoria — lo que antes vivía como estado
 * local (`overrides`) en `PlaneadorPlanillaPage` ahora vive del lado del
 * "backend" (mock), para que `PUT .../calificar` y `.../calificar-bulk/*`
 * tengan un efecto real que `GET /planilla/calificaciones` refleje después.
 */
const overrides = new Map<string, NotaCriterio[]>()

function key(actividadId: number, estudianteId: number): string {
  return `${actividadId}:${estudianteId}`
}

export function getOverride(actividadId: number, estudianteId: number): NotaCriterio[] | undefined {
  return overrides.get(key(actividadId, estudianteId))
}

export function setOverride(actividadId: number, estudianteId: number, notas: NotaCriterio[]): void {
  overrides.set(key(actividadId, estudianteId), notas)
}

/** Une una nota nueva al set ya guardado (en vez de reemplazarlo entero) —
 *  mismo criterio que `setNota` del front: una nota nueva por el mismo
 *  criterio reemplaza a la vieja, el resto se conserva. Usado por el bulk,
 *  que llega un criterio a la vez. */
export function mergeOverride(
  actividadId: number,
  estudianteId: number,
  nota: NotaCriterio,
): void {
  const actual = getOverride(actividadId, estudianteId) ?? []
  const next = [...actual.filter((n) => n.criterioId !== nota.criterioId), nota]
  setOverride(actividadId, estudianteId, next)
}

/**
 * Observaciones en memoria — el equivalente formativo de `overrides`, para
 * que `PUT .../observar` y `POST .../observar-grupal` tengan un efecto real
 * que la grilla refleje después. Una sola observación viva por
 * estudiante-actividad, igual que el real: la individual pisa a la grupal.
 */
const observaciones = new Map<string, string>()

export function getObservacion(actividadId: number, estudianteId: number): string | undefined {
  return observaciones.get(key(actividadId, estudianteId))
}

export function setObservacion(
  actividadId: number,
  estudianteId: number,
  observacion: string,
): void {
  observaciones.set(key(actividadId, estudianteId), observacion)
}

/**
 * Evidencias en memoria (`TACTIVIDAD_SOPORTE`, V461) — el equivalente de
 * `observaciones` para las imágenes adjuntas: guarda/quita/lista sin
 * persistir nada de verdad, solo para que agregar/quitar en el mock tenga
 * un efecto real que `GET .../nota` y la planilla reflejen después.
 */
const evidenciasPorEstudiante = new Map<string, CeldaEvidencia[]>()
let siguientePkSoporte = 900000

export function getEvidencias(actividadId: number, estudianteId: number): CeldaEvidencia[] {
  return evidenciasPorEstudiante.get(key(actividadId, estudianteId)) ?? []
}

/** Idempotente: el mismo `fkTarchivo` ya adjunto devuelve la fila existente
 *  en vez de duplicarla — mismo criterio que el real. */
export function addEvidencia(
  actividadId: number,
  estudianteId: number,
  fkTarchivo: number,
  nombre: string,
  fecha: string,
): CeldaEvidencia {
  const actuales = getEvidencias(actividadId, estudianteId)
  const existente = actuales.find((e) => e.fkTarchivo === fkTarchivo)
  if (existente) return existente
  const nueva: CeldaEvidencia = { pk: siguientePkSoporte++, fkTarchivo, nombre, fecha }
  evidenciasPorEstudiante.set(key(actividadId, estudianteId), [...actuales, nueva])
  return nueva
}

/** `true` si encontró y quitó el soporte; `false` si el pk no existe (o ya
 *  se había quitado) — mismo P0002 que el real. */
export function removeEvidencia(pkSoporte: number): boolean {
  for (const [llave, lista] of evidenciasPorEstudiante) {
    const encontrada = lista.some((e) => e.pk === pkSoporte)
    if (encontrada) {
      evidenciasPorEstudiante.set(
        llave,
        lista.filter((e) => e.pk !== pkSoporte),
      )
      return true
    }
  }
  return false
}

/**
 * El mock no modela el referente curricular, que es lo que decide de verdad
 * (`fn_actividad_es_formativa`, V243: unidad con enfoque NO evaluativo). Se
 * aproxima con lo que sí tiene, respetando la parte de la regla que no es
 * aproximable: **sin unidad nunca es formativa**.
 */
export function esFormativaMock(actividad: Actividad): boolean {
  return Boolean(actividad.unidad.id) && !actividad.esEvaluativa
}

/** Traduce el `CALIFICACION` que manda `PUT .../calificar` (una de las 4
 *  formas según instrumento) a `NotaCriterio[]` — la misma estructura que ya
 *  usa `porcentajeFinal`/`notaDefinitiva` para computar el % de la celda. */
export function calificacionANotas(actividad: Actividad, calificacion: unknown): NotaCriterio[] {
  const body = (calificacion ?? {}) as {
    niveles?: { pkCriterio: number; pkNivel: number }[]
    items?: { pkItem: number; cumplido: "S" | "N" }[]
    pkNivel?: number
    valorNumerico?: number
  }
  if (body.niveles) {
    return body.niveles.map((n) => ({
      criterioId: n.pkCriterio,
      nivelId: n.pkNivel,
      valor: ponderacionNivelRubrica(actividad, n.pkCriterio, n.pkNivel) ?? 100,
    }))
  }
  if (body.items) {
    return body.items
      .filter((i) => i.cumplido === "S")
      .map((i) => ({ criterioId: i.pkItem, valor: ponderacionItemCotejo(actividad, i.pkItem) ?? 100 }))
  }
  if (body.pkNivel != null) {
    return [
      {
        criterioId: 0,
        nivelId: body.pkNivel,
        valor: ponderacionNivelEscala(actividad, body.pkNivel) ?? 100,
      },
    ]
  }
  if (body.valorNumerico != null) {
    return [{ criterioId: 0, valor: body.valorNumerico }]
  }
  return []
}
