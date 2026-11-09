"use no memo"

import * as React from "react"
import type { SesionCalendario } from "@/features/academic-management/asistencia/api/types/asistencia"
import type { AsistenciaSearch } from "@/features/academic-management/asistencia/api/schema"
import { Link, useBlocker, Navigate } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
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
  "rounded-lg border border-border bg-background p-4"


/** Clases del día como planillas: bloques seguidos de la misma [Área] son una sola. */
function aSesionesDelDia(sesiones: SesionCalendario[], fecha: string): SesionTab[] {
  return agruparPorBloquesContinuos(sesiones.filter((s) => s.fecha === fecha))
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
}

export function AsistenciaManualPage() {
  const { fecha, sede, grupo: grupoInicial, asignatura: asignaturaInicial, desde, periodo } =
    asistenciaManualRoute.useSearch()
  // Sin `fecha`/`sede` válidas se vuelve al calendario conservando lo que haya llegado.
  if (!fecha || sede == null) {
    return <Navigate to={paths.app.asistencia.getHref()} search={{ sede, fecha }} replace />
  }
  return (
    <AsistenciaManualContent
      fecha={fecha}
      sede={sede}
      grupoInicial={grupoInicial}
      asignaturaInicial={asignaturaInicial}
      volver={
        desde === "grupo"
          ? { sede, vista: "grupo", grupo: grupoInicial, asignatura: asignaturaInicial, periodo }
          : { sede, fecha }
      }
    />
  )
}

