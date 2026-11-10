import { format } from "date-fns"
import { es } from "date-fns/locale"

import { DialogoDocumento, HojaDocumento } from "@/features/gestion-estudiantil/commons/components/documento-imprimible"
import { parseDateValue } from "@/lib/date-value"
import { reconocimientosKeys } from "@/features/gestion-estudiantil/reconocimientos/api/query-keys"
import { useMencionHonorQuery } from "@/features/gestion-estudiantil/reconocimientos/api/query/use-reconocimientos-query"

/** `2026-06-15` → «15 de junio de 2026». */
const fechaLarga = (fecha: string) => {
  const d = parseDateValue(fecha.slice(0, 10))
  return d ? format(d, "d 'de' MMMM 'de' yyyy", { locale: es }) : fecha
}

/**
 * Mención de honor imprimible (G.6.DOC.1): datos de `GET /reconocimientos/:ID/mencion-honor`. Las firmas
 * son líneas en blanco; no lleva QR porque el backend aún no emite documento ni código de verificación.
 */
export function DialogMencionHonor({ reconocimientoId, onClose }: { reconocimientoId: number; onClose: () => void }) {
  const { data: d, isPending, error } = useMencionHonorQuery(reconocimientoId)
  return (
    <DialogoDocumento titulo="Mención de honor" isPending={isPending} error={error} onClose={onClose}>
      {d && (
        <HojaDocumento claveModulo={reconocimientosKeys.all} encabezado={d} titulo="Mención de honor" subtitulo="otorgada a">
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-2xl font-bold uppercase">
              {d.estudiante} · {d.grado_grupo}
            </p>
            <p>
              por su <span className="font-semibold">{d.tipo_nombre}</span>
            </p>
            <p className="italic">«{d.motivo}»</p>
          </div>
          <p className="pt-10 text-xs">
            {d.municipio}, {fechaLarga(d.fecha)}
          </p>
          <div className="grid grid-cols-1 gap-10 pt-10 sm:grid-cols-2">
            <div className="flex flex-col items-center gap-0.5 border-t border-foreground pt-1">
              <span className="text-xs">Rector(a)</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 border-t border-foreground pt-1">
              <span className="text-xs">Responsable de grupo</span>
            </div>
          </div>
        </HojaDocumento>
      )}
    </DialogoDocumento>
  )
}
