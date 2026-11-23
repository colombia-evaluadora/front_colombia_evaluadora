import { subDays, subMinutes } from "date-fns"

import {
  moduloConSedeJornada,
  type BitacoraAccion,
  type BitacoraCambio,
  type BitacoraEntidad,
  type BitacoraEstado,
  type BitacoraEvento,
  type BitacoraModulo,
  type TipoRestauracion,
} from "@/features/bitacora/api/types/bitacora"

// Datos de ejemplo para el modo con mocks (ENABLE_API_MOCKING); el back real va por ClickHouse.

export const ENTIDADES_MOCK: Record<BitacoraModulo, BitacoraEntidad[]> = {
  ESTABLECIMIENTO: [
    { codigo: "SEDE", nombre: "Sede" },
    { codigo: "FUNCIONARIO", nombre: "Funcionario" },
    { codigo: "PERIODO", nombre: "Período académico" },
  ],
  COBERTURA: [
    { codigo: "MATRICULA", nombre: "Matrícula" },
    { codigo: "RESERVA", nombre: "Reserva de cupo" },
  ],
  GESTION_ACADEMICA: [
    { codigo: "ACTIVIDAD", nombre: "Actividad" },
    { codigo: "ASISTENCIA", nombre: "Asistencia" },
  ],
  GESTION_ESTUDIANTIL: [
    { codigo: "ANOTACION", nombre: "Anotación" },
    { codigo: "OBSERVADOR", nombre: "Observador" },
    { codigo: "CONVIVENCIA", nombre: "Convivencia" },
    { codigo: "PLAN_ACOMPANAMIENTO", nombre: "Plan de acompañamiento" },
    { codigo: "CITACION", nombre: "Citación" },
    { codigo: "OBSERVACION", nombre: "Observación" },
  ],
  EVALUACION_DESEMPENO: [
    { codigo: "EVALUACION", nombre: "Evaluación" },
    { codigo: "PARTICIPANTE", nombre: "Participante" },
    { codigo: "CONFIGURACION", nombre: "Configuración" },
  ],
  ADMINISTRACION: [
    { codigo: "LISTA_VALOR", nombre: "Lista de valores" },
    { codigo: "AREA_OFICIAL", nombre: "Área oficial" },
  ],
  COMUNICACIONES: [
    { codigo: "CONVERSACION", nombre: "Grupo, foro o actividad" },
    { codigo: "PARTICIPANTE", nombre: "Participante" },
    { codigo: "MENSAJE", nombre: "Mensaje" },
  ],
}

/** Etiquetas de comms-service (`app.etiqueta`) para el módulo Comunicaciones. */
const DESCRIPCIONES_COMUNICACIONES = [
  "Crear el grupo Feria de ciencias",
  "Agregar a Ana Sofía Pérez G. al grupo Feria de ciencias",
  "Enviar un mensaje en el grupo Feria de ciencias",
  "Quitar a Juan D. Ortiz del grupo Feria de ciencias",
  "Eliminar un mensaje en el foro General",
  "Publicar el comunicado Reunión de padres",
]

const USUARIOS = [
  { nombre: "Marta Lucía Rojas", documento: "52341987", rol: "Rector" },
  { nombre: "Andrés Felipe Gómez", documento: "1032456781", rol: "Jefe de sistemas" },
  { nombre: "Claudia Patricia Díaz", documento: "39874512", rol: "Coordinador" },
  { nombre: "Sistema", documento: null, rol: null },
]
const SEDES = ["Principal", "El Rosal", "La Esperanza"]
const JORNADAS = ["Mañana", "Tarde", "Única"]
const REGISTROS = ["Ana Sofía Pérez G.", "Grado 5° A", "Sede El Rosal", "Período 2026", "Juan D. Ortiz"]
const ACCIONES: BitacoraAccion[] = ["MODIFICAR", "MODIFICAR", "CREAR", "CAMBIO_ESTADO", "ELIMINAR", "MODIFICAR"]

const MODIFICACIONES: BitacoraCambio[] = [
  { campo: "Teléfono", anterior: "604 448 1290", nuevo: "604 448 1300" },
  { campo: "Correo electrónico", anterior: "secretaria@sanjose.edu.co", nuevo: "admin@sanjose.edu.co" },
  { campo: "Dirección", anterior: "Cra 45 # 12-30", nuevo: "Cra 45 # 12-32" },
  { campo: "Grupo", anterior: "5° A", nuevo: "5° B" },
]

