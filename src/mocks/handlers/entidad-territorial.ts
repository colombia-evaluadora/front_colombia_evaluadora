import { http, HttpResponse, delay } from "msw"

import type {
  CalendarioCobertura,
  ContextoTerritorial,
  CupoContratadoGrupo,
  EnRedistribucion,
  OpcionUbicacion,
  Orientacion,
  UbicadoSinGrupo,
  EstadoCalendario,
  ProyeccionDetalle,
  ProyeccionEstablecimiento,
  SeguimientoDetalle,
  SeguimientoEstablecimiento,
  SeguimientoFila,
  SolicitudRetiro,
} from "@/features/coverage/inscripcion-reservas/api/types/territorial"

// Pestaña Entidad territorial (Sección 3.10) con la forma de los endpoints eval-col: `{ rows: [{ datos }] }`.
const BASE = "*/api/eval-col/cobertura-academica/entidad-territorial"

const contexto: ContextoTerritorial = {
  rol: "Administrador territorial",
  establecimientos: [
    { id: 1, nombre: "IE Central" },
    { id: 2, nombre: "IE Norte" },
    { id: 3, nombre: "IE San José" },
    { id: 4, nombre: "Colegio Nuevo Horizonte", noOficial: true, oferente: false },
    { id: 6, nombre: "Colegio Los Álamos", noOficial: true, oferente: true },
    { id: 7, nombre: "Gimnasio Altair", noOficial: true, oferente: true },
  ],
  // El mock entra como Administrador territorial para mostrar todo el calendario.
  puedeGestionarCalendario: true,
}

const GRADOS_MOCK = [
  "Transición",
  "1°",
  "2°",
  "3°",
  "4°",
  "5°",
  "6°",
  "7°",
  "8°",
  "9°",
  "10°",
  "11°",
]

/** Ver detalle: dos sedes por grado; los grados con déficit de la lista quedan con cupo libre negativo. */
function proyeccionDetalle(p: ProyeccionEstablecimiento): ProyeccionDetalle {
  const grados = GRADOS_MOCK.slice(0, p.grados)
  const porGrupo = Math.max(1, Math.round(p.cupoTotal / Math.max(p.grupos, 1)))
  return {
    ...p,
    periodo: "Período 2027",
    anio: 2027,
    detalle: grados.map((grado, i) => {
      const grupos = 2
      const cupo = grupos * porGrupo
      const deficit = i === 1 && p.gradosConDeficit > 0
      const vienen = deficit ? cupo + 10 : Math.max(0, cupo - 3 - ((i * 7) % 12))
      const distinta = p.metodologiaDistinta && i === 4 ? p.metodologiaDistinta : null
      const mitad = Math.round(cupo / 2)
      const vienenS1 = deficit ? 0 : Math.round(vienen / 2)
      return {
        codigo: String(i),
        grado,
        grupos,
        metodologias: distinta
          ? [
              { nombre: distinta, grupos: 1 },
              { nombre: "Tradicional", grupos: 1 },
            ]
          : [{ nombre: "Tradicional", grupos }],
        cupoProyectado: cupo,
        vienen,
        repitentes: null,
        prematriculasContinua: Math.max(0, vienen - 6),
        cupoLibre: cupo - vienen,
        sedes: [
          {
            sede: "Sede principal",
            cupoProyectado: mitad,
            vienen: vienenS1,
            pasanOtraSede: Math.max(0, vienenS1 - mitad),
          },
          {
            sede: "Sede 2",
            cupoProyectado: cupo - mitad,
            vienen: vienen - vienenS1,
            pasanOtraSede: Math.max(0, vienen - vienenS1 - (cupo - mitad)),
          },
        ],
      }
    }),
  }
}

const proyeccionDb: ProyeccionEstablecimiento[] = [
  {
    id: 1,
    establecimientoId: 1,
    establecimiento: "IE Central",
    grados: 11,
    grupos: 24,
    cupoTotal: 720,
    gradosConDeficit: 0,
    metodologiaDistinta: null,
    estado: "APROBADA",
    observacion: null,
  },
  {
    id: 2,
    establecimientoId: 2,
    establecimiento: "IE Norte",
    grados: 9,
    grupos: 18,
    cupoTotal: 540,
    gradosConDeficit: 1,
    metodologiaDistinta: "Aceleración",
    estado: "PROYECTADA",
    observacion: null,
  },
  {
    id: 3,
    establecimientoId: 3,
    establecimiento: "IE San José",
    grados: 11,
    grupos: 22,
    cupoTotal: 660,
    gradosConDeficit: 0,
    metodologiaDistinta: null,
    estado: "PROYECTADA",
    observacion: null,
  },
]

const calendariosDb: CalendarioCobertura[] = [
  {
    id: 1,
    anio: 2027,
    modalidad: "Anual",
    ciclo: 1,
    inicioInscripcion: "2026-10-01",
    fechaCierreInscripcion: "2026-11-30",
    fechaLiberacionReservas: "2027-01-15",
    fechaLimiteMatricula: "2027-01-31",
    corteReporte: "2027-02-28",
    plazoSolicitudRetiro: 5,
    soporte: "Resolucion_calendario_2027.pdf",
    estado: "PUBLICADO",
  },
  {
    id: 2,
    anio: 2027,
    modalidad: "Semestral",
    ciclo: 2,
    inicioInscripcion: "2027-05-01",
    fechaCierreInscripcion: "2027-06-30",
    fechaLiberacionReservas: null,
    fechaLimiteMatricula: "2027-07-20",
    corteReporte: "2027-02-28",
    plazoSolicitudRetiro: 5,
    soporte: null,
    estado: "BORRADOR",
  },
  {
    id: 3,
    anio: 2026,
    modalidad: "Anual",
    ciclo: 1,
    inicioInscripcion: "2025-10-01",
    fechaCierreInscripcion: "2025-12-15",
    fechaLiberacionReservas: "2026-01-15",
    fechaLimiteMatricula: "2026-01-31",
    corteReporte: null,
    plazoSolicitudRetiro: 5,
    soporte: null,
    estado: "FINALIZADO",
  },
]

