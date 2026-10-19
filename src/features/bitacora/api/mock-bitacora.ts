import { subDays, subMinutes } from "date-fns"

import {
  BITACORA_MODULOS,
  type BitacoraAccion,
  type BitacoraCambio,
  type BitacoraEvento,
  type BitacoraModulo,
} from "@/features/bitacora/api/types/bitacora"

// Datos de ejemplo mientras no exista el endpoint de la bitácora.

export const ESTABLECIMIENTOS = [
  { value: "1", label: "I.E. San José de Calasanz" },
  { value: "2", label: "I.E. Antonio Nariño" },
]
export const SEDES = [
  { value: "Principal", label: "Principal" },
  { value: "El Rosal", label: "El Rosal" },
  { value: "La Esperanza", label: "La Esperanza" },
]
export const JORNADAS = [
  { value: "Mañana", label: "Mañana" },
  { value: "Tarde", label: "Tarde" },
  { value: "Única", label: "Única" },
]

const USUARIOS = [
  { nombre: "Marta Lucía Rojas", documento: "52341987", rol: "Rector" },
  { nombre: "Andrés Felipe Gómez", documento: "1032456781", rol: "Jefe de Sistemas" },
  { nombre: "Claudia Patricia Díaz", documento: "39874512", rol: "Coordinador" },
  { nombre: "Jorge Iván Castaño", documento: "80123654", rol: "Docente" },
  { nombre: "Sistema", documento: "—", rol: "Proceso automático" },
]

const ACCIONES: BitacoraAccion[] = [
  "Modificar", "Modificar", "Modificar", "Crear", "Crear", "Cambio de estado", "Eliminar", "Restauración",
]

const REGISTROS = ["Ana Sofía Pérez G.", "Grado 5° A", "Sede El Rosal", "Período 2026", "Juan D. Ortiz", "Tipo de documento"]

const MODIFICACIONES: BitacoraCambio[] = [
  { campo: "Teléfono", anterior: "604 448 1290", nuevo: "604 448 1300" },
  { campo: "Correo", anterior: "secretaria@sanjose.edu.co", nuevo: "admin@sanjose.edu.co" },
  { campo: "Dirección", anterior: "Cra 45 # 12-30", nuevo: "Cra 45 # 12-32" },
  { campo: "Grupo", anterior: "5° A", nuevo: "5° B" },
  { campo: "Nota", anterior: "3,8", nuevo: "4,2" },
  { campo: "Nombre", anterior: "Tarjeta de Identidad", nuevo: "Tarjeta de identidad" },
]

function cambiosDe(accion: BitacoraAccion, i: number): BitacoraCambio[] {
  if (accion === "Cambio de estado")
    return [{ campo: "Estado", anterior: i % 2 ? "Activo" : "Matriculado", nuevo: i % 2 ? "Inactivo" : "Retirado" }]
  if (accion === "Crear") return [{ campo: "Registro", anterior: null, nuevo: "Creado" }]
  if (accion === "Eliminar") return [{ campo: "Registro", anterior: "Existente", nuevo: null }]
  // Modificar y Restauración: uno a tres campos en el mismo evento.
  const n = (i % 3) + 1
  return Array.from({ length: n }, (_, k) => MODIFICACIONES[(i + k) % MODIFICACIONES.length]!)
}

const HOY = new Date()

function generar(modulo: BitacoraModulo): BitacoraEvento[] {
  const entidades = BITACORA_MODULOS[modulo].entidades
  return Array.from({ length: 64 }, (_, i) => {
    const accion = ACCIONES[(i * 5) % ACCIONES.length]!
    const usuario = accion === "Restauración" ? USUARIOS[1]! : USUARIOS[(i * 7) % USUARIOS.length]!
    const global = modulo === "administracion"
    const entidad = entidades[i % entidades.length]!
    // Uno de cada cuatro Modificar tuvo cambios después: no se puede restaurar.
    const cambiadoDespues = accion === "Modificar" && i % 4 === 0
    const cambios = cambiosDe(accion, i).map((c) => ({
      ...c,
      actual: cambiadoDespues && c.nuevo ? `${c.nuevo} (editado)` : c.nuevo,
    }))
    return {
      id: i + 1,
      fecha: subMinutes(subDays(HOY, Math.floor(i * 0.75)), i * 97),
      usuario,
      sede: global ? null : SEDES[i % SEDES.length]!.value,
      jornada: global ? null : JORNADAS[(i * 2) % JORNADAS.length]!.value,
      entidad,
      registro: REGISTROS[(i * 3) % REGISTROS.length]!,
      accion,
      cambios,
      posteriores: cambiadoDespues ? [`${USUARIOS[1]!.nombre}, ${cambios[0]!.campo}`] : undefined,
      vista: `${BITACORA_MODULOS[modulo].nombre} › ${entidad}`,
    }
  })
}

const CACHE = new Map<BitacoraModulo, BitacoraEvento[]>()

export function eventosMock(modulo: BitacoraModulo) {
  if (!CACHE.has(modulo)) CACHE.set(modulo, generar(modulo))
  return CACHE.get(modulo)!
}

/** La restauración es un evento nuevo; la bitácora no se modifica. */
export function restaurarMock(modulo: BitacoraModulo, original: BitacoraEvento, motivo: string) {
  const eventos = eventosMock(modulo)
  const esRecuperar = original.accion === "Eliminar"
  eventos.unshift({
    ...original,
    id: Math.max(...eventos.map((e) => e.id)) + 1,
    fecha: new Date(),
    usuario: USUARIOS[1]!,
    accion: "Restauración",
    cambios: esRecuperar
      ? [{ campo: "Registro", anterior: null, nuevo: "Recuperado", actual: "Recuperado" }]
      : original.cambios.map((c) => ({ campo: c.campo, anterior: c.nuevo, nuevo: c.anterior, actual: c.anterior })),
    posteriores: undefined,
    motivo,
  })
  // El original ya no tiene el valor que dejó: no se restaura dos veces.
  original.cambios = original.cambios.map((c) => ({ ...c, actual: c.anterior }))
  original.posteriores = ["Restauración de este evento"]
}
