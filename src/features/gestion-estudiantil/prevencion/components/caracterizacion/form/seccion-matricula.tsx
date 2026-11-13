import { LockIcon } from "@/components/ui/icons"

import { Dato } from "@/features/gestion-estudiantil/commons/components/dato"
import { SeccionPlegable } from "@/features/gestion-estudiantil/commons/components/seccion-plegable"
import type { CaracterizacionDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"

const siNo = (v: boolean | null) => (v == null ? null : v ? "Sí" : "No")

/** Datos de la matrícula (solo lectura): se corrigen en Cobertura Educativa, no se digitan de nuevo. */
export function SeccionMatricula({ detalle }: { detalle: CaracterizacionDetalle }) {
  const m = detalle.matricula
  const acudiente = m.acudiente
    ? m.acudiente_parentesco
      ? `${m.acudiente} (${m.acudiente_parentesco.nombre.toLowerCase()})`
      : m.acudiente
    : null
  return (
    <SeccionPlegable
      encuadrada
      comoSeccion
      titulo="Datos de la matrícula"
      subtitulo={
        <span className="inline-flex items-center gap-1">
          <LockIcon aria-hidden="true" className="size-3.5" />
          Se corrigen en Cobertura Educativa
        </span>
      }
      contentClassName="px-4 py-4"
    >
      <dl className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Dato label="Domicilio">{m.direccion}</Dato>
        <Dato label="Estrato">{m.estrato?.nombre}</Dato>
        <Dato label="Sisbén">{m.sisben?.nombre}</Dato>
        <Dato label="Población víctima del conflicto">{m.victima_conflicto?.nombre}</Dato>
        <Dato label="Subsidiado">{siNo(m.subsidiado)}</Dato>
        <Dato label="Acudiente">{acudiente}</Dato>
      </dl>
    </SeccionPlegable>
  )
}