const conDatos = (datos: unknown) => HttpResponse.json({ rows: [{ datos }] })
const error = (status: number, message: string) => HttpResponse.json({ message }, { status })
type CuerpoPagina = { FILTERS?: Record<string, unknown>; PAGEINDEX?: number; PAGESIZE?: number }
/** Página de un listado como la arma el back: { total, filas }; sin PAGESIZE, todas las filas. */
const pagina = <T,>(filas: T[], b: CuerpoPagina) => ({
  total: filas.length,
  filas: b.PAGESIZE
    ? filas.slice((b.PAGEINDEX ?? 0) * b.PAGESIZE, ((b.PAGEINDEX ?? 0) + 1) * b.PAGESIZE)
    : filas,
})
const texto = (f: FormData, k: string) => {
  const v = f.get(k)
  return typeof v === "string" && v !== "" ? v : null
}

/** Mismas reglas que el formulario: fechas en orden y plazo de 1 a 30 días hábiles. */
function validar(c: Omit<CalendarioCobertura, "id" | "soporte">): string | null {
  if (c.fechaCierreInscripcion <= c.inicioInscripcion)
    return "La Fecha de cierre de inscripción debe ser posterior al inicio de la inscripción."
  if (c.fechaLimiteMatricula <= c.fechaCierreInscripcion)
    return "La Fecha límite de matrícula debe ser posterior al cierre de inscripción."
  if (
    c.fechaLiberacionReservas &&
    (c.fechaLiberacionReservas < c.fechaCierreInscripcion ||
      c.fechaLiberacionReservas > c.fechaLimiteMatricula)
  ) {
    return "La Fecha de liberación de reservas debe estar entre el cierre de inscripción y la Fecha límite de matrícula."
  }
  if (!(c.plazoSolicitudRetiro >= 1 && c.plazoSolicitudRetiro <= 30))
    return "El plazo de atención de la solicitud de retiro es de 1 a 30 días hábiles."
  return null
}

function leer(f: FormData): Omit<CalendarioCobertura, "id" | "soporte"> {
  return {
    anio: Number(texto(f, "ANIO")),
    modalidad: texto(f, "MODALIDAD") ?? "",
    ciclo: Number(texto(f, "CICLO")),
    inicioInscripcion: texto(f, "INICIO_INSCRIPCION") ?? "",
    fechaCierreInscripcion: texto(f, "FECHA_CIERRE_INSCRIPCION") ?? "",
    fechaLiberacionReservas: texto(f, "FECHA_LIBERACION_RESERVAS"),
    fechaLimiteMatricula: texto(f, "FECHA_LIMITE_MATRICULA") ?? "",
    corteReporte: texto(f, "CORTE_REPORTE"),
    plazoSolicitudRetiro: Number(texto(f, "PLAZO_SOLICITUD_RETIRO")),
    estado: (texto(f, "ESTADO") ?? "BORRADOR") as EstadoCalendario,
  }
}

const repetido = (c: { anio: number; modalidad: string; ciclo: number }, id?: number) =>
  calendariosDb.some(
    (x) => x.id !== id && x.anio === c.anio && x.modalidad === c.modalidad && x.ciclo === c.ciclo,
  )

const nombreArchivo = (f: FormData, k: string) => {
  const v = f.get(k)
  return v instanceof File ? v.name : null
}

const seguimientoDb: SeguimientoEstablecimiento[] = [
  {
    establecimientoId: 1,
    establecimiento: "IE Central",
    cursando: 760,
    reservadas: 740,
    sinContinuidad: 3,
    omitidos: 17,
    trasladosPendientes: 0,
    diasMasAntiguo: null,
  },
  {
    establecimientoId: 5,
    establecimiento: "IE Sur",
    cursando: 540,
    reservadas: 498,
    sinContinuidad: 7,
    omitidos: 35,
    trasladosPendientes: 2,
    diasMasAntiguo: 6,
  },
  {
    establecimientoId: 3,
    establecimiento: "IE San José",
    cursando: 640,
    reservadas: 615,
    sinContinuidad: 0,
    omitidos: 25,
    trasladosPendientes: 1,
    diasMasAntiguo: 2,
  },
  {
    establecimientoId: 2,
    establecimiento: "IE Norte",
    cursando: 480,
    reservadas: 455,
    sinContinuidad: 0,
    omitidos: 25,
    trasladosPendientes: 0,
    diasMasAntiguo: null,
  },
]

const GRADOS = ["Transición", "1°", "2°", "3°", "4°", "5°", "6°", "7°", "8°", "9°", "10°", "11°"]
const SEDES = ["Sede principal", "Sede 2"]
const CAMPOS = [
  "cursando",
  "reservadas",
  "sinContinuidad",
  "omitidos",
  "trasladosPendientes",
] as const

