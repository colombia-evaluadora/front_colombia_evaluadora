import { useMemo } from "react"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { useGestionAlertaQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-gestion-alertas-query"
import type { GestionAlertaDetalle } from "@/features/gestion-estudiantil/prevencion/api/types"
import { ESTADO_GESTION_COLOR } from "@/features/gestion-estudiantil/prevencion/api/ui-mappings"
import { BotonVolver } from "@/features/gestion-estudiantil/prevencion/components/boton-volver"
import { accionesGestion } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/acciones-gestion"
import { DetalleGestion } from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/detalle/detalle-gestion"
import {
  useDialogosGestion,
  type DialogoGestion,
} from "@/features/gestion-estudiantil/prevencion/components/gestion-alertas/dialogos/use-dialogos-gestion"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"

function Encabezado({ d, abrir }: { d: GestionAlertaDetalle; abrir: (x: DialogoGestion) => void }) {
  const { volver } = useNavegacionPrevencion()
  const acciones = useMemo(
    () =>
      accionesGestion(d.banderas, (accion) => {
        if (accion !== "ver") abrir({ dialogo: accion, gestion: d })
      }).filter((a) => a.id !== "ver"),
    [d, abrir],
  )
  return (
    <TableScreenHeader>
      <TableScreenTitle
        action={<AccionesFila modo="menu" etiqueta="Acciones de la gestión" acciones={acciones} />}
        description={<BotonVolver onClick={volver} />}
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 whitespace-normal">
          Gestión de alertas › {d.estudiante_nombre} · {d.grado_grupo}
          <Badge variant="soft" color={ESTADO_GESTION_COLOR[d.estado]}>
            <span>{d.estado_nombre}</span>
          </Badge>
          {d.reincidente && (
            <Badge variant="soft" color="orange">
              <span>Reincidente</span>
            </Badge>
          )}
          {d.seguimiento_reforzado && (
            <Badge variant="soft" color="warning">
              <span>Seguimiento reforzado</span>
            </Badge>
          )}
          {d.ruta_activada && (
            <Badge variant="soft" color="warning">
              <span>Ruta de protección activada</span>
            </Badge>
          )}
        </span>
      </TableScreenTitle>
      <NoticeOutlet className="mx-(--screen-spacing) my-4" />
    </TableScreenHeader>
  )
}

/** Detalle de la gestión de la alerta de inasistencia (§9.11, G.8.GAL.2 y GAL.6). */
export function GestionAlertaDetallePage({ gestionId }: { gestionId: number }) {
  const q = useGestionAlertaQuery(gestionId)
  const dlg = useDialogosGestion()
  const { irGestionAlerta } = useNavegacionPrevencion()
  const { abrir } = dlg
  return (
    <NoticeProvider>
      <TableScreen>
        {q.isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : q.isError || !q.data ? (
          <ErrorNoticeBanner error={q.error ?? true} fallback="No se encontró la gestión de la alerta." className="m-6" />
        ) : (
          <>
            <Encabezado d={q.data} abrir={abrir} />
            <TableScreenBody>
              <DetalleGestion
                d={q.data}
                onContacto={() => abrir({ dialogo: "contacto", gestion: q.data! })}
                onVerAnterior={irGestionAlerta}
                onRegistrarGestion={(remision) => abrir({ dialogo: "remision-gestion", remision })}
                onRegistrarRespuesta={(remision) => abrir({ dialogo: "remision-respuesta", remision })}
              />
            </TableScreenBody>
            {dlg.dialogos}
          </>
        )}
      </TableScreen>
    </NoticeProvider>
  )
}