interface EventoMock {
  evento: BitacoraEvento
  estado: BitacoraEstado
}

function cambiosDe(accion: BitacoraAccion, i: number): BitacoraCambio[] {
  if (accion === "CAMBIO_ESTADO") return [{ campo: "Estado", anterior: "Activo", nuevo: "Inactivo" }]
  if (accion === "CREAR") return [{ campo: "Nombre", anterior: null, nuevo: REGISTROS[i % REGISTROS.length]! }]
  // La copia completa del registro eliminado (B.1.DET.1): todos sus campos, no solo el nombre.
  if (accion === "ELIMINAR")
    return [
      { campo: "Nombre", anterior: REGISTROS[i % REGISTROS.length]!, nuevo: null },
      { campo: "Sede", anterior: SEDES[i % SEDES.length]!, nuevo: null },
      { campo: "Estado", anterior: "Activa", nuevo: null },
    ]
  return Array.from({ length: (i % 2) + 1 }, (_, k) => MODIFICACIONES[(i + k) % MODIFICACIONES.length]!)
}

function tipoDe(accion: BitacoraAccion): TipoRestauracion | null {
  if (accion === "MODIFICAR") return "RESTAURAR_VALOR"
  if (accion === "ELIMINAR") return "RECUPERAR_REGISTRO"
  return null
}

function generar(modulo: BitacoraModulo): EventoMock[] {
  const entidades = ENTIDADES_MOCK[modulo]
  const global = !moduloConSedeJornada(modulo)
  return Array.from({ length: 48 }, (_, i) => {
    const accion = ACCIONES[i % ACCIONES.length]!
    const usuario = USUARIOS[(i * 3) % USUARIOS.length]!
    const esSistema = usuario.nombre === "Sistema"
    const entidad = entidades[i % entidades.length]!
    // Uno de cada cuatro Modificar tuvo cambios después: no se puede restaurar.
    const cambiadoDespues = accion === "MODIFICAR" && i % 4 === 0
    const cambios = cambiosDe(accion, i).map((c) => ({
      ...c,
      actual: accion === "ELIMINAR" ? null : cambiadoDespues && c.nuevo ? `${c.nuevo} (editado)` : c.nuevo,
    }))
    const id = `${1000 + i}-0`
    return {
      evento: {
        id,
        fecha: subMinutes(subDays(new Date(), Math.floor(i * 0.6)), i * 97),
        usuario,
        esSistema,
        sede: global ? null : SEDES[i % SEDES.length]!,
        jornada: global ? null : JORNADAS[(i * 2) % JORNADAS.length]!,
        entidad: entidad.nombre,
        registro: REGISTROS[(i * 3) % REGISTROS.length]!,
        accion,
        descripcion:
          modulo === "COMUNICACIONES" ? DESCRIPCIONES_COMUNICACIONES[i % DESCRIPCIONES_COMUNICACIONES.length]! : null,
        campos: cambios.map((c) => c.campo),
        motivo: null,
        tipoRestauracion: tipoDe(accion),
        motivoBloqueoEvento: esSistema
          ? "Es un cambio hecho por el sistema."
          : accion === "CREAR"
            ? "Las creaciones no tienen un valor anterior al que volver."
            : null,
        vigente: !cambiadoDespues,
        eventoOriginal: null,
        acceso: null,
        reservado: false,
        eventosPosteriores: cambiadoDespues
          ? [{ pk: "999-0", fecha: new Date().toISOString(), usuario: "Andrés Felipe Gómez", sede: null, accion: "MODIFICAR", campo: cambios[0]!.campo }]
          : [],
      },
      estado: {
        id,
        cambios,
        vista: `${entidad.nombre}s`,
        puede: !esSistema && accion !== "CREAR" && accion !== "CAMBIO_ESTADO",
        creado: accion === "ELIMINAR" ? { fecha: "2025-02-12T09:00:00", por: "Claudia Patricia Díaz" } : null,
        motivoBloqueo:
          accion === "CAMBIO_ESTADO" ? "Es un cambio de estado con efectos de ciclo de vida." : null,
      },
    }
  })
}

