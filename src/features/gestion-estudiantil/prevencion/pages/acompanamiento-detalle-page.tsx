import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { Skeleton } from "@/components/ui/skeleton"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { useAcompanamientoQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-acompanamientos-query"
import type { AcompanamientoDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { TITULO_ACOMP } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"
import { BotonVolver } from "@/features/gestion-estudiantil/prevencion/components/boton-volver"
import { accionesAcomp } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/acciones-acompanamiento"
import { BadgeEstadoAcomp } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/badges-acompanamiento"
import { DetalleAcompanamiento } from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/detalle/detalle-acompanamiento"
import {
  useDialogosAcompanamiento,
  type DialogoAcomp,
} from "@/features/gestion-estudiantil/prevencion/components/acompanamientos/dialogos/use-dialogos-acompanamiento"
import { resumenDesdeDetalle } from "@/features/gestion-estudiantil/prevencion/utils/formularios-acompanamiento"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"

function Encabezado({ d, abrir }: { d: AcompanamientoDetalle; abrir: (x: DialogoAcomp) => void }) {
  const { volver, irAcompEditar } = useNavegacionPrevencion()
  const acciones = accionesAcomp(d, (accion) => {
    if (accion === "modificar") irAcompEditar(d.id)
    else if (accion !== "ver") abrir({ dialogo: accion, acomp: resumenDesdeDetalle(d) })
  }).filter((a) => a.id !== "ver")
  return (
    <TableScreenHeader>
      <TableScreenTitle
        ruta="Prevención"
        action={<AccionesFila modo="menu" etiqueta="Acciones del acompañamiento" acciones={acciones} />}
        description={<BotonVolver onClick={volver} />}
      >
        <span className="inline-flex flex-wrap items-center gap-2">
          {TITULO_ACOMP[d.tipo]} · {d.contexto.estudiante_nombre} · {d.contexto.grado_grupo}
          <BadgeEstadoAcomp estado={d.estado} nombre={d.estado_nombre} />
        </span>
      </TableScreenTitle>
      <NoticeOutlet className="mx-(--screen-spacing) my-4" />
    </TableScreenHeader>
  )
}

/** Detalle de un acompañamiento (§9.9, §9.10). Abrirlo deja traza de consulta (Regla 21). */
export function AcompanamientoDetallePage({ acompId }: { acompId: number }) {
  const q = useAcompanamientoQuery(acompId)
  const dlg = useDialogosAcompanamiento()
  return (
    <NoticeProvider>
      <TableScreen>
        {q.isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : q.isError || !q.data ? (
          <ErrorNoticeBanner error={q.error ?? true} fallback="No se encontró el acompañamiento solicitado." className="m-6" />
        ) : (
          <>
            <Encabezado d={q.data} abrir={dlg.abrir} />
            <TableScreenBody>
              <DetalleAcompanamiento
                d={q.data}
                onResultado={(accion) => dlg.abrir({ dialogo: "resultado", acomp: resumenDesdeDetalle(q.data!), accion })}
                onEditarAccion={(accion) => dlg.abrir({ dialogo: "accion", acomp: resumenDesdeDetalle(q.data!), accion })}
              />
            </TableScreenBody>
            {dlg.dialogos}
          </>
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
