"use no memo"

import * as React from "react"
import { Link, Navigate } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { ArrowLeftIcon } from "@/components/ui/icons"

import { paths } from "@/config/paths"
import { asistenciaManualRoute } from "@/router"
import { useAsistenciaCalendarioQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-calendario-query"
import { useAsistenciaAccess } from "@/features/academic-management/asistencia/hooks/use-es-docente"
import { agruparPorBloquesContinuos, compararPorHora, esFechaFutura } from "@/features/academic-management/asistencia/api/ui-mappings"
import { AsistenciaSesionTabContent } from "@/features/academic-management/asistencia/components/asistencia-sesion-tab-content"
import { DialogGuardarCambioSesion } from "@/features/academic-management/asistencia/components/dialogs/dialog-guardar-cambio-sesion"
import {
  formatFechaLarga,
  nombreSesion,
  type SesionControl,
  type SesionTab,
} from "@/features/academic-management/asistencia/utils/asistencia-manual"

const PANEL_CLASS =
  "rounded-b-lg rounded-tr-lg border border-border bg-background p-4 group-data-[tabs-filled=true]/tabs:rounded-tr-none"


export function AsistenciaManualPage() {
  const { fecha, sede } = asistenciaManualRoute.useSearch()
  // Sin `fecha`/`sede` válidas se vuelve al calendario conservando lo que haya llegado.
  if (!fecha || sede == null) {
    return <Navigate to={paths.app.asistencia.getHref()} search={{ sede, fecha }} replace />
  }
  return <AsistenciaManualContent fecha={fecha} sede={sede} />
}

function AsistenciaManualContent({ fecha, sede }: { fecha: string; sede: number }) {
  const [anio, mes] = fecha.split("-").map(Number)

  const { isDocente } = useAsistenciaAccess()
  // Solo escritura: se filtra a lo que el usuario dicta aunque sea director de grupo (Regla 74).
  const { data: sesiones, isPending } = useAsistenciaCalendarioQuery(
    {
      SEDE: sede,
      ANIO: anio,
      MES: mes,
      MIAS: true,
    },
    isDocente,
  )

  const sesionesDelDia: SesionTab[] = React.useMemo(() => {
    const delDia = (sesiones ?? []).filter((s) => s.fecha === fecha)
    return agruparPorBloquesContinuos(delDia)
      .sort(compararPorHora)
      .map((b) => ({
        // Una actividad no tiene bloque: se identifica sola.
        id: b.esFormativa ? `${b.fkGrupo}-actividad-${b.fkActividad}` : `${b.fkGrupo}-${b.fkAsignatura}-${b.bloque}`,
        fkGrupo: b.fkGrupo,
        grado: b.grado,
        grupo: b.grupo,
        jornada: b.jornada,
        fkAsignatura: b.fkAsignatura,
        asignatura: b.asignatura,
        bloque: b.bloque,
        bloques: b.bloques,
        esFormativa: b.esFormativa,
        fkActividad: b.fkActividad,
        actividad: b.actividad,
        horasPorBloque: b.horasPorBloque,
        horaInicio: b.horaInicio,
        horaFin: b.horaFin,
      }))
  }, [sesiones, fecha])

  const [activeTab, setActiveTab] = React.useState<string | undefined>(undefined)
  const currentTab = activeTab ?? sesionesDelDia[0]?.id
  // Solo hay una pestaña montada a la vez (el panel oculto se desmonta y pierde lo marcado).
  const controlRef = React.useRef<SesionControl | null>(null)
  const [tabPendiente, setTabPendiente] = React.useState<string | null>(null)
  const [guardandoCambio, setGuardandoCambio] = React.useState(false)

  function handleTabChange(next: string) {
    if (next === currentTab) return
    if (controlRef.current?.hayCambios()) {
      setTabPendiente(next)
      return
    }
    setActiveTab(next)
  }

  function irATabPendiente() {
    if (tabPendiente) setActiveTab(tabPendiente)
    setTabPendiente(null)
  }

  const soloEnLineaCambio = useOnlineOnly()

  async function handleGuardarYCambiar() {
    setGuardandoCambio(true)
    const ok = (await controlRef.current?.guardar()) ?? true
    setGuardandoCambio(false)
    if (ok) irATabPendiente()
    else setTabPendiente(null)
  }

  return (
    <NoticeProvider>
      <TableScreen>
        <TableScreenHeader>
          <TableScreenTitle>Asistencia</TableScreenTitle>
          <NoticeOutlet className="mx-(--screen-spacing) my-4" />
        </TableScreenHeader>

        <TableScreenBody>
        <div className="mb-4 flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  color="neutral"
                  size="icon-xs"
                  aria-label="Volver a Asistencia"
                  render={<Link to={paths.app.asistencia.getHref()} search={{ sede, fecha }} />}
                  nativeButton={false}
                />
              }
            >
              <ArrowLeftIcon />
            </TooltipTrigger>
            <TooltipContent>Volver a Asistencia</TooltipContent>
          </Tooltip>
          <h2 className="text-base font-semibold">Asistencia manual</h2>
        </div>

        {!isDocente && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Solo un docente puede registrar o editar asistencia. Tu rol tiene acceso de solo consulta.
          </p>
        )}

        {isDocente && isPending && <Skeleton className="h-64 w-full" />}

        {isDocente && esFechaFutura(fecha) && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Todavía no se puede tomar asistencia: {formatFechaLarga(fecha)} es una fecha futura.
          </p>
        )}

        {isDocente && !isPending && !esFechaFutura(fecha) && sesionesDelDia.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay sesiones programadas para este día.
          </p>
        )}

        {isDocente && !isPending && !esFechaFutura(fecha) && sesionesDelDia.length > 0 && (
          <Tabs value={currentTab} onValueChange={(value) => handleTabChange(String(value))}>
            <TabsList variant="folder">
              {sesionesDelDia.map((sesion) => (
                <TabsTrigger key={sesion.id} value={sesion.id}>
                  {sesion.grado}{sesion.grupo} · {nombreSesion(sesion)}
                </TabsTrigger>
              ))}
            </TabsList>
            {sesionesDelDia.map((sesion) => (
              <TabsContent key={sesion.id} value={sesion.id} className={PANEL_CLASS}>
                <AsistenciaSesionTabContent sesion={sesion} fecha={fecha} controlRef={controlRef} />
              </TabsContent>
            ))}
          </Tabs>
        )}

        <DialogGuardarCambioSesion
          open={tabPendiente !== null}
          guardandoCambio={guardandoCambio}
          soloEnLineaCambio={soloEnLineaCambio}
          onCancelar={() => setTabPendiente(null)}
          onDescartar={irATabPendiente}
          onGuardar={handleGuardarYCambiar}
        />
        </TableScreenBody>
      </TableScreen>
    </NoticeProvider>
  )
}
