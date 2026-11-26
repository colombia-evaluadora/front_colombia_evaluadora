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

  // Estadística de edades (C.4.EDA.1): Sexto y Séptimo con edad recomendada 11 y 12.
  http.post("*/api/eval-col/informes-reportes/edades/query", async () => {
    await delay(150)
    const sit = (edad: number, rec: number) =>
      edad - rec >= 3 ? "EXTRAEDAD" : edad - rec >= 2 ? "PREEXTRAEDAD" : edad - rec <= -2 ? "BAJA_EDAD" : "EN_EDAD"
    const filas = (grupo: string, orden: number, rec: number, porEdad: [number, number][]) =>
      porEdad.flatMap(([edad, n]) => [
        { grupo, orden, edad_recomendada: rec, edad, genero: "Femenino", situacion: sit(edad, rec), cantidad: Math.ceil(n / 2) },
        { grupo, orden, edad_recomendada: rec, edad, genero: "Masculino", situacion: sit(edad, rec), cantidad: Math.floor(n / 2) },
      ])
    return HttpResponse.json({
      rows: [
        ...filas("Sexto", 6, 11, [[9, 3], [10, 7], [11, 62], [12, 30], [13, 12], [14, 5]]),
        ...filas("Séptimo", 7, 12, [[9, 1], [10, 2], [11, 7], [12, 62], [13, 30], [14, 17]]),
      ],
    })
  }),

  http.post("*/api/eval-col/informes-reportes/edades/estudiantes/query", async () => {
    await delay(150)
    return HttpResponse.json({
      rows: conTotal([
        { matricula_id: 1, documento: "1098765421", estudiante: "Valentina Ríos Mora", fecha_nacimiento: "2015-05-12", edad: 11, grupo_clave: "Sexto", grupo: "6°A", situacion: "EN_EDAD" },
        { matricula_id: 2, documento: "1098765422", estudiante: "Samuel Díaz Peña", fecha_nacimiento: "2013-02-03", edad: 14, grupo_clave: "Sexto", grupo: "6°B", situacion: "EXTRAEDAD" },
      ]),
    })
  }),

  // Estudiantes fuera de matrícula (C.4.FUE.1).
  http.get("*/api/eval-col/informes-reportes/fuera-matricula/opciones", async () => {
    await delay(100)
    return HttpResponse.json({
      rows: [{ opciones: { establecimientos: [{ value: "1", label: "IE Central" }, { value: "2", label: "IE Sur" }], municipios: [{ value: "1", label: "Cartagena" }] } }],
    })
  }),

  http.post("*/api/eval-col/informes-reportes/fuera-matricula/query", async () => {
    await delay(150)
    const base = { municipio: "Cartagena", matricula_id: null, reserva_id: null, inscripcion_id: null, liberada_por_retiro: false }
    return HttpResponse.json({
      rows: conTotal([
        { ...base, clave: "M1", situacion: "RETIRADO", liberada_por_retiro: true, estudiante: "Ana Ruiz", grado: "Quinto", establecimiento_id: 1, origen: "IE Central", fecha: "2027-03-12", motivo: "Cambio de domicilio", matricula_id: 1 },
        { ...base, clave: "R2", situacion: "SIN_CONTINUIDAD", estudiante: "Luis Pérez", grado: "Séptimo", establecimiento_id: 2, origen: "IE Sur", fecha: "2027-12-02", motivo: "Sin cupo en el grado siguiente", reserva_id: 2 },
        { ...base, clave: "I3", situacion: "SIN_CUPO_PLATAFORMA", estudiante: "Sara Gil", grado: "Noveno", municipio: "Turbaco", establecimiento_id: 1, origen: "IE Central", fecha: "2027-12-05", motivo: "Ningún establecimiento con cupo", inscripcion_id: 3 },
      ]),
    })
  }),

  // Calidad de la información (C.4.CAL.1).
  http.post("*/api/eval-col/informes-reportes/calidad/query", async () => {
    await delay(150)
    const por = { C1: 4, C4: 12, C10: 6, C11: 15 }
    return HttpResponse.json({
      rows: conTotal([
        { hallazgo_id: 1, control: "C1", estudiante: "Ana Ruiz", establecimiento: "IE Central", dato: "Mismo nombre y fecha de nacimiento que otro estudiante", estado: "PENDIENTE", justificacion: null, corte: "2027-04-02", matricula_id: 1, por_control: por },
        { hallazgo_id: 2, control: "C4", estudiante: "Luis Pérez", establecimiento: "IE Central", dato: "14 años en Sexto", estado: "AJUSTADO", justificacion: null, corte: "2027-04-02", matricula_id: 2, por_control: por },
        { hallazgo_id: 3, control: "C10", estudiante: "Sara Gil", establecimiento: "IE Central", dato: "Sin boletín del año anterior", estado: "JUSTIFICADO", justificacion: "La estudiante llegó del exterior; el boletín está en trámite de apostilla.", corte: "2027-04-02", matricula_id: 3, por_control: por },
      ]),
    })
  }),

  http.get("*/api/eval-col/informes-reportes/calidad/:id/historial", async () => {
    await delay(100)
    return HttpResponse.json({
      rows: [
        { fecha: "2027-04-02T08:00:00", actor: "Sistema", estado: "PENDIENTE", texto: "Hallazgo generado con el corte del 02/04/2027: Pendiente." },
        { fecha: "2027-04-05T10:00:00", actor: "M. Gómez", estado: "JUSTIFICADO", texto: "Justificó el hallazgo." },
      ],
    })
  }),

  http.post("*/api/eval-col/informes-reportes/calidad/generar", async () => {
    await delay(300)
    return HttpResponse.json({ rows: [{ generacion: 1 }] })
  }),

  http.put("*/api/eval-col/informes-reportes/calidad/:id/estado", async () => {
    await delay(150)
    return HttpResponse.json({ rows: [] })
  }),

  // Graduación (C.4.GRA.1): los cuatro estudiantes del prototipo.
  // Certificados de culminación (C.4.CUL): grados de fin de nivel y lista.
  http.get("*/api/eval-col/informes-reportes/culminacion/grados/:periodo", async () => {
    await delay(150)
    return HttpResponse.json([
      { grado_id: 900, grado: "Transición", nivel: "PREESCOLAR" },
      { grado_id: 905, grado: "Quinto", nivel: "PRIMARIA" },
      { grado_id: 909, grado: "Noveno", nivel: "BASICA" },
    ])
  }),
  http.post("*/api/eval-col/informes-reportes/culminacion/query", async () => {
    await delay(300)
    const base = { generado: false, numero: null, generado_en: null, total_count: 3 }
    return HttpResponse.json([
      { ...base, matricula_id: 21, documento: "1098765721", estudiante: "Valentina Pardo Gómez", grado: "Noveno", grupo: "9°A", nivel: "BASICA", generado: true, numero: "0012", generado_en: "2027-12-03T10:00:00" },
      { ...base, matricula_id: 22, documento: "1098765722", estudiante: "Samuel Ortiz Rueda", grado: "Quinto", grupo: "5°B", nivel: "PRIMARIA" },
      { ...base, matricula_id: 23, documento: "1098765723", estudiante: "Emma Rojas Díaz", grado: "Transición", grupo: "TR-A", nivel: "PREESCOLAR" },
    ])
  }),
  // Actas de graduación (C.4.ACT): lista del año y graduados de un acta.
  http.post("*/api/eval-col/informes-reportes/graduacion/actas/query", async () => {
    await delay(300)
    return HttpResponse.json([
      { acta_id: 1, numero: "014", fecha: "2027-12-02", modalidad: "CEREMONIA", libro: 1, folio: 14, graduados: 3, emitida: true, total_count: 2 },
      { acta_id: 2, numero: "015", fecha: "2027-12-15", modalidad: "VENTANILLA", libro: 1, folio: 15, graduados: 1, emitida: false, total_count: 2 },
    ])
  }),
  http.get("*/api/eval-col/informes-reportes/graduacion/actas/:id/graduados", async () => {
    await delay(200)
    const titulo = "BACHILLER TÉCNICO CON ESPECIALIDAD EN SISTEMAS"
    return HttpResponse.json([
      { n: 1, matricula_id: 4, graduacion_id: 1, documento: "T.I. 1098765704", estudiante: "MATEO RÍOS CÁRDENAS", titulo, diploma: "0415", entrega: "2027-12-05" },
      { n: 2, matricula_id: 5, graduacion_id: 2, documento: "T.I. 1098765705", estudiante: "LAURA MÉNDEZ PARDO", titulo, diploma: "0416", entrega: null },
      { n: 3, matricula_id: 6, graduacion_id: 3, documento: "C.C. 1098765706", estudiante: "SOFÍA ARDILA ROJAS", titulo: "BACHILLER ACADÉMICO", diploma: null, entrega: null },
    ])
  }),
  http.post("*/api/eval-col/informes-reportes/graduacion/query", async () => {
    await delay(150)
    const base = { grupo: "11°A", requisitos: 5, faltan: null, graduacion_id: null, acta: null, fecha_grado: null, diploma: null, diploma_emitido: false, entrega: null }
    return HttpResponse.json({
      rows: conTotal([
        { ...base, matricula_id: 1, documento: "1098765701", estudiante: "Laura Méndez Ríos", estado: "Aprobado", cumplidos: 5 },
        { ...base, matricula_id: 2, documento: "1098765702", estudiante: "Camilo Andrés Pardo", estado: "Aprobado", cumplidos: 4, faltan: "Examen de Estado Saber 11" },
        { ...base, matricula_id: 3, documento: "1098765703", estudiante: "Sofía Lozano Díaz", estado: "Aprobado", cumplidos: 3, faltan: "Servicio social estudiantil (62 de 80 h); Estudios constitucionales (50 horas)" },
        { ...base, matricula_id: 4, documento: "1098765704", estudiante: "Mateo Ríos Cárdenas", estado: "Graduado", cumplidos: 5, graduacion_id: 1, acta: "014", fecha_grado: "2027-12-02", diploma: "0415", diploma_emitido: true, entrega: "2027-12-05" },
      ]),
    })
  }),

  http.get("*/api/eval-col/informes-reportes/graduacion/:id/requisitos", async () => {
    await delay(100)
    return HttpResponse.json({
      rows: [
        { orden: 1, codigo: "APROBAR", nombre: "Aprobar el último grado de la Media", cumplido: true, detalle: "del sistema", del_sistema: true },
        { orden: 2, codigo: "SERVICIO_SOCIAL", nombre: "Servicio social estudiantil", cumplido: true, detalle: "80 de 80 h", del_sistema: true },
        { orden: 3, codigo: "NIVELACIONES", nombre: "Sin áreas pendientes de nivelación", cumplido: true, detalle: "del sistema", del_sistema: true },
        { orden: 4, codigo: "CONSTITUCIONALES", nombre: "Estudios constitucionales (50 horas)", cumplido: true, detalle: "Cumplido", del_sistema: false },
        { orden: 11, codigo: "PROPIO_1", nombre: "Presentó la prueba Saber 11", cumplido: false, detalle: "Pendiente", del_sistema: false },
      ],
    })
  }),

  http.put("*/api/eval-col/informes-reportes/graduacion/requisitos", async () => {
    await delay(150)
    return HttpResponse.json({ rows: [{ matriculas: 1 }] })
  }),

  http.post("*/api/eval-col/informes-reportes/graduacion/registrar", async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as { IDS: number[] }
    return HttpResponse.json({ rows: body.IDS.map((id) => ({ matricula_id: id, graduado: id === 1, motivo: id === 1 ? null : "No cumple los requisitos" })) })
  }),

  http.put("*/api/eval-col/informes-reportes/graduacion/:id/:accion", async () => {
    await delay(150)
    return HttpResponse.json({ rows: [] })
  }),

  // Libro de registro (C.4.LIB.1c): libro y folios que se asignarían.
  http.post("*/api/eval-col/informes-reportes/libro-registro/previa", async () => {
    await delay(100)
    return HttpResponse.json({ rows: [{ libro: 5, folios: 2 }] })
  }),

  // Certificado de calificaciones (C.4.CER.1a): número que llevaría el definitivo.
  http.get("*/api/eval-col/informes-reportes/certificado-calificaciones/:id/previa", async () => {
    await delay(100)
    return HttpResponse.json({ rows: [{ numero: "CC-2027-0013", formativo: false }] })
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
