import { http, HttpResponse, delay } from "msw"

import { jornadasDb } from "../../db/academic-period/jornadas"
import { academicPeriodStatusesDb } from "../../db/academic-period/academic-period-statuses"
import { evaluationPeriodStatusesDb } from "../../db/academic-period/evaluation-period-statuses"
import { ratingScaleTypesDb } from "../../db/academic-period/rating-scale-types"
import { ratingSymbolsDb } from "../../db/academic-period/rating-symbols"
import { metodologiasDb } from "../../db/academic-period/metodologias"
import { GRADES } from "../../db/reservations"
import { formatGrade } from "@/features/coverage/api/ui-mappings"

// Mismo shape crudo que el catálogo genérico real
// (`GET /eval-col/select/:CATEGORIA`): `{rows: [{pk_lista_valor, nombre, valor, accion}]}`.
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
  // El pk es sintético (índice + 1) — estable mientras no cambie el orden de
  // `ratingScaleTypesDb`/`ratingSymbolsDb`/`metodologiasDb`, y suficiente
  // para el ida-y-vuelta id→valor que hacen `use-rating-scale-types.ts`
  // (elige por pk) y `resolve-rating-scale-refs.ts` (re-resuelve por valor).
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
  // Alimenta `use-grados-catalog.ts` (Períodos Académicos) y, ahora, el
  // select de Grado de "Reserva de cupo" (`use-reservation-catalogs-
  // query.ts`) — `VALOR` es el que matchea el orden real (0 = transición).
  GRADOS: () =>
    GRADES.map((grade, i) => ({
      pk_lista_valor: i + 1,
      nombre: formatGrade(grade),
      valor: String(grade),
      accion: null,
    })),
  // Los 3 catálogos que Matrícula pide vía `useMatriculaCatalogQuery` y que
  // son obligatorios SIEMPRE (ver `validateMatricula` en
  // `matricula-form-defaults.ts`: tipo de documento y género del estudiante,
  // tipo de documento del acudiente, y parentesco) -- sin ellos el select
  // queda vacío y el formulario nunca puede guardar. El resto de categorías
  // de `MATRICULA_CATALOG_CATEGORIA` (talento, estrato, sisben, etc.) son
  // opcionales según "Configuración de parámetros requeridos" y quedan
  // pendientes de agregar acá si hace falta.
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
}

export const selectCatalogHandlers = [
  http.get("/api/eval-col/select/:categoria", async ({ params }) => {
    await delay(150)
    const categoria = String(params.categoria).toUpperCase()
    const rows = CATALOGS_BY_CATEGORIA[categoria]?.() ?? []
    return HttpResponse.json({ rows })
  }),
]
