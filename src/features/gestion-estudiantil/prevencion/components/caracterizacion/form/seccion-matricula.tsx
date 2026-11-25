import { FichaDatos } from "@/components/ficha-datos"
import { LockIcon } from "@/components/ui/icons"

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
          Se corrigen en Cobertura educativa
        </span>
      }
      contentClassName="px-4 py-4"
    >
      <FichaDatos
        datos={[
          { etiqueta: "Domicilio", valor: m.direccion },
          { etiqueta: "Estrato", valor: m.estrato?.nombre },
          { etiqueta: "Sisbén", valor: m.sisben?.nombre },
          { etiqueta: "Población víctima del conflicto", valor: m.victima_conflicto?.nombre },
          { etiqueta: "Subsidiado", valor: siNo(m.subsidiado) },
          { etiqueta: "Acudiente", valor: acudiente },
        ]}
      />
    </SeccionPlegable>
  )
}
