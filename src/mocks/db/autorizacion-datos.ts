import type {
  AutorizacionEstablecimiento,
  AutorizacionPendiente,
} from "@/features/autorizacion-datos/api/types"

// Autorización de tratamiento de datos (Regla 81 / Regla 116) en memoria: recargar resetea.

/** Establecimientos que usan los mocks de inscripciones (IE Central es "este" establecimiento). */
export const ESTABLECIMIENTOS_MOCK: Record<string, number> = {
  "IE Central": 1,
  "IE San José": 2,
  "Colegio Nuevo Horizonte": 3,
  "IE Norte": 4,
  "IE Sur": 5,
}

export const idEstablecimientoMock = (nombre: string) => ESTABLECIMIENTOS_MOCK[nombre] ?? 99

/** Autorizaciones por inscripción del listado (se crean al pedir el detalle o la lista). */
export const autorizacionesInscripcionDb = new Map<number, AutorizacionEstablecimiento[]>()

/** Mi cuenta del usuario mock: una inscripción como acudiente y su vínculo de funcionario. */
export const misPendientesDb: AutorizacionPendiente[] = [
  {
    tipo: "INSCRIPCION",
    inscripcionId: 9_001,
    numero: "00412",
    aspirante: "Sara Gómez Ruiz",
    establecimientos: [
      { establecimientoId: 1, establecimiento: "IE Central", autorizado: false },
      { establecimientoId: 4, establecimiento: "IE Norte", autorizado: false },
      { establecimientoId: 5, establecimiento: "IE Sur", autorizado: true },
    ],
  },
  {
    tipo: "FUNCIONARIO",
    inscripcionId: null,
    numero: null,
    aspirante: null,
    establecimientos: [{ establecimientoId: 2, establecimiento: "IE San José", autorizado: false }],
  },
]

/** Marca autorizados los pedidos que estén en la lista; devuelve la lista actualizada. */
export function autorizarEn(lista: AutorizacionEstablecimiento[], ids: number[]): AutorizacionEstablecimiento[] {
  for (const a of lista) if (ids.includes(a.establecimientoId)) a.autorizado = true
  return lista
}