function AsistenciaManualContent({
  fecha,
  sede,
  grupoInicial,
  asignaturaInicial,
  volver,
}: {
  fecha: string
  sede: number
  /** "Registrar sesión": la clase que se abre primero. */
  grupoInicial?: number
  asignaturaInicial?: number
  /** Búsqueda de la pestaña de Asistencias a la que regresa Volver. */
  volver: AsistenciaSearch
}) {
  const [anio, mes] = fecha.split("-").map(Number)

  const { isDocente: esDocente, esAdminEstablecimiento } = useAsistenciaAccess()
  // El administrador del establecimiento registra cualquier clase: no se acota a las que dicta.
  const isDocente = esDocente && !esAdminEstablecimiento
  // Regla 76: todos los de su alcance abren la planilla; solo marcan las clases que dictan
  // (MIAS), aunque además sean directores de grupo (Regla 74).
  const { data: todas, isPending: cargandoTodas } = useAsistenciaCalendarioQuery({ SEDE: sede, ANIO: anio, MES: mes })
  const { data: propias, isPending: cargandoPropias } = useAsistenciaCalendarioQuery(
    { SEDE: sede, ANIO: anio, MES: mes, MIAS: true },
    isDocente,
  )
  const isPending = cargandoTodas || (isDocente && cargandoPropias)

  const sesionesVisibles = React.useMemo(() => aSesionesDelDia(todas ?? [], fecha), [todas, fecha])
  const idsPropios = new Set(aSesionesDelDia(propias ?? [], fecha).map((s) => s.id))
  // Sin clase elegida, las pestañas son las propias del docente (o todas, en solo lectura).
  const sesionesDelDia = isDocente ? sesionesVisibles.filter((s) => idsPropios.has(s.id)) : sesionesVisibles
  const esSoloLectura = (s: SesionTab) => !esAdminEstablecimiento && (!isDocente || !idsPropios.has(s.id))

  const [activeTab, setActiveTab] = React.useState<string | undefined>(undefined)
  const [accionesSlot, setAccionesSlot] = React.useState<HTMLDivElement | null>(null)
  const tabInicial =
    sesionesDelDia.find((s) => s.fkGrupo === grupoInicial && s.fkAsignatura === asignaturaInicial)?.id ??
    sesionesDelDia[0]?.id
  const currentTab = activeTab ?? tabInicial
  // Sección 7: la planilla es de UNA clase, la elegida en el Calendario o en Asistencia por grupo.
  const sesionElegida =
    grupoInicial != null
      ? sesionesVisibles.find((s) => s.fkGrupo === grupoInicial && s.fkAsignatura === asignaturaInicial)
      : sesionesDelDia.length === 1
        ? sesionesDelDia[0]
        : undefined
  const fechaTitulo = (() => {
    const texto = new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    return texto.charAt(0).toUpperCase() + texto.slice(1).replace(",", "")
  })()
  const titulo = sesionElegida
    ? `Asistencias › ${sesionElegida.grado}${sesionElegida.grupo} · ${nombreSesion(sesionElegida)} · ${fechaTitulo}`
    : `Asistencias › ${fechaTitulo}`
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

  // Salir de la planilla (Volver, el menú, otra ruta) con cambios sin guardar pregunta antes.
  const salida = useBlocker({
    shouldBlockFn: () => controlRef.current?.hayCambios() ?? false,
    enableBeforeUnload: () => controlRef.current?.hayCambios() ?? false,
    withResolver: true,
  })

  async function handleGuardarYSalir() {
    setGuardandoCambio(true)
    const ok = (await controlRef.current?.guardar()) ?? true
    setGuardandoCambio(false)
    // Con el período cerrado, guardar abre el motivo: la salida espera a que se envíe.
    if (ok) salida.proceed?.()
    else salida.reset?.()
  }

  return (
    <NoticeProvider>
      <TableScreen>
        <TableScreenHeader>
          <TableScreenTitle
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  color="neutral"
                  size="sm"
                  render={<Link to={paths.app.asistencia.getHref()} search={volver} />}
                  nativeButton={false}
                >
                  <ArrowLeftIcon data-icon="inline-start" />
                  Volver
                </Button>
                {/* Cancelar y Guardar: los pone la planilla, que es la que sabe si hay cambios. */}
                <div ref={setAccionesSlot} className="contents" />
              </div>
            }
          >
            <span className="flex items-center gap-2">
              {titulo}
              {sesionElegida && esSoloLectura(sesionElegida) && (
                <Badge variant="soft" color="neutral">
                  Solo lectura
                </Badge>
              )}
            </span>
          </TableScreenTitle>
          <NoticeOutlet className="mx-(--screen-spacing) my-4" />
        </TableScreenHeader>

        <TableScreenBody>

        {isPending && <Skeleton className="h-64 w-full" />}

        {esFechaFutura(fecha) && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Todavía no se puede tomar asistencia: {formatFechaLarga(fecha)} es una fecha futura.
          </p>
        )}

        {!isPending && !esFechaFutura(fecha) && !sesionElegida && sesionesDelDia.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay sesiones programadas para este día.
          </p>
        )}

        {!isPending && !esFechaFutura(fecha) && sesionElegida && (
          <div className="rounded-lg border border-border bg-background p-4">
            <AsistenciaSesionTabContent
              sesion={sesionElegida}
              fecha={fecha}
              controlRef={controlRef}
              soloLectura={esSoloLectura(sesionElegida)}
              accionesSlot={accionesSlot}
            />
          </div>
        )}

        {/* Sin clase elegida (enlace viejo o URL a mano): se elige entre las del día. */}
        {!isPending && !esFechaFutura(fecha) && !sesionElegida && sesionesDelDia.length > 0 && (
          <Tabs value={currentTab} onValueChange={(value) => handleTabChange(String(value))}>
            <TabsList>
              {sesionesDelDia.map((sesion) => (
                <TabsTrigger key={sesion.id} value={sesion.id}>
                  {sesion.grado}{sesion.grupo} · {nombreSesion(sesion)}
                </TabsTrigger>
              ))}
            </TabsList>
            {sesionesDelDia.map((sesion) => (
              <TabsContent key={sesion.id} value={sesion.id} className={PANEL_CLASS}>
                <AsistenciaSesionTabContent
                  sesion={sesion}
                  fecha={fecha}
                  controlRef={controlRef}
                  soloLectura={esSoloLectura(sesion)}
                  accionesSlot={sesion.id === currentTab ? accionesSlot : null}
                />
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
        <DialogGuardarCambioSesion
          open={salida.status === "blocked"}
          guardandoCambio={guardandoCambio}
          soloEnLineaCambio={soloEnLineaCambio}
          onCancelar={() => salida.reset?.()}
          onDescartar={() => salida.proceed?.()}
          onGuardar={handleGuardarYSalir}
        />
        </TableScreenBody>
      </TableScreen>
    </NoticeProvider>
  )
}
