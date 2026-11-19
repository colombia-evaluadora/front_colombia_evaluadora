import { abreviarPersona, formatFecha } from "@/features/gestion-estudiantil/commons/utils/formatos"
import type { SenalSMDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"

/** Quién reportó, cuándo, el tipo y lo observado (G.8.SAL.4). */
export function ResumenSenal({ senal: s }: { senal: SenalSMDetalle }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p>
        <span className="text-muted-foreground">
          Reportada por {abreviarPersona(s.reportada_por)} el {formatFecha(s.fecha)}:{" "}
        </span>
        {s.tipo_nombre}
      </p>
      <p>
        <span className="text-muted-foreground">Lo observado: </span>“{s.lo_observado}”
      </p>
      {s.cerrada_en && (
        <p>
          <span className="text-muted-foreground">
            Cerrada el {formatFecha(s.cerrada_en)} por {abreviarPersona(s.cerrada_por)}
          </span>
        </p>
      )}
    </div>
  )
}
