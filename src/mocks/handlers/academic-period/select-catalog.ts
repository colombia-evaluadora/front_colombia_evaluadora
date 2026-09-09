import { http, HttpResponse, delay } from "msw"

import { jornadasDb } from "../../db/academic-period/jornadas"
import { academicPeriodStatusesDb } from "../../db/academic-period/academic-period-statuses"
import { evaluationPeriodStatusesDb } from "../../db/academic-period/evaluation-period-statuses"
import { ratingScaleTypesDb } from "../../db/academic-period/rating-scale-types"
import { ratingSymbolsDb } from "../../db/academic-period/rating-symbols"
import { metodologiasDb } from "../../db/academic-period/metodologias"
import { GRADES } from "../../db/reservations"
import { formatGrade } from "@/features/coverage/api/ui-mappings"
import { MATRICULA_STATUSES } from "@/features/coverage/api/ui-mappings-matricula"

interface SelectCategoryRow {
  pk_lista_valor: number
  nombre: string
  valor: string
  accion: string | null
}

const CATALOGS_BY_CATEGORIA: Record<string, () => SelectCategoryRow[]> = {
  JORNADA: () =>
    jornadasDb.map((jornada) => ({
      pk_lista_valor: jornada.id,
      nombre: jornada.name,
      valor: jornada.name,
      accion: null,
    })),
  ESTADOPERIODO: () =>
    academicPeriodStatusesDb.map((status) => ({
      pk_lista_valor: status.id,
      nombre: status.label,
      valor: status.key,
      accion: null,
    })),
  ESTADOPERIODOEVALUACION: () =>
    evaluationPeriodStatusesDb.map((status) => ({
      pk_lista_valor: status.id,
      nombre: status.label,
      valor: status.key,
      accion: null,
    })),

  TIPO_VALORACION: () =>
    ratingScaleTypesDb.map((option, i) => ({
      pk_lista_valor: i + 1,
      nombre: option.label,
      valor: option.key,
      accion: null,
    })),
  GRAFICA_CARITA: () =>
    ratingSymbolsDb
      .filter((symbol) => symbol.categoria === "carita")
      .map((symbol, i) => ({
        pk_lista_valor: i + 1,
        nombre: symbol.label,
        valor: symbol.valor,
        accion: null,
      })),
  GRAFICA_SIMBOLO: () =>
    ratingSymbolsDb
      .filter((symbol) => symbol.categoria === "valoracion")
      .map((symbol, i) => ({
        pk_lista_valor: i + 1,
        nombre: symbol.label,
        valor: symbol.valor,
        accion: null,
      })),
  MODELO_PEDAGOGICO: () =>
    metodologiasDb.map((option, i) => ({
      pk_lista_valor: i + 1,
      nombre: option.label,
      valor: option.key,
      accion: null,
    })),
  GRADOS: () =>
    GRADES.map((grade, i) => ({
      pk_lista_valor: i + 1,
      nombre: formatGrade(grade),
      valor: String(grade),
      accion: null,
    })),
  TIPO_DOCUMENTO: () =>
    ["Registro Civil", "Tarjeta de Identidad", "Cédula de Ciudadanía", "Cédula de Extranjería", "Pasaporte"].map(
      (nombre, i) => ({ pk_lista_valor: i + 1, nombre, valor: nombre, accion: null }),
    ),
  GENERO: () =>
    ["Masculino", "Femenino"].map((nombre, i) => ({
      pk_lista_valor: i + 1,
      nombre,
      valor: nombre,
      accion: null,
    })),
  PARENTESCO: () =>
    ["Padre", "Madre", "Abuelo/a", "Tío/a", "Hermano/a", "Tutor legal"].map((nombre, i) => ({
      pk_lista_valor: i + 1,
      nombre,
      valor: nombre,
      accion: null,
    })),
  ESTADO_MATRICULA: () =>
    MATRICULA_STATUSES.map((nombre, i) => ({
      pk_lista_valor: i + 1,
      nombre,
      valor: String(i + 1),
      accion: null,
    })),
  // Catálogo `TIPO_ACTIVIDAD` real que resuelve `FK_TLV_TIPO_ACTIVIDAD` en
  // `fn_actividad_crear`/`_actualizar` (V224, colección Postman
  // `planeador-actividad`) — el Planeador ya no lo hardcodea en el `<Select>`.
  TIPO_ACTIVIDAD: () =>
    ["Proyecto", "Exposición", "Práctica", "Ensayo", "Debate", "Simulación", "Otro"].map(
      (nombre, i) => ({ pk_lista_valor: i + 1, nombre, valor: nombre, accion: null }),
    ),
  // Catálogo `INSTRUMENTO_EVALUACION` real que resuelve
  // `FK_TLV_INSTRUMENTO_EVALUACION` (V226/V240, colección Postman
  // `planeador-instrumentos`).
  INSTRUMENTO_EVALUACION: () =>
    ["Rúbrica", "Lista de cotejo", "Escala de valoración", "Otro"].map((nombre, i) => ({
      pk_lista_valor: i + 1,
      nombre,
      valor: nombre,
      accion: null,
    })),
  // Catálogo `ELEMENTO_CALCULO_DEF` real — resuelve un campo de Periodos
  // Académicos (`use-evaluation-criteria-options.ts`), sin relación con el
  // Planeador. No confundir con `AGRUPACION_PLANILLA` (abajo): comparten el
  // patrón "dos opciones de agrupación", pero son catálogos distintos.
  ELEMENTO_CALCULO_DEF: () =>
    [
      { nombre: "Instrumentos", valor: "1" },
      { nombre: "Actividades", valor: "2" },
    ].map((opt, i) => ({ pk_lista_valor: i + 1, nombre: opt.nombre, valor: opt.valor, accion: null })),
  // Catálogo `AGRUPACION_PLANILLA` real — resuelve el "Ver por" de la
  // Planilla de calificación (agrupar columnas por unidad temática o
  // dejarlas sueltas por actividad); el Planeador ya no lo hardcodea en el
  // `<Select>`. Sin código numérico confirmado contra una respuesta real
  // todavía — se empareja por nombre (`use-agrupacion-planilla-catalog.ts`).
  AGRUPACION_PLANILLA: () =>
    ["Actividades", "Unidad"].map((nombre, i) => ({
      pk_lista_valor: i + 1,
      nombre,
      valor: nombre,
      accion: null,
    })),
  // Catálogo de asistencias -- el valor 4 no existe (ver Postman de
  // `SSO - Asistencias`).
  TIPO_ASISTENCIA: () =>
    [
      { valor: 1, nombre: "Asistió" },
      { valor: 2, nombre: "No asistió" },
      { valor: 3, nombre: "No asistió (justificado)" },
      { valor: 5, nombre: "Llegó tarde" },
      { valor: 6, nombre: "Llegó tarde (justificado)" },
    ].map((opt, i) => ({ pk_lista_valor: i + 1, nombre: opt.nombre, valor: String(opt.valor), accion: null })),
}

export const selectCatalogHandlers = [
  http.get("/api/eval-col/select/:categoria", async ({ params }) => {
    await delay(150)
    const categoria = String(params.categoria).toUpperCase()
    const rows = CATALOGS_BY_CATEGORIA[categoria]?.() ?? []
    return HttpResponse.json({ rows })
  }),
]