/** Reparte n en k partes que suman n (las primeras reciben el sobrante). */
const repartir = (n: number, k: number) =>
  Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0))

/** Grado × sede con los totales del establecimiento: por grado y por sede suman lo mismo. */
function detalleSeguimiento(ee: SeguimientoEstablecimiento): SeguimientoDetalle {
  const celdas = GRADOS.map((grado) =>
    SEDES.map((sede) => ({ grado, sede }) as Record<string, number | string>),
  )
  for (const c of CAMPOS) {
    repartir(ee[c], GRADOS.length).forEach((porGrado, g) => {
      // La sede principal concentra cerca de tres cuartos.
      const principal = Math.ceil(porGrado * 0.72)
      celdas[g][0][c] = principal
      celdas[g][1][c] = porGrado - principal
    })
  }
  const fila = (nombre: string, xs: Record<string, number | string>[]): SeguimientoFila => ({
    nombre,
    ...(Object.fromEntries(
      CAMPOS.map((c) => [c, xs.reduce((a, x) => a + Number(x[c]), 0)]),
    ) as Omit<SeguimientoFila, "nombre">),
  })
  return {
    establecimientoId: ee.establecimientoId,
    establecimiento: ee.establecimiento,
    periodo: "Período 2027",
    porGrado: GRADOS.map((grado, g) => ({
      ...fila(grado, celdas[g]),
      hijos: SEDES.map((sede, s) => fila(sede, [celdas[g][s]])),
    })),
    porSede: SEDES.map((sede, s) => ({
      ...fila(
        sede,
        celdas.map((x) => x[s]),
      ),
      hijos: GRADOS.map((grado, g) => fila(grado, [celdas[g][s]])),
    })),
  }
}

const redistribucionDb: EnRedistribucion[] = (
  [
    [
      "00398",
      "Sara Gil Mena",
      "1°",
      "Mañana",
      "IE San José",
      true,
      0.8,
      "IE Central · Sede Norte",
      3,
    ],
    [
      "00405",
      "Pablo Ríos Lara",
      "2°",
      "Tarde",
      "Colegio Nuevo Horizonte",
      false,
      1.4,
      "IE Central · Sede Principal",
      5,
    ],
    [
      "00377",
      "Ana Lucía Prada",
      "Transición",
      "Mañana",
      "IE La Esperanza",
      true,
      2.2,
      "IE San José · IE Central",
      2,
    ],
    ["00410", "Kevin Mora Díaz", "6°", "Mañana", "IE San José", false, null, null, 9],
    [
      "00352",
      "Lina Toro Paz",
      "3°",
      "Tarde",
      "IE San José",
      true,
      null,
      "IE San José · Sede Norte",
      1,
    ],
    [
      "00369",
      "Mateo Quintero Ruiz",
      "1°",
      "Mañana",
      "Colegio Los Álamos",
      false,
      3.6,
      "IE Central · IE Central",
      4,
    ],
    [
      "00412",
      "Sofía Navas Ortiz",
      "4°",
      "Mañana",
      "IE Norte",
      true,
      1.1,
      "IE Norte · Sede Única",
      2,
    ],
    [
      "00415",
      "Juan Pablo Leal",
      "5°",
      "Tarde",
      "IE Central",
      false,
      2.7,
      "IE San José · Sede Única",
      6,
    ],
    [
      "00418",
      "Isabella Rey Cano",
      "Transición",
      "Mañana",
      "Colegio Nuevo Horizonte",
      true,
      0.5,
      "IE Central · Sede Norte",
      1,
    ],
    [
      "00420",
      "Emiliano Vega Sol",
      "7°",
      "Mañana",
      "IE La Esperanza",
      false,
      4.2,
      "IE Norte · Sede Única",
      7,
    ],
    [
      "00423",
      "Valentina Cruz Mar",
      "2°",
      "Tarde",
      "IE San José",
      true,
      1.9,
      "IE Central · Sede Principal",
      3,
    ],
    ["00427", "Samuel Ortega Gil", "8°", "Mañana", "IE Norte", false, null, null, 11],
    [
      "00430",
      "Mariana Paz León",
      "1°",
      "Tarde",
      "Colegio Los Álamos",
      true,
      0.9,
      "IE Central · Sede Norte",
      2,
    ],
    [
      "00433",
      "Tomás Ríos Díaz",
      "3°",
      "Tarde",
      "IE Central",
      true,
      1.3,
      "IE San José · Sede Norte",
      4,
    ],
  ] as const
).map(([numero, aspirante, grado, jornada, origen, area, km, cercana, dias], i) => ({
  id: i + 1,
  numero,
  aspirante,
  grado,
  modalidad: "Anual",
  jornada,
  situacionEdad: i % 5 === 3 ? "EXTRAEDAD" : "EN_EDAD",
  establecimientoOrigen: origen,
  dentroAreaInfluencia: area,
  distanciaKm: km,
  sedeCercana: cercana,
  diasEnRedistribucion: dias,
}))