const MOTIVOS_RESTAURACION = [
  "El cambio se hizo por error; los datos correctos son los anteriores.",
  "Se modificó el registro equivocado.",
]

/** Dos Restauraciones de ejemplo (B.1.DET.2): deshacen dos Modificar y guardan el motivo y el evento original. */
function conRestauraciones(eventos: EventoMock[]): EventoMock[] {
  const modificados = eventos.filter((m) => m.evento.accion === "MODIFICAR" && m.evento.vigente && !m.evento.esSistema).slice(0, 2)
  const restauraciones = modificados.map((m, k): EventoMock => {
    const id = `${900 + k}-0`
    return {
      evento: {
        ...m.evento,
        id,
        fecha: subMinutes(m.evento.fecha, -45),
        usuario: USUARIOS[1]!,
        esSistema: false,
        accion: "RESTAURACION",
        motivo: MOTIVOS_RESTAURACION[k]!,
        tipoRestauracion: null,
        motivoBloqueoEvento: "Los registros de la bitácora no se restauran.",
        eventosPosteriores: [],
        acceso: null,
        reservado: false,
        eventoOriginal: {
          fecha: m.evento.fecha.toISOString(),
          usuario: m.evento.usuario.nombre,
          rol: m.evento.usuario.rol,
          sede: m.evento.sede,
          accion: m.evento.accion,
        },
      },
      estado: {
        id,
        cambios: m.estado.cambios.map((c) => ({ campo: c.campo, anterior: c.nuevo, nuevo: c.anterior, actual: c.anterior })),
        vista: m.estado.vista,
        puede: false,
        motivoBloqueo: null,
      },
    }
  })
  return [...restauraciones, ...eventos].sort((a, b) => b.evento.fecha.getTime() - a.evento.fecha.getTime())
}

// Accesos de ejemplo de Administración del Sistema (B.7.LIS.1).
const ACCESOS: [number, string, string, string, string, string][] = [
  [0, "CC 79111222", "Superadministrador", "Inicio de sesión exitoso · perfil Funcionario", "190.85.14.22", "Chrome 130 · Windows"],
  [1, "CC 63222111", "Funcionario", "Inicio de sesión fallido", "181.50.77.9", "Edge 130 · Windows"],
  [2, "CC 1098765432", "Acudiente", "Cuenta bloqueada", "186.31.201.5", "Safari · iPhone"],
  [9, "CC 52444888", "Acudiente", "Cambio de contraseña", "181.62.4.130", "Chrome 130 · Android"],
  [14, "CC 80333444", "Superadministrador", "Segundo factor restablecido", "190.85.14.22", "Chrome 130 · Windows"],
  [20, "CC 63222111", "Funcionario", "Cambio de perfil · Acudiente", "181.50.77.9", "Firefox 131 · Windows"],
  [26, "CC 52111333", "Supervisor territorial", "Solicitud de ¿Olvidó su contraseña?", "200.75.38.61", "Edge 130 · Windows"],
  [40, "CC 1093447902", "Estudiante", "Cierre de sesión forzado", "186.31.99.14", "Chrome 130 · Android"],
]

function accesos(): EventoMock[] {
  return ACCESOS.map(([horas, documento, tipoCuenta, evento, ip, navegador], k) => {
    const id = `${700 + k}-0`
    return {
      evento: {
        id,
        fecha: subMinutes(new Date(), horas * 60 + 7),
        usuario: { nombre: documento, documento, rol: tipoCuenta },
        esSistema: false,
        sede: null,
        jornada: null,
        entidad: "Sesión",
        registro: documento,
        accion: "ACCESO",
        descripcion: evento,
        campos: [],
        motivo: null,
        tipoRestauracion: null,
        motivoBloqueoEvento: "Los accesos no se restauran.",
        vigente: true,
        eventosPosteriores: [],
        eventoOriginal: null,
        reservado: false,
        acceso: { documento, tipoCuenta, evento, ip, navegador },
      },
      estado: { id, cambios: [], vista: null, puede: false, motivoBloqueo: null },
    }
  })
}

