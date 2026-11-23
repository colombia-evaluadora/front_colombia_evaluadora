// Actualización de datos (Sección 2.19), en snake_case como lo mandaría el back
// (tarea 30 de pendientes-back.md). Como C.6.CFG.1: ventana abierta en febrero,
// todo marcado para el acudiente salvo la información laboral, y el estudiante
// solo con su teléfono. Dos solicitudes Pendientes (C.6.SOL.1) y dos decididas.

const D_EST = "Domicilio del estudiante (2.3)"
const D_ACU = "Domicilio del acudiente (2.11)"
const LAB = "Información laboral del acudiente (2.13)"

interface CampoRow {
  codigo: string
  nombre: string
  bloque: string
  acudiente: boolean | null
  estudiante: boolean | null
}

const config = {
  activo: true,
  fecha_inicio: "2028-02-01" as string | null,
  fecha_cierre: "2028-02-28" as string | null,
  campos: [
    { codigo: "DIRECCION_ESTUDIANTE", nombre: "Dirección del estudiante", bloque: D_EST, acudiente: true, estudiante: null },
    { codigo: "BARRIO_ESTUDIANTE", nombre: "Barrio del estudiante", bloque: D_EST, acudiente: true, estudiante: null },
    { codigo: "UBICACION_DOMICILIO", nombre: "Ubicación del domicilio", bloque: D_EST, acudiente: true, estudiante: null },
    { codigo: "MUNICIPIO_ESTUDIANTE", nombre: "Lugar de residencia estudiante (municipio)", bloque: D_EST, acudiente: true, estudiante: null },
    { codigo: "TELEFONO_ESTUDIANTE", nombre: "Teléfono de estudiante", bloque: "Teléfono de estudiante (2.4)", acudiente: true, estudiante: true },
    { codigo: "DIRECCION_ACUDIENTE", nombre: "Dirección de acudiente", bloque: D_ACU, acudiente: true, estudiante: null },
    { codigo: "MUNICIPIO_ACUDIENTE", nombre: "Lugar de residencia acudiente (municipio)", bloque: D_ACU, acudiente: true, estudiante: null },
    { codigo: "TELEFONO_ACUDIENTE", nombre: "Teléfono de acudiente", bloque: "Teléfono de acudiente (2.12)", acudiente: true, estudiante: null },
    { codigo: "PROFESION_ACUDIENTE", nombre: "Profesión acudiente", bloque: LAB, acudiente: false, estudiante: null },
    { codigo: "ENTIDAD_NOMBRE", nombre: "Nombre de la entidad acudiente", bloque: LAB, acudiente: false, estudiante: null },
    { codigo: "ENTIDAD_DIRECCION", nombre: "Dirección de la entidad acudiente", bloque: LAB, acudiente: false, estudiante: null },
    { codigo: "ENTIDAD_TELEFONO", nombre: "Teléfono de la entidad acudiente", bloque: LAB, acudiente: false, estudiante: null },
    { codigo: "ENTIDAD_CARGO", nombre: "Cargo entidad acudiente", bloque: LAB, acudiente: false, estudiante: null },
  ] as CampoRow[],
}

export const configuracionActualizacion = () => structuredClone(config)

export function guardarConfiguracion(b: {
  ACTIVO: "S" | "N"
  FECHA_INICIO: string | null
  FECHA_CIERRE: string | null
  CAMPOS: { CODIGO: string; ACUDIENTE: "S" | "N"; ESTUDIANTE: "S" | "N" }[]
}): string | null {
  if (b.FECHA_INICIO && b.FECHA_CIERRE && b.FECHA_CIERRE < b.FECHA_INICIO) return "La fecha de cierre no puede ser anterior a la fecha de inicio."
  config.activo = b.ACTIVO === "S"
  config.fecha_inicio = b.FECHA_INICIO
  config.fecha_cierre = b.FECHA_CIERRE
  for (const c of b.CAMPOS) {
    const f = config.campos.find((x) => x.codigo === c.CODIGO)
    if (!f) return `El campo ${c.CODIGO} no es configurable.`
    // Un perfil que no admite el campo no se puede marcar.
    if (f.acudiente !== null) f.acudiente = c.ACUDIENTE === "S"
    if (f.estudiante !== null) f.estudiante = c.ESTUDIANTE === "S"
    else if (c.ESTUDIANTE === "S") return `El estudiante no puede actualizar ${f.nombre}.`
  }
  return null
}

