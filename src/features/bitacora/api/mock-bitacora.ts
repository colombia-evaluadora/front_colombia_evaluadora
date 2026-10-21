import { subDays, subMinutes } from "date-fns"

import type {
  BitacoraAccion,
  BitacoraCambio,
  BitacoraEntidad,
  BitacoraEstado,
  BitacoraEvento,
  BitacoraModulo,
  TipoRestauracion,
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
  GESTION_ESTUDIANTIL: [{ codigo: "ANOTACION", nombre: "Anotación" }],
  ADMINISTRACION: [
    { codigo: "LISTA_VALOR", nombre: "Lista de valores" },
    { codigo: "AREA_OFICIAL", nombre: "Área oficial" },
  ],
}

const USUARIOS = [
  { nombre: "Marta Lucía Rojas", documento: "52341987", rol: "Rector" },
  { nombre: "Andrés Felipe Gómez", documento: "1032456781", rol: "Jefe de Sistemas" },
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
  if (accion === "ELIMINAR") return [{ campo: "Nombre", anterior: REGISTROS[i % REGISTROS.length]!, nuevo: null }]
  return Array.from({ length: (i % 2) + 1 }, (_, k) => MODIFICACIONES[(i + k) % MODIFICACIONES.length]!)
}

function tipoDe(accion: BitacoraAccion): TipoRestauracion | null {
  if (accion === "MODIFICAR") return "RESTAURAR_VALOR"
  if (accion === "ELIMINAR") return "RECUPERAR_REGISTRO"
  return null
}

function generar(modulo: BitacoraModulo): EventoMock[] {
  const entidades = ENTIDADES_MOCK[modulo]
  const global = modulo === "ADMINISTRACION"
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
        campos: cambios.map((c) => c.campo),
        motivo: null,
        tipoRestauracion: tipoDe(accion),
        motivoBloqueoEvento: esSistema
          ? "Es un cambio hecho por el Sistema."
          : accion === "CREAR"
            ? "Las creaciones no tienen un valor anterior al que volver."
            : null,
        vigente: !cambiadoDespues,
        eventosPosteriores: cambiadoDespues
          ? [{ pk: "999-0", fecha: new Date().toISOString(), usuario: "Andrés Felipe Gómez", sede: null, accion: "MODIFICAR", campo: cambios[0]!.campo }]
          : [],
      },
      estado: {
        id,
        cambios,
        vista: `${entidad.nombre}s`,
        puede: !esSistema && accion !== "CREAR" && accion !== "CAMBIO_ESTADO",
        motivoBloqueo:
          accion === "CAMBIO_ESTADO" ? "Es un cambio de estado con efectos de ciclo de vida." : null,
      },
    }
  })
}

const CACHE = new Map<BitacoraModulo, EventoMock[]>()

export function eventosMock(modulo: BitacoraModulo) {
  if (!CACHE.has(modulo)) CACHE.set(modulo, generar(modulo))
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
    },
    estado: { id: nuevoId, cambios, vista: estado.vista, puede: false, motivoBloqueo: null },
  })
  evento.vigente = false
}