const OPCIONES_UBICACION: Omit<OpcionUbicacion, "jornadaPedida">[] = [
  {
    id: 1,
    establecimiento: "IE Central",
    sede: "Sede Norte",
    jornada: "Mañana",
    dentroAreaInfluencia: true,
    distanciaKm: 0.8,
    cupoOficialLibre: 3,
    cupoContratadoLibre: null,
  },
  {
    id: 2,
    establecimiento: "IE Central",
    sede: "Sede Principal",
    jornada: "Mañana",
    dentroAreaInfluencia: false,
    distanciaKm: 2.1,
    cupoOficialLibre: 5,
    cupoContratadoLibre: 2,
  },
  {
    id: 3,
    establecimiento: "IE San José",
    sede: "Sede Única",
    jornada: "Mañana",
    dentroAreaInfluencia: false,
    distanciaKm: 3.4,
    cupoOficialLibre: 1,
    cupoContratadoLibre: null,
  },
  {
    id: 4,
    establecimiento: "IE Central",
    sede: "Sede Norte",
    jornada: "Tarde",
    dentroAreaInfluencia: true,
    distanciaKm: 0.8,
    cupoOficialLibre: 4,
    cupoContratadoLibre: null,
  },
]

const ubicadosDb: UbicadoSinGrupo[] = (
  [
    ["00341", "Camila Ortiz Vega", "IE Central", "Sede Norte", "Mañana", "OFICIAL", true],
    ["00356", "Julián Pardo Ríos", "IE Central", "Sede Principal", "Tarde", "CONTRATADO", false],
    ["00362", "Daniela Suárez Gil", "IE San José", "Sede Única", "Mañana", "OFICIAL", true],
    ["00371", "Tomás Herrera Lugo", "IE Central", "Sede Norte", "Mañana", "OFICIAL", false],
    ["00388", "Valeria Castro Mesa", "IE San José", "Sede Única", "Tarde", "CONTRATADO", true],
    ["00393", "Samuel Rojas Pinto", "IE Central", "Sede Principal", "Tarde", "OFICIAL", true],
  ] as const
).map(([numero, aspirante, establecimiento, sede, jornada, tipoCupo, confirmada], i) => ({
  id: 100 + i,
  numero,
  aspirante,
  grado: "1°",
  modalidad: "Anual",
  establecimiento,
  sede,
  jornada,
  tipoCupo,
  confirmadaAcudiente: confirmada,
  fechaReserva: `2027-01-${String(12 + i).padStart(2, "0")}`,
  diasParaLimite: 8 - i,
  estado: confirmada ? "RESERVADA" : "PENDIENTE_CONFIRMACION",
}))

const cuposContratadosDb: CupoContratadoGrupo[] = (
  [
    [1, "Colegio Los Álamos", "Sede Única", "Mañana", "1°", "1A", 35, 10, 6, 1, 20],
    [2, "Colegio Los Álamos", "Sede Única", "Mañana", "1°", "1B", 35, 8, 8, 0, 25],
    [3, "Gimnasio Altair", "Sede Principal", "Tarde", "6°", "6A", 40, 12, 5, 2, 20],
    [4, "Gimnasio Altair", "Sede Principal", "Tarde", "6°", "6B", 40, 0, 0, 0, 30],
  ] as const
).map(
  ([
    id,
    establecimiento,
    sede,
    jornada,
    grado,
    grupo,
    cupo,
    cupoContratado,
    ocupados,
    retenidos,
    propias,
  ]) => ({
    id,
    establecimiento,
    sede,
    jornada,
    grado,
    grupo,
    cupo,
    cupoContratado,
    ocupadosContratados: ocupados,
    retenidos,
    propias,
    libresContratados: cupoContratado - ocupados - retenidos,
  }),
)

const orientacionesDb: Orientacion[] = [
  {
    id: 1,
    establecimientoId: 1,
    establecimiento: "IE Central",
    tema: "Extraedad",
    orientacion: "Revisar la ubicación de los estudiantes en extraedad de 6° antes del cierre.",
    estado: "ENVIADA",
    fechaEnvio: "2026-11-10",
    enviadaPor: "Ana Gómez (Supervisora)",
    fechaAtencion: null,
    alerta: null,
    respuesta: null,
  },
  {
    id: 2,
    establecimientoId: 2,
    establecimiento: "Sede Norte",
    tema: "Cobertura",
    orientacion:
      "Ampliar la oferta de 1° en la jornada de la mañana: hay 12 aspirantes en redistribución.",
    estado: "ATENDIDA",
    fechaEnvio: "2026-11-02",
    enviadaPor: "Luis Pardo (Administrador)",
    fechaAtencion: "2026-11-04",
    alerta: "continuidad",
    respuesta: "Se abrió el grupo 1C con 30 cupos en la jornada de la mañana.",
  },
  {
    id: 3,
    establecimientoId: 3,
    establecimiento: "IE San José",
    tema: "Permanencia",
    orientacion:
      "Hacer seguimiento a los estudiantes con inasistencia reiterada antes de reservar su cupo.",
    estado: "ENVIADA",
    fechaEnvio: "2026-10-28",
    enviadaPor: "Ana Gómez (Supervisora)",
    fechaAtencion: null,
    alerta: null,
    respuesta: null,
  },
]

