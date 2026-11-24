import type { Actividad } from "@/features/planeador/api/types/actividad"

/**
 * Rail de un día armado con el listado completo guardado en el equipo. El
 * backend pagina por día y la preparación no puede guardar cada día suelto:
 * sin red, cualquier día que no se hubiera abierto quedaba sin datos aunque
 * el calendario sí mostrara sus actividades. Mismo criterio que `?dia=`: la
 * ventana `[fechaInicio, fechaCierre]` cubre el día.
 */
export function railDelDia(actividades: Actividad[], dia: string) {
  const rows = actividades.filter((a) => a.fechaInicio <= dia && dia <= a.fechaCierre)
  let diaAnterior: string | null = null
  let diaSiguiente: string | null = null
  for (const a of actividades) {
    // Día ocupado más cercano a cada lado: el borde de la ventana o el día vecino si lo cubre.
    if (a.fechaInicio < dia) {
      const c = a.fechaCierre < dia ? a.fechaCierre : sumarDias(dia, -1)
      if (diaAnterior == null || c > diaAnterior) diaAnterior = c
    }
    if (a.fechaCierre > dia) {
      const c = a.fechaInicio > dia ? a.fechaInicio : sumarDias(dia, 1)
      if (diaSiguiente == null || c < diaSiguiente) diaSiguiente = c
    }
  }
  return { rows, totalCount: rows.length, diaAnterior, diaSiguiente }
}

function sumarDias(dia: string, n: number): string {
  const [y, m, d] = dia.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}
