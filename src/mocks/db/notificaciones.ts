import { faker } from "@faker-js/faker"

import type {
  CategoriaNotificacion,
  HorarioSilenciosoRow,
  NotificacionRow,
  PreferenciaTipoRow,
  PrioridadNotificacion,
} from "@/features/notificaciones/api/types"

/**
 * Bandeja y preferencias del centro de notificaciones (solo mock: el backend
 * de `notification-service` todavía no existe). DB en memoria: recargar la
 * página la resetea. Fechas relativas a "ahora" para que "Hoy"/"Ayer" se vean.
 */

interface TipoFixture {
  tipo: string
  categoria: CategoriaNotificacion
  etiqueta: string
  prioridad: PrioridadNotificacion
  silenciable: boolean
  push: boolean
  email: boolean
  titulo: () => string
  cuerpo: () => string
  deepLink: () => string
  agrupable?: boolean
}

const TIPOS: TipoFixture[] = [
  {
    tipo: "CHAT_MENCION",
    categoria: "CHAT",
    etiqueta: "Menciones en el chat",
    prioridad: "ALTA",
    silenciable: true,
    push: true,
    email: false,
    titulo: () => `${faker.person.firstName()} te mencionó en #${faker.helpers.arrayElement(["docentes", "grado-5", "coordinacion"])}`,
    cuerpo: () => faker.lorem.sentence(),
    deepLink: () => `/app/comunicaciones/chat?canal=${faker.number.int({ min: 1, max: 6 })}`,
  },
  {
    tipo: "CHAT_MENSAJE",
    categoria: "CHAT",
    etiqueta: "Mensajes nuevos en grupos y foros",
    prioridad: "NORMAL",
    silenciable: true,
    push: true,
    email: false,
    titulo: () => `Nuevos mensajes en ${faker.helpers.arrayElement(["Proyecto feria", "docentes-general"])}`,
    cuerpo: () => faker.lorem.sentence(),
    deepLink: () => `/app/comunicaciones/chat?canal=${faker.number.int({ min: 2, max: 4 })}`,
    agrupable: true,
  },
  {
    tipo: "CHAT_LECTURA",
    categoria: "CHAT",
    etiqueta: "Confirmaciones de lectura",
    prioridad: "NORMAL",
    silenciable: true,
    push: true,
    email: false,
    titulo: () => `${faker.person.fullName()} leyó tu mensaje`,
    cuerpo: () => `“${faker.lorem.words(5)}”`,
    deepLink: () => `/app/comunicaciones/chat?canal=${faker.number.int({ min: 1, max: 6 })}`,
    agrupable: false,
  },
  {
    tipo: "CHAT_REACCION",
    categoria: "CHAT",
    etiqueta: "Reacciones a tus mensajes",
    prioridad: "NORMAL",
    silenciable: true,
    push: false,
    email: false,
    titulo: () => "reaccionaron a tu mensaje",
    cuerpo: () => `“${faker.lorem.words(5)}”`,
    deepLink: () => `/app/comunicaciones/chat?canal=${faker.number.int({ min: 1, max: 6 })}`,
    agrupable: true,
  },
  {
    tipo: "PLANEADOR_APROBADA",
    categoria: "PLANEADOR",
    etiqueta: "Actividad aprobada o rechazada",
    prioridad: "NORMAL",
    silenciable: true,
    push: true,
    email: true,
    titulo: () => faker.helpers.arrayElement(["Actividad aprobada", "Actividad devuelta con observaciones"]),
    cuerpo: () => `${faker.helpers.arrayElement(["Matemáticas", "Lenguaje", "Ciencias naturales"])} · ${faker.lorem.words(3)}`,
    deepLink: () => `/app/planeador/actividades?actividad=${faker.number.int({ min: 1, max: 60 })}`,
  },
  {
    tipo: "PLANEADOR_VALIDACION",
    categoria: "PLANEADOR",
    etiqueta: "Actividad enviada a validación",
    prioridad: "NORMAL",
    silenciable: true,
    push: true,
    email: false,
    titulo: () => `${faker.person.fullName()} envió una actividad a validación`,
    cuerpo: () => faker.lorem.sentence(),
    deepLink: () => `/app/planeador/actividades?actividad=${faker.number.int({ min: 1, max: 60 })}`,
  },
  {
    tipo: "ASISTENCIA_CORRECCION",
    categoria: "ASISTENCIA",
    etiqueta: "Solicitud de corrección de asistencia",
    prioridad: "NORMAL",
    silenciable: true,
    push: true,
    email: true,
    titulo: () => "Nueva solicitud de corrección de asistencia",
    cuerpo: () => `Grupo ${faker.number.int({ min: 1, max: 11 })}-${faker.helpers.arrayElement(["A", "B"])}`,
    deepLink: () => "/app/asistencia/seguimiento",
  },
  {
    tipo: "INFORMES_BOLETIN",
    categoria: "INFORMES",
    etiqueta: "Boletín generado",
    prioridad: "NORMAL",
    silenciable: true,
    push: false,
    email: true,
    titulo: () => "Los boletines del periodo están listos",
    cuerpo: () => `Periodo ${faker.number.int({ min: 1, max: 4 })}`,
    deepLink: () => "/app/gestion-academica/informes",
  },
  {
    tipo: "ESTABLECIMIENTO_ASIGNACION",
    categoria: "ESTABLECIMIENTO",
    etiqueta: "Asignación académica",
    prioridad: "NORMAL",
    silenciable: true,
    push: true,
    email: true,
    titulo: () => "Tienes una nueva asignación académica",
    cuerpo: () => faker.helpers.arrayElement(["Matemáticas 5°A", "Inglés 7°B", "Sociales 9°A"]),
    deepLink: () => "/app/planeador/actividades",
  },
  {
    // Confirmación de una acción propia (sso V590): la etiqueta de la escritura.
    // Solo bandeja por defecto (sin push): espejo de CatalogoTipos del backend.
    tipo: "APP_ACCION",
    categoria: "SISTEMA",
    etiqueta: "Confirmaciones de tus acciones",
    prioridad: "NORMAL",
    silenciable: true,
    push: false,
    email: false,
    titulo: () => "Creación de la sede Norte",
    cuerpo: () => "Hiciste este cambio desde la pantalla de sedes.",
    deepLink: () => "/app/establecimiento-educativo/sedes",
  },
  {
    tipo: "SISTEMA_MANTENIMIENTO",
    categoria: "SISTEMA",
    etiqueta: "Avisos de la institución",
    prioridad: "URGENTE_INSTITUCIONAL",
    silenciable: false,
    push: true,
    email: true,
    titulo: () => "Mantenimiento programado de la plataforma",
    cuerpo: () => "La plataforma no estará disponible el sábado de 10 p. m. a 2 a. m.",
    // Deep link externo a propósito: el front debe caer a `/app/notificaciones`.
    deepLink: () => "https://example.com/mantenimiento",
  },
]

