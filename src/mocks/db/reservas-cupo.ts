import type {
  PeriodoInscripciones,
  ReservaCupo,
} from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"

export const PERIODOS_INSCRIPCIONES: PeriodoInscripciones[] = [
  { id: "1", sede: "IE Central", jornada: "Mañana", anio: 2028, modalidad: "Anual", ciclo: 1 },
  { id: "2", sede: "IE Central", jornada: "Tarde", anio: 2028, modalidad: "Anual", ciclo: 1 },
  { id: "3", sede: "Sede Norte", jornada: "Mañana", anio: 2028, modalidad: "Anual", ciclo: 1 },
  { id: "4", sede: "IE Central", jornada: "Nocturna", anio: 2028, modalidad: "Semestral", ciclo: 1 },
]

export const SEDES = ["IE Central", "Sede Norte"]
export const JORNADAS = ["Mañana", "Tarde", "Nocturna"]
export const GRADOS = ["Transición", "1°", "2°", "3°", "4°", "5°", "6°", "7°", "8°", "9°", "10°", "11°"]

const NOMBRES = ["Sofía", "Andrés", "Valentina", "Mateo", "Camila", "Samuel", "Isabella", "Juan Pablo", "Mariana", "Tomás", "Luciana", "Santiago"]
const APELLIDOS = ["Martínez", "Gómez", "Ruiz", "López", "Torres", "Castro", "Rojas", "Peña", "Herrera", "Díaz", "Vega", "Ortiz", "Gil", "Pérez"]

function base(i: number): ReservaCupo {
  const sede = SEDES[i % 2]
  return {
    id: String(i + 1),
    estudiante: `${NOMBRES[i % NOMBRES.length]} ${APELLIDOS[(i * 3) % APELLIDOS.length]} ${APELLIDOS[(i * 5 + 1) % APELLIDOS.length]}`,
    documento: String(1_020_000_000 + i * 7919),
    establecimientoOrigen: null,
    grado: GRADOS[1 + (i % 11)],
    sede,
    jornada: JORNADAS[i % 2],
    periodo: "2028 · Anual · Ciclo 1",
    estado: "RESERVADA",
    origen: "RESERVAR_CUPOS",
    confirmadaPorAcudiente: true,
    estadoTraslado: null,
    destinoTraslado: null,
    trasladoEntrante: false,
    motivoLiberacion: null,
  }
}

// Mismos totales que el prototipo: 204 filas, 182 Reservadas, 6 Sin
// continuidad, 14 por confirmar y 2 traslados por responder.
function seed(): ReservaCupo[] {
  return Array.from({ length: 204 }, (_, i) => {
    const r = base(i)
    if (i % 34 === 2) return { ...r, estado: "SIN_CONTINUIDAD" }
    if (i === 5 || i === 60 || i === 120) return { ...r, estado: "MATRICULADA" }
    if (i % 17 === 6 && i < 200) return { ...r, estado: "LIBERADA", motivoLiberacion: "La familia desiste" }
    if (i === 3) {
      return { ...r, estadoTraslado: "PENDIENTE", destinoTraslado: "IE San José", origen: "PREMATRICULA" }
    }
    if (i === 4 || i === 90) {
      return {
        ...r,
        trasladoEntrante: true,
        estadoTraslado: "PENDIENTE",
        establecimientoOrigen: "IE La Esperanza",
        origen: "TRASLADO",
      }
    }
    if (i === 7) return { ...r, origen: "REDISTRIBUCION" }
    if (i % 14 === 1) return { ...r, confirmadaPorAcudiente: false }
    return r
  })
}

export const reservasCupoDb: ReservaCupo[] = seed()

// Estudiantes Cursando aún sin reserva que "Reservar cupos" procesaría.
export const pendientesReservarDb = { porPeriodo: { "1": 70, "2": 52, "3": 30, "4": 18 } as Record<string, number> }