/** Arma un evento de ejemplo con valores por defecto (solo lo que cambia en cada caso). */
function ejemplo(
  id: string,
  horasAtras: number,
  e: Partial<BitacoraEvento> & Pick<BitacoraEvento, "entidad" | "registro" | "accion">,
  estado: Partial<BitacoraEstado> = {},
): EventoMock {
  return {
    evento: {
      id,
      fecha: subMinutes(new Date(), horasAtras * 60 + 3),
      usuario: USUARIOS[0]!,
      esSistema: false,
      sede: "Principal",
      jornada: "Mañana",
      descripcion: null,
      campos: [],
      motivo: null,
      tipoRestauracion: null,
      motivoBloqueoEvento: null,
      vigente: true,
      eventosPosteriores: [],
      eventoOriginal: null,
      acceso: null,
      reservado: false,
      ...e,
    },
    estado: { id, cambios: [], vista: null, puede: false, motivoBloqueo: null, ...estado },
  }
}

const RESERVADA = "Información reservada"

/** B.4.LIS.1: Gestión Estudiantil, con eventos de información reservada (sin valores ni restauración). */
function especialesGestionEstudiantil(): EventoMock[] {
  return [
    ejemplo("600-0", 1, {
      usuario: { nombre: "Sandra Pardo", documento: "52888111", rol: "Profesional de orientación" },
      entidad: "Observador",
      registro: RESERVADA,
      accion: "MODIFICAR",
      reservado: true,
      motivoBloqueoEvento: "Es información reservada.",
    }),
    ejemplo("601-0", 5, {
      usuario: { nombre: "Luisa Mora", documento: "43111222", rol: "Supervisor de sede" },
      jornada: "Tarde",
      entidad: "Convivencia",
      registro: "Situación tipo II · Matías Ortega",
      accion: "CREAR",
      motivoBloqueoEvento: "Las creaciones no tienen un valor anterior al que volver.",
    }, { cambios: [{ campo: "Estado", anterior: null, nuevo: "Registrada" }] }),
    ejemplo("602-0", 23, {
      usuario: { nombre: "Sandra Pardo", documento: "52888111", rol: "Profesional de orientación" },
      entidad: "Plan de acompañamiento",
      registro: RESERVADA,
      accion: "CONSULTA",
      reservado: true,
      motivoBloqueoEvento: "Es información reservada.",
    }),
    ejemplo("603-0", 30, {
      usuario: { nombre: "Jorge Ramírez", documento: "80111333", rol: "Gestor administrativo del establecimiento" },
      entidad: "Citación",
      registro: "Citación 2027-014 · Sara Gil Moreno",
      accion: "CAMBIO_ESTADO",
      motivoBloqueoEvento: "Es un cambio de estado con efectos de ciclo de vida.",
    }, { cambios: [{ campo: "Estado", anterior: "Programada", nuevo: "Realizada" }] }),
    ejemplo("604-0", 50, {
      usuario: { nombre: "Andrea Salcedo", documento: "1022333444", rol: "Responsable de grupo" },
      entidad: "Observación",
      registro: "Observación · 7°B",
      accion: "CREAR",
      motivoBloqueoEvento: "Las creaciones no tienen un valor anterior al que volver.",
    }, { cambios: [{ campo: "Tipo", anterior: null, nuevo: "Académica" }] }),
  ]
}

