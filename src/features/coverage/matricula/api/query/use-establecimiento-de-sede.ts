import { useSedeOptionsQuery } from "@/features/establishment/academic-period/api/query/use-sede-options"

interface SedeBuscada {
  /** El id exacto, cuando se tiene (detalle / edición de una matrícula). */
  sedeId?: number | null
  /** El nombre, que es lo que guarda el formulario de alta. */
  sedeNombre?: string | null
}

export interface EstablecimientoDeSede {
  /** El colegio cuya configuración de matrícula corresponde pedir. */
  establecimientoId: number | null
  /** Ya se sabe de qué colegio pedirla. */
  resuelto: boolean
  /** Dos colegios del usuario tienen una sede con ese nombre: no se puede
   *  decidir por el nombre. */
  ambigua: boolean
}

/**
 * De qué establecimiento es la configuración de matrícula que hay que pedir.
 *
 * Un rector de varios colegios no puede pedirla "sin más" (el backend no sabe
 * cuál y responde 22023): la del colegio de la sede de la matrícula. Las
 * opciones de sede ya traen su `fk_establecimiento`. Si el usuario tiene un
 * solo colegio, es ese desde el principio, aunque todavía no haya sede.
 */
export function useEstablecimientoDeSede({ sedeId, sedeNombre }: SedeBuscada): EstablecimientoDeSede {
  const { data: sedes } = useSedeOptionsQuery()

  if (!sedes) return { establecimientoId: null, resuelto: false, ambigua: false }

  const colegios = new Set(sedes.map((sede) => sede.fk_establecimiento))
  if (colegios.size === 1) {
    return { establecimientoId: [...colegios][0], resuelto: true, ambigua: false }
  }

  if (sedeId != null) {
    const sede = sedes.find((s) => s.pk_sede === sedeId)
    return sede
      ? { establecimientoId: sede.fk_establecimiento, resuelto: true, ambigua: false }
      : { establecimientoId: null, resuelto: false, ambigua: false }
  }

  const nombre = sedeNombre?.trim()
  if (!nombre) return { establecimientoId: null, resuelto: false, ambigua: false }

  const deEsaSede = new Set(sedes.filter((s) => s.nombre === nombre).map((s) => s.fk_establecimiento))
  if (deEsaSede.size === 1) {
    return { establecimientoId: [...deEsaSede][0], resuelto: true, ambigua: false }
  }
  return { establecimientoId: null, resuelto: false, ambigua: deEsaSede.size > 1 }
}
