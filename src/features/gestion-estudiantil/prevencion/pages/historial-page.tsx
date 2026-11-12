import { useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, ClipboardCheckIcon, ClipboardTextIcon, GearIcon, ListMagnifyingGlassIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { paths } from "@/config/paths"

import { AccionesFila } from "@/features/gestion-estudiantil/commons/components/acciones-fila"
import { useHistorialQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-tablero-query"
import { LineaTiempo } from "@/features/gestion-estudiantil/prevencion/components/historial/linea-tiempo"
import { ResumenHistorial } from "@/features/gestion-estudiantil/prevencion/components/historial/resumen-historial"
import { useNavegacionPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-navegacion-prevencion"
import { construirFilas, ultimaValoracionVigente } from "@/features/gestion-estudiantil/prevencion/utils/historial"

interface Props {
  matricula: number
  /** Grado/Grupo que manda el tablero: el historial no lo devuelve. */
  gradoGrupo?: string
}

function HistorialContent({ matricula, gradoGrupo }: Props) {
  const navigate = useNavigate()
  const { irValorar, irPlanNuevo, irPlan } = useNavegacionPrevencion()
  const q = useHistorialQuery(matricula)
  const h = q.data
  const filas = useMemo(() => (h ? construirFilas(h) : []), [h])

  const volver = () => navigate({ to: paths.app.prevencionRetencion.getHref() } as never)
  const nombre = h?.estudiante_nombre ?? ""

  return (
    <>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" type="button" disabled={!h?.puede_valorar} onClick={() => irValorar(matricula)}>
                <ClipboardCheckIcon data-icon="inline-start" />
                Valorar
              </Button>
              <AccionesFila
                modo="menu"
                etiqueta={`Acciones de ${nombre}`}
                acciones={[
                  {
                    id: "plan",
                    label: "Crear plan",
                    icon: <ClipboardTextIcon />,
                    disabled: !h || h.tiene_plan_abierto,
                    onSelect: () => irPlanNuevo(matricula, h ? ultimaValoracionVigente(h) : undefined),
                  },
                  {
                    id: "ver-plan",
                    label: "Ver plan",
                    icon: <ListMagnifyingGlassIcon />,
                    disabled: h?.fk_tprevencion_plan_abierto == null,
                    onSelect: () => h?.fk_tprevencion_plan_abierto != null && irPlan(h.fk_tprevencion_plan_abierto),
                  },
                  {
                    id: "gestionar",
                    label: "Gestionar",
                    icon: <GearIcon />,
                    // Gestión de alertas (9.11) no tiene backend.
                    disabled: true,
                    onSelect: () => undefined,
                  },
                ]}
              />
            </div>
          }
          description={
            <Button variant="ghost" color="neutral" size="sm" className="-ml-3" onClick={volver}>
              <ArrowLeftIcon data-icon="inline-start" />
              Volver a Prevención y retención
            </Button>
          }
        >
          <span className="whitespace-normal">{h ? `Prevención › Historial · ${nombre}${gradoGrupo ? ` · ${gradoGrupo}` : ""}` : "Prevención › Historial"}</span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        {q.isPending ? (
          <Skeleton className="m-6 h-96" />
        ) : q.isError || !h ? (
          <ErrorNoticeBanner error={q.error ?? true} fallback="No se encontró el estudiante solicitado." className="m-6" />
        ) : (
          <div className="flex flex-col gap-4 pb-6">
            <ResumenHistorial historial={h} />
            <LineaTiempo filas={filas} />
          </div>
        )}
      </TableScreenBody>
    </>
  )
}

/** Historial del estudiante (G.8.TAB.7): nivel y plan actuales y la línea de tiempo del acompañamiento. */
export function HistorialPage(props: Props) {
  return (
    <NoticeProvider>
      <TableScreen>
        <HistorialContent {...props} />
      </TableScreen>
    </NoticeProvider>
  )
}