const MOTIVO_NOVEDAD = "Requerimiento de otra entidad territorial o establecimiento"
const solicitudesRetiroDb: SolicitudRetiro[] = (
  [
    [1, "Ana Ruiz", "IE Central", "4°A", "IE Sur", "4°B", "2027-01-12", 3, "PENDIENTE", null],
    [2, "Luis Mora", "IE Norte", "9°B", "IE Sur", "9°A", "2027-01-05", 10, "VENCIDA", null],
    [3, "Rosa Peña", "IE Central", "6°A", "IE Este", "5°B", "2027-01-08", null, "OBJETADA", null],
    [
      4,
      "Camila Soto",
      "IE Central",
      "2°A",
      "IE Este",
      "2°C",
      "2027-01-02",
      4,
      "POR_ANULAR_DESTINO",
      null,
    ],
    [
      5,
      "Tomás Gil",
      "IE Norte",
      "7°A",
      "IE Sur",
      "7°B",
      "2027-01-04",
      null,
      "ATENDIDA",
      "2027-01-07",
    ],
    [
      6,
      "Diego Pardo",
      "IE Central",
      "3°B",
      "IE Este",
      "3°A",
      "2026-12-28",
      null,
      "CERRADA_SIN_RETIRO",
      "2027-01-12",
    ],
    [
      7,
      "Julián Rey",
      "IE Norte",
      "10°A",
      "IE Este",
      "10°B",
      "2026-12-30",
      8,
      "POR_ANULAR_DESTINO",
      null,
    ],
  ] as const
).map(([id, estudiante, origen, go, solicitante, gs, fecha, dias, estado, resolucion]) => ({
  id,
  estudiante,
  origen,
  origenDetalle: `${origen} · ${go} · 2027`,
  solicitante,
  solicitanteDetalle: `${solicitante} · ${gs} · 2027`,
  fechaSolicitud: fecha,
  plazoDiasHabiles: 5,
  venceEl: "2027-01-15",
  diasSinRespuesta: dias,
  estado,
  fechaResolucion: resolucion,
  evidencia:
    id === 2 ? "cert.pdf" : `matricula-${solicitante.toLowerCase().replaceAll(" ", "-")}.pdf`,
  motivoNovedad: MOTIVO_NOVEDAD,
  objecion:
    estado === "OBJETADA"
      ? {
          autor: `M. Gómez (Administrador del establecimiento) · ${origen}`,
          fecha: "2027-01-10",
          texto: "La estudiante sigue asistiendo.",
        }
      : null,
  avisos: [
    {
      fecha,
      autor: "Sistema",
      texto: `Solicitud creada. Aviso al Administrador y al Gestor administrativo de ${origen} y al Administrador territorial.`,
    },
    {
      fecha: "2027-01-09",
      autor: "Sistema",
      texto: "Alerta diaria en la campana: el origen no ha respondido.",
    },
    ...(estado === "OBJETADA"
      ? [
          {
            fecha: "2027-01-10",
            autor: origen,
            texto: "Objetó la solicitud: la estudiante sigue asistiendo.",
          },
          {
            fecha: "2027-01-10",
            autor: "Sistema",
            texto:
              "Aviso al Administrador territorial: solicitud objetada, pendiente de su decisión.",
          },
        ]
      : []),
  ],
}))

