import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { CasoDetalle } from "@/features/gestion-estudiantil/reintegracion/api/types"
import { BadgesEstadoCaso } from "@/features/gestion-estudiantil/reintegracion/components/badges-caso"

/** Línea bajo el título de los modales: estado, sede y jornada, profesional y, si aplica, el retiro. */
export function ResumenCasoDialogo({ caso: c, conRetiro }: { caso: CasoDetalle; conRetiro?: boolean }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Estado: <BadgesEstadoCaso estado={c.estado} etiqueta={c.estado_etiqueta} pendienteValidacion={c.pendiente_validacion} />
        </span>
        <span>
          {c.dias_en_estado} {c.dias_en_estado === 1 ? "día" : "días"} en el estado
        </span>
      </div>
      <span>
        {c.sede} · {c.jornada}
      </span>
      <span>
        Profesional de trabajo social: {c.profesional ? abreviarPersona(c.profesional.nombre) : "Sin asignar"}
      </span>
      {conRetiro && (
        <>
          <span>Origen: {c.origen.nombre}</span>
          <span>
            Retiro de la matrícula: {c.retiro ? formatFecha(c.retiro.fecha_retiro) : "sin retiro"}
          </span>
        </>
      )}
    </div>
  )
}
