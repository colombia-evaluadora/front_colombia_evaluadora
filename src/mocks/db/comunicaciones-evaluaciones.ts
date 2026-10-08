import type { EntregaEvaluacion, Evaluacion } from "@/features/comunicaciones/chat/api/types"

// Fechas relativas a hoy para que la evaluación siempre esté abierta en la demo.
const DIA = 24 * 60 * 60_000
const haceDias = (n: number) => new Date(Date.now() - n * DIA).toISOString()

export const evaluaciones: Evaluacion[] = [
  {
    conversacionId: 7,
    nombre: "Examen Matemáticas",
    descripcion: "Fracciones y porcentajes, grado séptimo.",
    fechaInicio: haceDias(1),
    fechaCierre: haceDias(-7),
    tiempoLimiteMin: 45,
    puntajeTotal: 100,
    intentos: null,
    mostrarResultados: "AL_CIERRE",
    creadoPor: "Andrés Gómez",
    esCreador: true,
    intentosUsados: 0,
    miNota: null,
    miNotaPendiente: false,
    preguntas: [
      {
        id: 1,
        tipo: "MULTIPLE",
        texto: "¿Cuál es el resultado de 3/4 + 1/2?",
        puntos: 25,
        opciones: [
          { id: 1, texto: "4/6", correcta: false },
          { id: 2, texto: "5/4", correcta: true },
          { id: 3, texto: "5/6", correcta: false },
          { id: 4, texto: "1", correcta: false },
        ],
      },
      {
        id: 2,
        tipo: "UNICA",
        texto: "Si un producto cuesta $80.000 y tiene un descuento del 10%, ¿cuánto se paga?",
        puntos: 25,
        opciones: [
          { id: 5, texto: "$72.000", correcta: true },
          { id: 6, texto: "$70.000", correcta: false },
          { id: 7, texto: "$75.000", correcta: false },
          { id: 8, texto: "$68.000", correcta: false },
        ],
      },
      {
        id: 3,
        tipo: "REDACCION",
        texto: "Explica con tus palabras cómo se convierte un porcentaje en fracción.",
        puntos: 25,
        opciones: [],
      },
      {
        id: 4,
        tipo: "SI_NO",
        texto: "El 25% es equivalente a 1/4.",
        puntos: 25,
        opciones: [
          { id: 9, texto: "Verdadero", correcta: true },
          { id: 10, texto: "Falso", correcta: false },
        ],
      },
    ],
  },
]

const REDACCION =
  "Se divide el porcentaje entre 100 y luego se simplifica la fracción.\nEjemplo: 25% = 25/100 = 1/4"

const entrega = (
  id: number,
  estudiante: string,
  [p1, p2, p4]: [number[], number[], number[]],
): EntregaEvaluacion => ({
  id,
  estudiante,
  estado: "PENDIENTE",
  respuestas: [
    { preguntaId: 1, opcionIds: p1, texto: null, puntos: null },
    { preguntaId: 2, opcionIds: p2, texto: null, puntos: null },
    { preguntaId: 3, opcionIds: [], texto: REDACCION, puntos: null },
    { preguntaId: 4, opcionIds: p4, texto: null, puntos: null },
  ],
})

// Entregas por canal de evaluación.
export const entregas = new Map<number, EntregaEvaluacion[]>([
  [
    7,
    [
      entrega(1, "Jaramillo Jaramillo Lina Marcela", [[2], [5], [10]]),
      entrega(2, "Sierra Ramírez Edwin Fernney", [[2], [5], [9]]),
      entrega(3, "Ballesteros Muñoz Liliana Del Rosario", [[2], [5], [9]]),
      entrega(4, "Gonzalez Gomez Francisco Torres", [[1, 2], [6], [9]]),
    ],
  ],
])