export const entidadTerritorialHandlers = [
  http.post(`${BASE}/calendarios/:id/publicar`, async ({ params }) => {
    await delay(300)
    const c = calendariosDb.find((x) => x.id === Number(params.id))
    if (!c) return error(404, "No se encontró el calendario.")
    if (c.estado !== "BORRADOR") return error(400, "Solo se publica un calendario en Borrador.")
    c.estado = "PUBLICADO"
    return conDatos(c.id)
  }),

  http.post(`${BASE}/proyeccion/:id/aprobar`, async ({ params }) => {
    await delay(300)
    const p = proyeccionDb.find((x) => x.id === Number(params.id))
    if (!p) return error(404, "No se encontró la proyección.")
    Object.assign(p, { estado: "APROBADA", observacion: null })
    return conDatos(p.id)
  }),

  http.post(`${BASE}/proyeccion/:id/devolver`, async ({ params, request }) => {
    await delay(300)
    const p = proyeccionDb.find((x) => x.id === Number(params.id))
    if (!p) return error(404, "No se encontró la proyección.")
    const { OBSERVACION } = (await request.json()) as { OBSERVACION: string }
    const o = OBSERVACION?.trim() ?? ""
    if (o.length < 10 || o.length > 500)
      return error(400, "La observación debe tener entre 10 y 500 caracteres.")
    Object.assign(p, { estado: "PROYECTADA", observacion: o })
    return conDatos(p.id)
  }),

  http.get(`${BASE}/contexto`, async () => {
    await delay(100)
    return conDatos(contexto)
  }),

  // Listado paginado en el back: { total, filas }; sin PAGESIZE devuelve todo.
  http.post(`${BASE}/consulta/cupos-contratados`, async ({ request }) => {
    await delay(200)
    const b = (await request.json()) as CuerpoPagina
    const q = String(b.FILTERS?.SEARCH ?? "").toLowerCase()
    const ee = contexto.establecimientos.find((e) => e.id === Number(b.FILTERS?.FK_ESTABLECIMIENTO))
    const oferentes = contexto.establecimientos.filter((e) => e.oferente).map((e) => e.nombre)
    return conDatos(
      pagina(
        cuposContratadosDb.filter(
          (c) =>
            oferentes.includes(c.establecimiento) &&
            (!ee || c.establecimiento === ee.nombre) &&
            (!q || c.establecimiento.toLowerCase().includes(q) || c.grupo.toLowerCase().includes(q)),
        ),
        b,
      ),
    )
  }),

  http.post(`${BASE}/oferentes`, async ({ request }) => {
    await delay(300)
    const ids = JSON.parse(
      String(((await request.json()) as Record<string, unknown>).ESTABLECIMIENTOS ?? "[]"),
    ) as number[]
    const oficial = contexto.establecimientos.find((e) => ids.includes(e.id) && !e.noOficial)
    if (oficial)
      return error(
        400,
        `${oficial.nombre} no es del sector No oficial: no puede ser oferente de cupo contratado.`,
      )
    const conCupo = contexto.establecimientos.find(
      (e) =>
        e.oferente &&
        !ids.includes(e.id) &&
        cuposContratadosDb.some((c) => c.establecimiento === e.nombre && c.cupoContratado > 0),
    )
    if (conCupo)
      return error(
        409,
        `${conCupo.nombre} tiene grupos con cupo contratado: déjelos en 0 antes de quitarlo de los oferentes.`,
      )
    for (const e of contexto.establecimientos) e.oferente = ids.includes(e.id)
    return conDatos(ids.length)
  }),

  http.post(`${BASE}/calendarios/:id/inscripcion-en-linea`, async ({ params, request }) => {
    await delay(300)
    const c = calendariosDb.find((x) => x.id === Number(params.id))
    if (!c) return error(404, "No se encontró el calendario.")
    if (c.estado !== "PUBLICADO")
      return error(
        400,
        "La inscripción en línea solo se habilita o suspende con un calendario Publicado.",
      )
    const b = (await request.json()) as Record<string, unknown>
    if (b.ACCION !== "HABILITAR" && b.ACCION !== "SUSPENDER")
      return error(400, "La acción es Habilitar o Suspender.")
    if (!String(b.MOTIVO ?? "").trim()) return error(400, "El motivo es obligatorio.")
    const ees = JSON.parse(String(b.ESTABLECIMIENTOS ?? "[]")) as number[]
    if (!ees.length) return error(400, "Elija al menos un establecimiento.")
    return conDatos({ id: 1, establecimientos: ees.length, periodos: ees.length, omitidos: 0 })
  }),

  http.post(`${BASE}/cupos-contratados/:id`, async ({ params, request }) => {
    await delay(300)
    const g = cuposContratadosDb.find((x) => x.id === Number(params.id))
    if (!g) return error(404, "No se encontró el grupo.")
    const n = Number(((await request.json()) as Record<string, unknown>).CUPO_CONTRATADO)
    const minimo = g.ocupadosContratados + g.retenidos
    const maximo = Math.max(g.cupo - g.propias, 0)
    if (!Number.isInteger(n) || n < minimo)
      return error(
        400,
        `El cupo contratado no puede ser menor que los ${minimo} ya asignados (ocupados y retenidos).`,
      )
    if (n > maximo)
      return error(
        400,
        `El cupo contratado no puede superar ${maximo}: el grupo tiene ${g.cupo} cupos y ${g.propias} reservas o matrículas propias.`,
      )
    g.cupoContratado = n
    g.libresContratados = n - minimo
    return conDatos(g.id)
  }),

  http.post(`${BASE}/consulta/redistribucion`, async ({ request }) => {
    await delay(200)
    const b = (await request.json()) as CuerpoPagina
    const q = String(b.FILTERS?.SEARCH ?? "").toLowerCase()
    const area = b.FILTERS?.AREA
    const id = b.FILTERS?.ID
    return conDatos(
      pagina(
        redistribucionDb.filter(
          (r) =>
            (id == null || r.id === Number(id)) &&
            (!q || r.numero.includes(q) || r.aspirante.toLowerCase().includes(q)) &&
            (!area || r.dentroAreaInfluencia === (area === "S")),
        ),
        b,
      ),
    )
  }),

  http.get(`${BASE}/redistribucion/:id/opciones`, async ({ params }) => {
    await delay(200)
    const r = redistribucionDb.find((x) => x.id === Number(params.id))
    if (!r) return error(404, "La inscripción ya no está en redistribución.")
    return conDatos(
      OPCIONES_UBICACION.map((o) => ({ ...o, jornadaPedida: o.jornada === r.jornada })),
    )
  }),

  http.post(`${BASE}/redistribucion/ubicar`, async ({ request }) => {
    await delay(400)
    const b = (await request.json()) as Record<string, unknown>
    const ids = JSON.parse(String(b.INSCRIPCIONES ?? "[]")) as number[]
    // Quien ya no está en redistribución no se incluye y se informa.
    const filas = redistribucionDb.filter((x) => ids.includes(x.id))
    if (!filas.length)
      return error(
        400,
        "Ninguna de las inscripciones sigue en redistribución: quizá ya se ubicaron.",
      )
    const omitidos = ids
      .filter((id) => !filas.some((f) => f.id === id))
      .map((id) => String(id).padStart(5, "0"))
    const opcion =
      b.FK_OPCION == null ? null : OPCIONES_UBICACION.find((o) => o.id === Number(b.FK_OPCION))
    if (b.FK_OPCION != null && !opcion) return error(400, "La opción elegida ya no existe.")
    if (b.FK_OPCION == null && filas.some((f) => !f.sedeCercana))
      return error(
        400,
        "Una de las inscripciones no tiene una sede con cupo cercana: ubíquela una por una.",
      )
    const contratado = b.TIPO_CUPO === "CONTRATADO"
    if (
      opcion &&
      (contratado ? (opcion.cupoContratadoLibre ?? 0) : opcion.cupoOficialLibre) < filas.length
    )
      return error(400, "La opción elegida no tiene cupo libre de ese tipo.")
    const requiere = b.REQUIERE_CONFIRMACION === "S"
    for (const f of filas) {
      const [establecimiento, sede] = (
        opcion ? `${opcion.establecimiento} · ${opcion.sede}` : f.sedeCercana!
      ).split(" · ")
      ubicadosDb.unshift({
        id: Math.max(0, ...ubicadosDb.map((u) => u.id)) + 1,
        numero: f.numero,
        aspirante: f.aspirante,
        grado: f.grado,
        modalidad: f.modalidad,
        establecimiento,
        sede,
        jornada: opcion?.jornada ?? f.jornada,
        tipoCupo: contratado ? "CONTRATADO" : "OFICIAL",
        confirmadaAcudiente: requiere ? false : null,
        fechaReserva: new Date().toISOString().slice(0, 10),
        diasParaLimite: 10,
        estado: requiere ? "PENDIENTE_CONFIRMACION" : "RESERVADA",
      })
      redistribucionDb.splice(redistribucionDb.indexOf(f), 1)
    }
    return conDatos({ ubicados: filas.length, omitidos })
  }),

  http.get(`${BASE}/ubicados`, async () => {
    await delay(200)
    return conDatos(ubicadosDb)
  }),

  http.post(`${BASE}/ubicados/:id/liberar`, async ({ params, request }) => {
    await delay(300)
    const i = ubicadosDb.findIndex((x) => x.id === Number(params.id))
    if (i < 0) return error(404, "La ubicación ya fue liberada.")
    const motivo = String(((await request.json()) as Record<string, unknown>).MOTIVO ?? "").trim()
    if (motivo.length < 10 || motivo.length > 500)
      return error(400, "El motivo debe tener entre 10 y 500 caracteres.")
    const [u] = ubicadosDb.splice(i, 1)
    // Vuelve a En redistribución.
    redistribucionDb.push({
      id: Math.max(0, ...redistribucionDb.map((x) => x.id)) + 1,
      numero: u.numero,
      aspirante: u.aspirante,
      grado: u.grado,
      modalidad: u.modalidad,
      jornada: u.jornada,
      situacionEdad: "EN_EDAD",
      establecimientoOrigen: u.establecimiento,
      dentroAreaInfluencia: false,
      distanciaKm: null,
      sedeCercana: null,
      diasEnRedistribucion: 0,
    })
    return conDatos(u.id)
  }),

  http.get(`${BASE}/seguimiento`, async () => {
    await delay(200)
    return conDatos(seguimientoDb)
  }),

  http.get(`${BASE}/seguimiento/:id`, async ({ params }) => {
    await delay(200)
    const ee = seguimientoDb.find((x) => x.establecimientoId === Number(params.id))
    if (!ee) return error(404, "El establecimiento no está en su alcance.")
    return conDatos(detalleSeguimiento(ee))
  }),

  http.get(`${BASE}/solicitudes-retiro`, async () => {
    await delay(200)
    return conDatos(solicitudesRetiroDb)
  }),

  http.post(`${BASE}/solicitudes-retiro/:id/registrar-retiro`, async ({ params }) => {
    await delay(300)
    const r = solicitudesRetiroDb.find((x) => x.id === Number(params.id))
    if (!r) return error(404, "No se encontró la solicitud.")
    if (r.estado !== "VENCIDA" && r.estado !== "OBJETADA")
      return error(400, "Solo se decide una solicitud Vencida u Objetada.")
    const hoy = new Date().toISOString().slice(0, 10)
    Object.assign(r, { estado: "ATENDIDA", fechaResolucion: hoy, diasSinRespuesta: null })
    r.avisos.push({
      fecha: hoy,
      autor: "Administrador territorial",
      texto: `Registró el retiro en ${r.origen}. Aviso a ${r.origen} y ${r.solicitante}.`,
    })
    return conDatos(r.id)
  }),

  http.post(`${BASE}/solicitudes-retiro/:id/cerrar`, async ({ params, request }) => {
    await delay(300)
    const r = solicitudesRetiroDb.find((x) => x.id === Number(params.id))
    if (!r) return error(404, "No se encontró la solicitud.")
    if (r.estado !== "VENCIDA" && r.estado !== "OBJETADA")
      return error(400, "Solo se decide una solicitud Vencida u Objetada.")
    const motivo = String(((await request.json()) as Record<string, unknown>).MOTIVO ?? "").trim()
    if (motivo.length < 10 || motivo.length > 500)
      return error(400, "El motivo debe tener entre 10 y 500 caracteres.")
    const hoy = new Date().toISOString().slice(0, 10)
    Object.assign(r, { estado: "POR_ANULAR_DESTINO", diasSinRespuesta: 0 })
    r.avisos.push({
      fecha: hoy,
      autor: "Administrador territorial",
      texto: `Cerró sin retiro: ${motivo} Aviso a ${r.solicitante} para que anule la matrícula.`,
    })
    return conDatos(r.id)
  }),

  http.get(`${BASE}/orientaciones`, async () => {
    await delay(200)
    return conDatos([...orientacionesDb].sort((a, b) => b.fechaEnvio.localeCompare(a.fechaEnvio)))
  }),

  http.post(`${BASE}/orientaciones`, async ({ request }) => {
    await delay(300)
    const b = (await request.json()) as Record<string, unknown>
    const texto = String(b.ORIENTACION ?? "").trim()
    const id = Number(b.FK_ESTABLECIMIENTO)
    const ee =
      contexto.establecimientos.find((x) => x.id === id)?.nombre ??
      seguimientoDb.find((x) => x.establecimientoId === id)?.establecimiento
    if (!ee) return error(400, "Elija un establecimiento de su alcance.")
    if (!b.TEMA) return error(400, "El tema es obligatorio.")
    if (texto.length < 10 || texto.length > 1000)
      return error(400, "La orientación debe tener entre 10 y 1000 caracteres.")
    const nueva: Orientacion = {
      id: Math.max(0, ...orientacionesDb.map((o) => o.id)) + 1,
      establecimientoId: id,
      establecimiento: ee,
      tema: String(b.TEMA),
      orientacion: texto,
      estado: "ENVIADA",
      fechaEnvio: new Date().toISOString().slice(0, 10),
      enviadaPor: "Ana Gómez (Supervisora)",
      fechaAtencion: null,
      alerta:
        b.MOTIVO === "FALTA_CONTINUIDAD"
          ? "continuidad"
          : b.MOTIVO === "TRASLADOS_PENDIENTES"
            ? "traslados"
            : null,
      respuesta: null,
    }
    orientacionesDb.push(nueva)
    return conDatos(nueva.id)
  }),

  http.get(`${BASE}/proyeccion/:id`, async ({ params }) => {
    await delay(250)
    const p = proyeccionDb.find((x) => x.id === Number(params.id))
    if (!p) return error(404, "No se encontró el establecimiento.")
    return conDatos(proyeccionDetalle(p))
  }),

  http.get(`${BASE}/proyeccion`, async () => {
    await delay(200)
    return conDatos(proyeccionDb)
  }),

  http.get(`${BASE}/calendarios`, async () => {
    await delay(200)
    return conDatos([...calendariosDb].sort((a, b) => b.anio - a.anio || a.ciclo - b.ciclo))
  }),

  http.post(
    `*/api/files/eval-col/cobertura-academica/entidad-territorial/calendarios/:id/ampliar`,
    async ({ params, request }) => {
      await delay(400)
      const c = calendariosDb.find((x) => x.id === Number(params.id))
      if (!c) return error(404, "No se encontró el calendario.")
      if (c.estado !== "PUBLICADO")
        return error(400, "Solo se amplían las fechas de un calendario Publicado.")
      const f = await request.formData()
      const campo = texto(f, "CAMPO") ?? "FECHA_LIMITE_MATRICULA"
      const clave = (
        {
          FECHA_CIERRE_INSCRIPCION: "fechaCierreInscripcion",
          FECHA_LIBERACION_RESERVAS: "fechaLiberacionReservas",
          FECHA_LIMITE_MATRICULA: "fechaLimiteMatricula",
        } as const
      )[campo]
      if (!clave) return error(400, "La fecha a ampliar no es válida.")
      const actual = c[clave]
      if (!actual) return error(400, "El calendario no tiene esa fecha: defínala con Modificar.")
      const fecha = texto(f, "FECHA")
      if (!fecha || fecha <= actual)
        return error(400, "La nueva fecha debe ser posterior a la actual.")
      if (!texto(f, "MOTIVO")) return error(400, "El motivo de la ampliación es obligatorio.")
      const ees = JSON.parse(texto(f, "ESTABLECIMIENTOS") ?? "[]") as number[]
      if (ees.length && campo !== "FECHA_LIMITE_MATRICULA")
        return error(
          400,
          "Solo la Fecha límite de matrícula se amplía para establecimientos elegidos.",
        )
      // General: cambia el calendario; por establecimiento, solo los períodos de esos establecimientos.
      if (!ees.length) c[clave] = fecha
      return conDatos({ ampliacionId: 1, establecimientos: ees.length, periodos: ees.length })
    },
  ),

  http.post(
    `*/api/files/eval-col/cobertura-academica/entidad-territorial/calendarios/:id`,
    async ({ params, request }) => {
      await delay(400)
      const c = calendariosDb.find((x) => x.id === Number(params.id))
      if (!c) return error(404, "No se encontró el calendario.")
      if (c.estado === "FINALIZADO")
        return error(400, "Un calendario Finalizado no se modifica: es el historial del proceso.")
      const f = await request.formData()
      const nuevo = leer(f)
      const problema =
        validar(nuevo) ??
        (repetido(nuevo, c.id) ? "Ya hay un calendario para ese Año, Modalidad y Ciclo." : null)
      if (problema) return error(400, problema)
      Object.assign(c, nuevo, { soporte: nombreArchivo(f, "SOPORTE") ?? c.soporte })
      return conDatos(c.id)
    },
  ),

  http.post(
    `*/api/files/eval-col/cobertura-academica/entidad-territorial/calendarios`,
    async ({ request }) => {
      await delay(400)
      const f = await request.formData()
      const nuevo = leer(f)
      const problema =
        validar(nuevo) ??
        (repetido(nuevo) ? "Ya hay un calendario para ese Año, Modalidad y Ciclo." : null)
      if (problema) return error(400, problema)
      const id = Math.max(0, ...calendariosDb.map((x) => x.id)) + 1
      calendariosDb.push({ id, ...nuevo, soporte: nombreArchivo(f, "SOPORTE") })
      return conDatos(id)
    },
  ),
]