faker.seed(20261015)

function crearNotificacion(minutosAtras: number): NotificacionRow {
  const t = faker.helpers.arrayElement(TIPOS)
  const leida = minutosAtras > 60 * 24 ? faker.datatype.boolean(0.8) : faker.datatype.boolean(0.3)
  const creada = new Date(Date.now() - minutosAtras * 60_000)
  const actores = t.agrupable
    ? faker.helpers.multiple(() => faker.person.firstName(), { count: { min: 1, max: 5 } })
    : null
  return {
    id: faker.string.uuid(),
    tipo: t.tipo,
    categoria: t.categoria,
    titulo: t.titulo(),
    cuerpo_corto: t.cuerpo(),
    deep_link: t.deepLink(),
    prioridad: t.prioridad,
    creada_en: creada.toISOString(),
    leida_en: leida ? new Date(creada.getTime() + 5 * 60_000).toISOString() : null,
    actores,
    conteo: actores ? actores.length : null,
  }
}

/** Bandeja del usuario, ordenada por `creada_en` desc (orden del cursor). */
// `usuario` (correo): solo la ve esa persona (avisos del chat multiusuario); sin él, cualquiera.
export const notificacionesDb: (NotificacionRow & { archivada: boolean; usuario?: string })[] = (() => {
  let minutos = 2
  return Array.from({ length: 75 }, () => {
    const row = crearNotificacion(minutos)
    minutos += faker.number.int({ min: 5, max: 600 })
    return { ...row, archivada: false }
  })
})()

