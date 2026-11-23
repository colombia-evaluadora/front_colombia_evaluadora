import type {
  HiloAcudientes,
  Miembro,
  OpcionHiloAcudientes,
  SilenciadoHilo,
} from "@/features/comunicaciones/chat/api/types"

/**
 * Hilo común del docente con acudientes (Comunicaciones 4.5) en memoria. El usuario del mock es
 * director de "Sexto 601" y dicta Matemáticas en "Séptimo 702". Los acudientes vigentes salen de
 * aquí; comms-service los calcula desde Cobertura.
 */
export const opcionesHilo: OpcionHiloAcudientes[] = [
  { tipo: "GRUPO", grupo: 601, asignacion: null, nombre: "Sexto 601", acudientes: 3 },
  { tipo: "EJECUCION", grupo: 702, asignacion: 9001, nombre: "Matemáticas · Séptimo 702", acudientes: 2 },
]

const ACUDIENTES: Record<number, { id: number; nombre: string }[]> = {
  601: [
    { id: 501, nombre: "Ana Gil" },
    { id: 502, nombre: "Luis Paz" },
    { id: 503, nombre: "Rosa Díaz" },
  ],
  702: [
    { id: 504, nombre: "Marta León" },
    { id: 505, nombre: "Jorge Ríos" },
  ],
}

export function acudientesDeGrupo(grupo: number): Miembro[] {
  return (ACUDIENTES[grupo] ?? []).map((a) => ({
    id: a.id,
    nombre: a.nombre,
    rol: "Miembro",
    cargo: "Acudiente",
    perfil: "ACUDIENTE" as const,
    enLinea: false,
    bloqueado: false,
  }))
}

export interface HiloMock {
  conversacionId: number
  grupo: number
  nombre: string
  asunto: string
  moderador: { id: number; nombre: string }
  soloLectura: boolean
  silenciados: SilenciadoHilo[]
}

export const hilosAcudientes: HiloMock[] = []

/** Vista del hilo para quien lo pide (los silenciados solo los ve el moderador). */
export function vistaHilo(h: HiloMock, usuarioId: number): HiloAcudientes {
  const esModerador = h.moderador.id === usuarioId
  return {
    conversacionId: h.conversacionId,
    asunto: h.asunto,
    grupo: h.nombre,
    acudientes: acudientesDeGrupo(h.grupo).length,
    moderador: h.moderador,
    esModerador,
    soloLectura: h.soloLectura,
    silenciado: h.silenciados.some((s) => s.usuarioId === usuarioId),
    silenciados: esModerador ? h.silenciados : [],
  }
}