type Estado = "PENDIENTE" | "APROBADA" | "RECHAZADA"

const solicitudes = [
  {
    solicitud_id: 1,
    solicitante: "Rosa Rojas Díaz",
    estudiante: "Sara Gil Moreno",
    dato: "Segundo apellido",
    valor_actual: "Moreno",
    valor_solicitado: "Morales",
    fecha: "2028-02-14",
    estado: "PENDIENTE" as Estado,
    motivo: "En el registro civil aparece Morales; hubo un error al matricularla.",
    soporte_id: 9001,
    motivo_decision: null as string | null,
    decidido_por: null as string | null,
    fecha_decision: null as string | null,
  },
  {
    solicitud_id: 2,
    solicitante: "Pedro Gil Ruiz",
    estudiante: "Luis Gil Moreno",
    dato: "Primer nombre",
    valor_actual: "Luis",
    valor_solicitado: "Luís",
    fecha: "2028-02-15",
    estado: "PENDIENTE" as Estado,
    motivo: "El documento de identidad lleva tilde en el nombre.",
    soporte_id: 9002,
    motivo_decision: null,
    decidido_por: null,
    fecha_decision: null,
  },
  {
    solicitud_id: 3,
    solicitante: "Marta Peña Ortiz",
    estudiante: "Camilo Peña Ortiz",
    dato: "Fecha de nacimiento",
    valor_actual: "03/05/2014",
    valor_solicitado: "05/03/2014",
    fecha: "2028-02-03",
    estado: "APROBADA" as Estado,
    motivo: "Se invirtieron el día y el mes al registrarlo.",
    soporte_id: 9003,
    motivo_decision: null,
    decidido_por: "Juan Ramírez",
    fecha_decision: "2028-02-04",
  },
  {
    solicitud_id: 4,
    solicitante: "Andrés Mora Vega",
    estudiante: "Valentina Mora Ríos",
    dato: "Número de documento",
    valor_actual: "1098765432",
    valor_solicitado: "1098765423",
    fecha: "2028-02-05",
    estado: "RECHAZADA" as Estado,
    motivo: "El número quedó con dos dígitos cambiados.",
    soporte_id: 9004,
    motivo_decision: "El soporte adjunto no es legible; envíe de nuevo el documento escaneado.",
    decidido_por: "Juan Ramírez",
    fecha_decision: "2028-02-06",
  },
]

const sinTildes = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

export function listarSolicitudes(b: { SEARCH: string | null; ESTADO: Estado | null; PAGE_INDEX: number; PAGE_SIZE: number }) {
  const q = b.SEARCH ? sinTildes(b.SEARCH) : ""
  const filtradas = solicitudes
    .filter((s) => !b.ESTADO || s.estado === b.ESTADO)
    .filter((s) => !q || sinTildes(`${s.solicitante} ${s.estudiante}`).includes(q))
    .sort((a, c) => a.fecha.localeCompare(c.fecha))
  return filtradas
    .slice(b.PAGE_INDEX * b.PAGE_SIZE, (b.PAGE_INDEX + 1) * b.PAGE_SIZE)
    .map((s) => ({ ...s, total_count: filtradas.length }))
}

const hoy = () => new Date().toISOString().slice(0, 10)

function pendiente(id: number) {
  const s = solicitudes.find((x) => x.solicitud_id === id)
  if (!s) return { error: "La solicitud no existe." }
  if (s.estado !== "PENDIENTE") return { error: "La solicitud ya fue decidida." }
  return { s }
}

export function aprobarSolicitud(id: number): string | null {
  const { s, error } = pendiente(id)
  if (!s) return error
  s.estado = "APROBADA"
  s.decidido_por = "Usuario actual"
  s.fecha_decision = hoy()
  return null
}

export function rechazarSolicitud(id: number, motivo: string): string | null {
  const { s, error } = pendiente(id)
  if (!s) return error
  const m = motivo.trim()
  if (m.length < 10 || m.length > 500) return "El motivo debe tener entre 10 y 500 caracteres."
  s.estado = "RECHAZADA"
  s.motivo_decision = m
  s.decidido_por = "Usuario actual"
  s.fecha_decision = hoy()
  return null
}