// Avisos de membresía de grupos (comms-service): solo preferencias; no entran a la bandeja
// aleatoria del fixture (la sembrada con faker no cambia). Espejo de CatalogoTipos.
const TIPOS_MEMBRESIA = [
  { tipo: "CHAT_GRUPO_AGREGADO", categoria: "CHAT", etiqueta: "Te agregaron a un grupo o foro", push: true, email: false, silenciable: true },
  { tipo: "CHAT_GRUPO_INVITACION", categoria: "CHAT", etiqueta: "Invitaciones a grupos", push: true, email: false, silenciable: true },
  { tipo: "CHAT_GRUPO_QUITADO", categoria: "CHAT", etiqueta: "Te quitaron de un grupo o foro", push: true, email: false, silenciable: true },
  { tipo: "CHAT_GRUPO_SALIDA", categoria: "CHAT", etiqueta: "Alguien salió de un grupo que administras", push: false, email: false, silenciable: true },
] as const

// Resultados disponibles de elecciones y encuestas (comms-service avisa una vez al cerrar).
const TIPOS_RESULTADOS = [
  { tipo: "CHAT_RESULTADOS_ELECCION", categoria: "CHAT", etiqueta: "Resultados de elecciones", push: true, email: false, silenciable: true },
  { tipo: "CHAT_RESULTADOS_ENCUESTA", categoria: "CHAT", etiqueta: "Resultados de encuestas", push: true, email: false, silenciable: true },
] as const

// Regla 71 (sso V496.19 fn_informe_desactualizado_notificar_interno): fuera de TIPOS
// para no mover la bandeja sembrada con faker; un aviso fijo para el admin (el coordinador del mock no tiene el menú de Informes).
const TIPOS_INFORMES = [
  { tipo: "INFORME_DESACTUALIZADO", categoria: "INFORMES", etiqueta: "Informes desactualizados por una aprobación", push: true, email: false, silenciable: true },
] as const

notificacionesDb.unshift({
  id: "informe-desactualizado-502-201",
  tipo: "INFORME_DESACTUALIZADO",
  categoria: "INFORMES",
  titulo: "Informe desactualizado: 5°01 - Matemáticas · Primer período",
  cuerpo_corto:
    "Se aprobó una recuperación - refuerzo. Quedó desactualizado: Informe del periodo (consolidado del grupo). Vuelve a consolidar para reflejar la nota más reciente.",
  deep_link: "/app/gestion-academica/informes?sede=1&anio=2026&jornada=11&periodos=%5B201%5D&grupos=%5B502%5D&tab=502",
  prioridad: "NORMAL",
  creada_en: new Date(Date.now() - 60_000).toISOString(),
  leida_en: null,
  actores: null,
  conteo: null,
  archivada: false,
  usuario: "admin@example.com",
})

export const preferenciasTiposDb: PreferenciaTipoRow[] = [...TIPOS, ...TIPOS_MEMBRESIA, ...TIPOS_RESULTADOS, ...TIPOS_INFORMES].map((t) => ({
  tipo: t.tipo,
  categoria: t.categoria,
  etiqueta: t.etiqueta,
  in_app: true,
  push: t.push,
  email: t.email,
  silenciable: t.silenciable,
  // Los avisos institucionales no se pueden apagar por push (piso D-3.3).
  push_bloqueado: !t.silenciable,
  email_bloqueado: false,
  silenciado_hasta: null,
}))

export const horarioSilenciosoDb: HorarioSilenciosoRow = {
  activo: false,
  desde: "22:00",
  hasta: "06:00",
  dias: [1, 2, 3, 4, 5, 6, 7],
  zona: "America/Bogota",
  bloqueado: false,
}
