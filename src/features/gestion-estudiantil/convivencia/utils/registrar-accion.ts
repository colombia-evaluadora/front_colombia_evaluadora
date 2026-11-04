import { formatDateValue } from "@/lib/date-value"

import { codigoDe, type OpcionCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { COD } from "@/features/gestion-estudiantil/convivencia/api/ui-mappings"
import type { CasoDetalle } from "@/features/gestion-estudiantil/convivencia/api/types"
import { errorLargo } from "@/features/gestion-estudiantil/convivencia/api/validaciones"

export interface CodigoSiuce {
  /** `m:<matrícula>` o `f:<funcionario>`: el afectado puede ser estudiante o funcionario del establecimiento. */
  afectado: string
  codigo: string
}

export interface FechaHora {
  fecha: string
  hora: string
}

export const ahora = (): FechaHora => {
  const d = new Date()
  return { fecha: formatDateValue(d), hora: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` }
}

/** Afectados del caso: estudiantes y funcionarios del establecimiento con rol Afectado. */
export function afectadosDe(d: CasoDetalle | undefined, roles: OpcionCatalogo[]) {
  return [
    ...(d?.estudiantes ?? [])
      .filter((e) => codigoDe(roles, e.fk_tlv_rol) === COD.afectado)
      .map((e) => ({ value: `m:${e.fk_matricula}`, label: e.nombre })),
    ...(d?.otros_involucrados ?? [])
      .filter((i) => i.fk_funcionario && codigoDe(roles, i.fk_tlv_rol) === COD.afectado)
      .map((i) => ({ value: `f:${i.fk_funcionario}`, label: `${i.nombre ?? ""} (${i.tipo_nombre ?? "funcionario"})` })),
  ]
}

export interface ValoresAccion {
  accion: string
  fechaHora: FechaHora
  descripcion: string
  entidad: string
  resultado: string
  codigos: CodigoSiuce[]
}

export interface ReglasAccion {
  conEntidad: boolean
  esSeguimiento: boolean
  esSiuce: boolean
}

/** Validaciones de cliente de Registrar acción (3.2); `ahoraTxt` es el momento contra el que se compara. */
export function erroresAccion(v: ValoresAccion, r: ReglasAccion, ahoraTxt: FechaHora = ahora()) {
  const { fechaHora, codigos } = v
  return {
    accion: !v.accion ? "Elija la acción." : undefined,
    fecha:
      !fechaHora.fecha || !fechaHora.hora
        ? "La fecha y la hora son obligatorias."
        : `${fechaHora.fecha} ${fechaHora.hora}` > `${ahoraTxt.fecha} ${ahoraTxt.hora}`
          ? "La fecha y hora no pueden ser posteriores al momento actual."
          : undefined,
    descripcion: errorLargo(v.descripcion, 10, 2000, "La descripción"),
    entidad: r.conEntidad && !v.entidad ? "La entidad es obligatoria en esta acción." : undefined,
    resultado: r.esSeguimiento && !v.resultado ? "El resultado del seguimiento es obligatorio." : undefined,
    codigos: !r.esSiuce
      ? undefined
      : !codigos.length
        ? "Agregue el código de al menos un afectado."
        : codigos.some((c) => !c.afectado || !c.codigo.trim() || c.codigo.trim().length > 50)
          ? "Cada fila lleva afectado y un código de 1 a 50 caracteres."
          : new Set(codigos.map((c) => c.afectado)).size !== codigos.length
            ? "Un afectado no se repite."
            : undefined,
  }
}

export type ErroresAccion = ReturnType<typeof erroresAccion>

/** `CODIGOS_SIUCE` del body: separa el afectado en matrícula o funcionario. */
export const codigosSiuceBody = (codigos: CodigoSiuce[]) =>
  codigos.map((c) => {
    const [k, id] = c.afectado.split(":")
    return { fk_matricula: k === "m" ? Number(id) : null, fk_funcionario: k === "f" ? Number(id) : null, codigo: c.codigo.trim() }
  })
