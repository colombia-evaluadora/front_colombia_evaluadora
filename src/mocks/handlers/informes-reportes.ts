import { http, HttpResponse, delay } from "msw"

// Informes y reportes (Cobertura 3.9), Reservas y Admisión (C.4.COB): datos fijos del prototipo.

const conTotal = <T extends object>(rows: T[]) => rows.map((r) => ({ ...r, total_count: rows.length }))

export const informesReportesHandlers = [
  http.get("*/api/eval-col/informes-reportes/grupos-admision", async () => {
    await delay(100)
    return HttpResponse.json({ rows: [{ id: 1, nombre: "2028 · Anual · Ciclo 1", sorteo_ejecutado_at: "2027-11-30T00:00:00" }] })
  }),

  http.post("*/api/eval-col/informes-reportes/cupos/query", async () => {
    await delay(150)
    const fila = (grado: string, sede: string, jornada: string, c: number[]) => ({
      grado_codigo: 0, grado, sede, jornada, establecimiento: "IE Central",
      cupos: c[0], reservadas: c[1], matriculadas: c[2], disponibles: c[3], lista_espera: c[4],
    })
    return HttpResponse.json({
      rows: [
        fila("Sexto", "IE Central", "Mañana", [105, 92, 5, 8, 2]),
        fila("Sexto", "IE Central", "Tarde", [70, 66, 4, 0, 6]),
        fila("Séptimo", "IE Central", "Mañana", [105, 98, 3, 4, 0]),
        fila("Séptimo", "Sede 2", "Mañana", [35, 30, 1, 4, 0]),
      ],
    })
  }),

  http.post("*/api/eval-col/informes-reportes/reservas-confirmar/query", async () => {
    await delay(150)
    return HttpResponse.json({
      rows: conTotal([
        { reserva_id: 1, estudiante: "Ana Sofía Pérez Gómez", grado: "Séptimo", sede: "IE Central", jornada: "Mañana", origen: "Prematrícula", creada: "2027-11-02", dias_sin_confirmar: 12, acudiente: "Rosa Gómez · ro***@correo.com" },
        { reserva_id: 2, estudiante: "Tomás Herrera Lozano", grado: "Sexto", sede: "Sede 2", jornada: "Mañana", origen: "Inscripción", creada: "2027-11-05", dias_sin_confirmar: 9, acudiente: "Clara Lozano · cl***@correo.com" },
      ]),
    })
  }),

  http.post("*/api/eval-col/informes-reportes/traslados/query", async () => {
    await delay(150)
    return HttpResponse.json({
      rows: conTotal([
        { reserva_id: 1, estudiante: "Mariana Villamizar Ortiz", direccion: "ENTRANTE", origen: "IE Norte", destino: "IE Central", grado: "Octavo", estado: "Pendiente", solicitado: "2027-11-10", respondido: null },
        { reserva_id: 2, estudiante: "Kevin Duarte Ríos", direccion: "SALIENTE", origen: "IE Central", destino: "IE Sur", grado: "Sexto", estado: "Aceptado", solicitado: "2027-11-03", respondido: "2027-11-06" },
      ]),
    })
  }),

  http.post("*/api/eval-col/informes-reportes/inscripciones/query", async () => {
    await delay(150)
    const fila = (grado: string, c: number[]) => ({
      grado_codigo: 0, grado, pendientes: c[0], lista_espera: c[1], admitidas: c[2], no_admitidas: c[3],
      descartadas: c[4], por_elegir: c[5], total: c[6],
    })
    return HttpResponse.json({ rows: [fila("Transición", [4, 6, 48, 3, 12, 1, 73]), fila("Sexto", [10, 8, 62, 5, 19, 2, 104])] })
  }),

  http.post("*/api/eval-col/informes-reportes/lista-sorteo", async () => {
    await delay(150)
    return HttpResponse.json({
      rows: [
        {
          lista: {
            grupoAdmision: "2028 · Anual · Ciclo 1",
            rows: [
              { posicion: 1, numeroInscripcion: "0045", prioridad: "1. Hermanos en el Establecimiento", numeroSorteo: "0012", estadoOpcion: "Admitida" },
              { posicion: 2, numeroInscripcion: "0102", prioridad: "", numeroSorteo: "0087", estadoOpcion: "En lista de espera" },
            ],
          },
        },
      ],
    })
  }),

  http.post("*/api/eval-col/informes-reportes/demanda/query", async () => {
    await delay(150)
    return HttpResponse.json({
      rows: [
        { grado: "Sexto", modalidad: "Anual", municipio: "Bucaramanga", establecimiento_origen: "IE Norte", en_redistribucion: 6, sin_cupo: 1, total: 7 },
        { grado: "Primero", modalidad: "Anual", municipio: "Bucaramanga", establecimiento_origen: "Sin establecimiento anterior", en_redistribucion: 3, sin_cupo: 2, total: 5 },
      ],
    })
  }),
]
