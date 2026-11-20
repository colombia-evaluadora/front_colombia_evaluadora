import type { PeriodoOpcionCupo } from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"

export interface OpcionCupo {
  establecimiento: string
  sede: string
  jornada: string
  /** Grupo de admisión ("2028 · Anual · Ciclo 1"): solo se pide si la sede y jornada tienen el grado en dos períodos. */
  modalidad: string
}

export interface Hermano {
  tiene: boolean | null
  documento: string
}

export const opcionVacia = (): OpcionCupo => ({ establecimiento: "", sede: "", jornada: "", modalidad: "" })

// Documento del hermano (Regla 27): dígitos o alfanumérico extranjero, sin puntos ni espacios.
export const DOCUMENTO_HERMANO = /^[A-Za-z0-9]{5,20}$/

const unicos = (xs: string[]) => [...new Set(xs)]

// Cascada de las opciones (Grado → Establecimiento → Sede → Jornada → Modalidad) sobre los
// períodos que devuelve el backend (`fn_inscripcion_opciones_cupo_publicas_interno`).
export const gradosDe = (periodos: PeriodoOpcionCupo[]) => unicos(periodos.flatMap((p) => p.grados.map((g) => g.nombre)))

const conGrado = (periodos: PeriodoOpcionCupo[], grado: string) =>
  periodos.filter((p) => p.grados.some((g) => g.nombre === grado))

export const establecimientosDe = (periodos: PeriodoOpcionCupo[], grado: string) =>
  unicos(conGrado(periodos, grado).map((p) => p.establecimiento))

export const sedesDe = (periodos: PeriodoOpcionCupo[], grado: string, establecimiento: string) =>
  unicos(conGrado(periodos, grado).filter((p) => p.establecimiento === establecimiento).map((p) => p.sede))

export const jornadasDe = (periodos: PeriodoOpcionCupo[], grado: string, establecimiento: string, sede: string) =>
  unicos(
    conGrado(periodos, grado)
      .filter((p) => p.establecimiento === establecimiento && p.sede === sede)
      .map((p) => p.jornada),
  )

const candidatos = (periodos: PeriodoOpcionCupo[], grado: string, o: OpcionCupo) =>
  conGrado(periodos, grado).filter(
    (p) => p.establecimiento === o.establecimiento && p.sede === o.sede && p.jornada === o.jornada,
  )

export const modalidadesDe = (periodos: PeriodoOpcionCupo[], grado: string, o: OpcionCupo) =>
  unicos(candidatos(periodos, grado, o).map((p) => p.grupoAdmision))

/** La sede y jornada tienen el grado en dos períodos: hay que elegir la modalidad. */
export const pideModalidad = (periodos: PeriodoOpcionCupo[], grado: string, o: OpcionCupo) =>
  modalidadesDe(periodos, grado, o).length > 1

/** `{periodo, grado}` de la opción, o `null` si está incompleta o ya no existe. */
export function resolverOpcionPublica(periodos: PeriodoOpcionCupo[], grado: string, o: OpcionCupo) {
  const lista = candidatos(periodos, grado, o)
  const periodo = lista.length > 1 ? lista.find((p) => p.grupoAdmision === o.modalidad) : lista[0]
  const g = periodo?.grados.find((x) => x.nombre === grado)
  return periodo && g ? { periodo: periodo.periodoId, grado: g.id } : null
}

export const opcionCompleta = (periodos: PeriodoOpcionCupo[], grado: string, o: OpcionCupo) =>
  resolverOpcionPublica(periodos, grado, o) != null

/** Todas las opciones del mismo Año·Modalidad·Ciclo (Regla 27): el backend lo exige. */
export function mismoGrupoAdmision(periodos: PeriodoOpcionCupo[], grado: string, opciones: OpcionCupo[]) {
  const grupos = new Set(
    opciones
      .map((o) => resolverOpcionPublica(periodos, grado, o))
      .map((r) => periodos.find((p) => p.periodoId === r?.periodo)?.grupoAdmisionId)
      .filter((g) => g != null),
  )
  return grupos.size <= 1
}

export const hermanoValido = (h: Hermano) => h.tiene === false || (h.tiene === true && DOCUMENTO_HERMANO.test(h.documento))

/** "diana.arias@gmail.com" → "di****@gm***.com" (Regla 31: no exponer datos). */
export function enmascararCorreo(correo: string) {
  const [usuario = "", dominio = ""] = correo.split("@")
  const punto = dominio.lastIndexOf(".")
  const nombre = punto > 0 ? dominio.slice(0, punto) : dominio
  const tld = punto > 0 ? dominio.slice(punto) : ""
  return `${usuario.slice(0, 2)}****@${nombre.slice(0, 2)}***${tld}`
}