/** B.1.EVA.1: Evaluación del Desempeño (valoraciones reservadas, consultas de terceros y su configuración). */
function especialesEvaluacion(): EventoMock[] {
  const marta = { nombre: "Marta Rojas", documento: "39222111", rol: "Administrador del establecimiento" }
  return [
    ejemplo("650-0", 1, {
      usuario: marta,
      entidad: "Evaluación",
      registro: "Evaluación 2026 · Sandra Pineda",
      accion: "MODIFICAR",
      descripcion: "Registrar valoración final",
      reservado: true,
      motivoBloqueoEvento: "Es información reservada.",
    }),
    ejemplo("651-0", 6, {
      usuario: marta,
      entidad: "Participante",
      registro: "Ciclo 2026 · Luis Cárdenas",
      accion: "CREAR",
      descripcion: "Agregado con su motivo de inclusión",
      motivoBloqueoEvento: "Las creaciones no tienen un valor anterior al que volver.",
    }, { cambios: [{ campo: "Motivo de inclusión", anterior: null, nuevo: "Ingresó en el ciclo 2026" }] }),
    ejemplo("652-0", 25, {
      usuario: { nombre: "Carlos Mejía", documento: "79555666", rol: "Evaluador de rectores" },
      sede: "Secretaría de Educación",
      jornada: null,
      entidad: "Evaluación",
      registro: "Evaluación 2026 · Rector de IE Los Pinos",
      accion: "CONSULTA",
      descripcion: "Consulta por quien no es el evaluador ni el evaluado",
      motivoBloqueoEvento: "Las consultas no se restauran.",
    }),
    ejemplo("653-0", 55, {
      usuario: marta,
      entidad: "Evaluación",
      registro: "Evaluación 2026 · Julián Ospina",
      accion: "CAMBIO_ESTADO",
      motivoBloqueoEvento: "Es un cambio de estado con efectos de ciclo de vida.",
    }, { cambios: [{ campo: "Estado", anterior: "Valorada", nuevo: "Notificada (personal)" }] }),
    // B.1.EVA.1a: un cambio de la configuración que sí se puede restaurar.
    ejemplo("654-0", 80, {
      usuario: { nombre: "Elena Duarte", documento: "41777888", rol: "Administrador territorial" },
      sede: "Secretaría de Educación",
      jornada: null,
      entidad: "Configuración",
      registro: "Cronograma 2026",
      accion: "MODIFICAR",
      tipoRestauracion: "RESTAURAR_VALOR",
    }, {
      cambios: [{ campo: "Fin de la valoración", anterior: "12/11/2026", nuevo: "19/11/2026", actual: "19/11/2026" }],
      vista: "Configuración de evaluación del desempeño",
      puede: true,
    }),
  ]
}

function especiales(modulo: BitacoraModulo): EventoMock[] {
  if (modulo === "ADMINISTRACION") return accesos()
  if (modulo === "GESTION_ESTUDIANTIL") return especialesGestionEstudiantil()
  if (modulo === "EVALUACION_DESEMPENO") return especialesEvaluacion()
  return []
}

const CACHE = new Map<BitacoraModulo, EventoMock[]>()

export function eventosMock(modulo: BitacoraModulo) {
  if (!CACHE.has(modulo)) {
    const eventos = [...especiales(modulo), ...conRestauraciones(generar(modulo))]
    CACHE.set(modulo, eventos.sort((a, b) => b.evento.fecha.getTime() - a.evento.fecha.getTime()))
  }
  return CACHE.get(modulo)!
}

function buscar(id: string) {
  for (const lista of CACHE.values()) {
    const e = lista.find((x) => x.evento.id === id)
    if (e) return { lista, e }
  }
  return null
}

export function estadoMock(ids: string[]): BitacoraEstado[] {
  return ids.flatMap((id) => {
    const r = buscar(id)
    return r ? [r.e.estado] : []
  })
}

/** La restauración es un evento nuevo; la bitácora no se modifica. */
export function restaurarMock(id: string, motivo: string, vistaPrevia: boolean) {
  const r = buscar(id)
  if (!r) throw new Error("El evento no existe.")
  if (!r.e.evento.vigente) throw new Error("El valor actual cambió después del evento.")
  if (vistaPrevia) return
  const { evento, estado } = r.e
  const nuevoId = `${Date.now()}-0`
  const cambios = estado.cambios.map((c) => ({ campo: c.campo, anterior: c.nuevo, nuevo: c.anterior, actual: c.anterior }))
  r.lista.unshift({
    evento: {
      ...evento,
      id: nuevoId,
      fecha: new Date(),
      usuario: USUARIOS[1]!,
      esSistema: false,
      accion: "RESTAURACION",
      motivo,
      tipoRestauracion: null,
      motivoBloqueoEvento: "Los registros de la bitácora no se restauran.",
      vigente: true,
      eventosPosteriores: [],
      acceso: null,
      reservado: false,
      eventoOriginal: {
        fecha: evento.fecha.toISOString(),
        usuario: evento.usuario.nombre,
        rol: evento.usuario.rol,
        sede: evento.sede,
        accion: evento.accion,
      },
    },
    estado: { id: nuevoId, cambios, vista: estado.vista, puede: false, motivoBloqueo: null },
  })
  evento.vigente = false
}
