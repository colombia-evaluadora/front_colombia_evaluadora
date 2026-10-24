import { http, HttpResponse, delay } from "msw"

/**
 * `GET /planeador/actividades/escala-precarga` (Regla 40, V496.4). Devuelve la escala
 * de Básica (Bajo/Básico/Alto/Superior) con el formato "De cero a cinco": el puntaje de
 * cada nivel es el promedio de su banda llevado a 0-5 y `descriptor` es `null`, igual
 * que el backend real (`TVALORACION` no tiene descripción por nivel). Va antes de
 * `planeadorHandlers` en `handlers/index.ts`: MSW usa el primer match.
 */
export const planeadorEscalaPrecargaHandlers = [
  http.get("/api/eval-col/planeador/actividades/escala-precarga", async () => {
    await delay(120)
    const nivel = (orden: number, codigo: string, etiqueta: string, inf: number, sup: number, puntaje: number) => ({
      fkTescalaValoracion: 9000 + orden,
      orden,
      codigo,
      etiqueta,
      descriptor: null,
      tipoValoracion: "Desempeño",
      limiteInferior: inf,
      limiteSuperior: sup,
      puntaje,
    })
    return HttpResponse.json({
      rows: [
        {
          precarga: {
            contexto: { fkTasignatura: 1, fkTgrado: 6, fkTescala: 3, escala: "Escala Básica Secundaria" },
            formato: { valor: "CERO_CINCO", nombre: "De cero a cinco", esNumerico: true, notaMaxima: 5, decimales: 1 },
            tipoSugerido: "NUMERICA",
            valorMaximo: 5,
            rango: { valorMinimo: 0, valorMaximo: 5 },
            niveles: [
              nivel(1, "BAJO", "Bajo", 0, 59.99, 1.5),
              nivel(2, "BASICO", "Básico", 60, 79.99, 3.5),
              nivel(3, "ALTO", "Alto", 80, 94.99, 4.4),
              nivel(4, "SUPERIOR", "Superior", 95, 100, 4.9),
            ],
          },
        },
      ],
    })
  }),
]
