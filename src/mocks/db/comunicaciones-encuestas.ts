import type { Encuesta } from "@/features/comunicaciones/chat/api/types"

export const encuestas: Encuesta[] = [
  {
    conversacionId: 6,
    nombre: "Encuesta Satisfacción",
    descripcion: "Encuesta de satisfacción institucional.",
    fechaInicio: "2026-03-01T13:00:00.000Z",
    fechaCierre: "2026-03-20T22:00:00.000Z",
    resultados: "PUBLICOS",
    totalHabilitados: 141,
    participantes: 120,
    creadoPor: "Andrés Gómez",
    esCreador: true,
    preguntas: [
      {
        id: 1,
        tipo: "MULTIPLE",
        texto: "¿Qué aspectos deberían mejorar prioritariamente?",
        totalRespuestas: 120,
        respuestas: [],
        opciones: [
          { id: 1, texto: "Infraestructura", votos: 54 },
          { id: 2, texto: "Atención administrativa", votos: 36 },
          { id: 3, texto: "Actividades extracurriculares", votos: 24 },
          { id: 4, texto: "Comunicación con docentes", votos: 12 },
        ],
      },
      {
        id: 2,
        tipo: "UNICA",
        texto: "¿Cómo calificas la comunicación institucional?",
        totalRespuestas: 120,
        respuestas: [],
        opciones: [
          { id: 5, texto: "Excelente", votos: 48 },
          { id: 6, texto: "Buena", votos: 54 },
          { id: 7, texto: "Regular", votos: 18 },
        ],
      },
      {
        id: 3,
        tipo: "REDACCION",
        texto: "¿Qué propuesta tienes para mejorar la experiencia estudiantil?",
        totalRespuestas: 87,
        opciones: [],
        respuestas: [
          "Más actividades deportivas y culturales.",
          "Mejorar la comunicación con los docentes.",
          "Implementar más herramientas digitales.",
          "Espacios de participación estudiantil.",
        ],
      },
      {
        id: 4,
        tipo: "SI_NO",
        texto: "¿Te gustaría participar más en actividades organizadas por el colegio?",
        totalRespuestas: 110,
        respuestas: [],
        opciones: [
          { id: 8, texto: "Sí", votos: 82 },
          { id: 9, texto: "No", votos: 28 },
        ],
      },
    ],
  },
]
