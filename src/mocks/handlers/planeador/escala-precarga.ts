import { http, HttpResponse, delay } from "msw"

/** Nivel de la escala tal como lo arma `fn_actividad_escala_precarga_interno` (V496.2). */
function nivel(
  orden: number,
  codigo: string,
  etiqueta: string,
  inf: number,
  sup: number,
  puntaje: number,
  descriptor: string | null,
) {
  return {
    fkTescalaValoracion: 9000 + orden,
    orden,
    codigo,
    etiqueta,
    descriptor,
    tipoValoracion: "Desempeño",
    limiteInferior: inf,
    limiteSuperior: sup,
    puntaje,
  }
}

/**
 * Escala de Básica (Bajo/Básico/Alto/Superior) con el formato "De cero a cinco": el
 * puntaje de cada nivel es el promedio de su banda llevado a 0-5 y `descriptor` es la
 * descripción del nivel (`TESCALA_VALORACION.DESCRIPCION`, V71.1); "Superior" va sin
 * descripción para cubrir el caso en que el docente la escribe.
 */
export function precargaEscalaMock() {
  return {
    contexto: { fkTasignatura: 1, fkTgrado: 6, fkTescala: 3, escala: "Escala Básica Secundaria" },
    formato: { valor: "CERO_CINCO", nombre: "De cero a cinco", esNumerico: true, notaMaxima: 5, decimales: 1 },
    tipoSugerido: "NUMERICA" as const,
    valorMaximo: 5,
    rango: { valorMinimo: 0, valorMaximo: 5 },
    niveles: [
      nivel(1, "BAJO", "Bajo", 0, 59.99, 1.5, "No alcanza los desempeños básicos propuestos."),
      nivel(2, "BASICO", "Básico", 60, 79.99, 3.5, "Alcanza los desempeños mínimos necesarios."),
      nivel(3, "ALTO", "Alto", 80, 94.99, 4.4, "Alcanza satisfactoriamente los desempeños propuestos."),
      nivel(4, "SUPERIOR", "Superior", 95, 100, 4.9, null),
    ],
  }
}

/**
 * `variantes` de `ESCALA_VALORACION` en `instrumentosPermitidos` y en
 * `OTRO.campos.metodoValoracion.catalogo[]` (`fn_escala_variantes_permitidas`, V458) con su
 * `precarga` (Regla 40): CUALITATIVA trae `{niveles}`, NUMERICA `{valorMinimo, valorMaximo}`.
 */
export function variantesEscalaMock() {
  const precarga = precargaEscalaMock()
  return [
    { pk: 52015, valor: "CUALITATIVA", nombre: "Cualitativa", precarga: { niveles: precarga.niveles } },
    { pk: 52016, valor: "NUMERICA", nombre: "Numérica", precarga: precarga.rango },
  ]
}

/**
 * `GET /planeador/actividades/escala-precarga` (Regla 40, V496.4): lo usa el botón
 * "Restaurar valores de la institución". Va antes de `planeadorHandlers` en
 * `handlers/index.ts`: MSW usa el primer match.
 */
export const planeadorEscalaPrecargaHandlers = [
  http.get("/api/eval-col/planeador/actividades/escala-precarga", async () => {
    await delay(120)
    return HttpResponse.json({ rows: [{ precarga: precargaEscalaMock() }] })
  }),
]
