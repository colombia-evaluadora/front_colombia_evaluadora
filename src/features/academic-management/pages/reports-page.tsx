import * as React from "react"
import { useNavigate } from "@tanstack/react-router"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  CheckIcon,
  ClockCountdownIcon,
  FileDownloadOutlinedIcon,
  FileTextIcon,
  PlusIcon,
} from "@/components/ui/icons"
import { paths } from "@/config/paths"
import { CAMBIOS_PENDIENTES, GRUPOS_INFORME, PLANILLAS_PENDIENTES } from "@/features/academic-management/reports/api/mock-data"
import type { EstudianteInforme, PeriodoId } from "@/features/academic-management/reports/api/types"
import { GradesTable } from "@/features/academic-management/reports/components/grades-table"
import { ObservacionesTable } from "@/features/academic-management/reports/components/observaciones-table"
import { ObservacionSheet } from "@/features/academic-management/reports/components/observacion-sheet"
import { PendingChangesBanners } from "@/features/academic-management/reports/components/pending-changes-banners"
import { PeriodoFilter } from "@/features/academic-management/reports/components/periodo-filter"
import { SearchInput } from "@/features/academic-management/reports/components/search-input"

const PANEL_CLASS =
  "rounded-b-lg rounded-tr-lg border border-border bg-background p-4 group-data-[tabs-filled=true]/tabs:rounded-tr-none"

function coincide(estudiante: EstudianteInforme, busqueda: string): boolean {
  const texto = busqueda.trim().toLowerCase()
  if (!texto) return true
  return (
    estudiante.nombreCompleto.toLowerCase().includes(texto) || estudiante.documento.includes(texto)
  )
}

/** `true` si el estudiante tiene, en alguno de los `periodos` marcados arriba,
 *  una nota aún sin confirmar (gris) — bloquea guardar/generar boletín. */
function tieneNotasSinConfirmar(estudiante: EstudianteInforme, periodos: PeriodoId[]): boolean {
  return periodos.some((p) => estudiante.notasPorPeriodo[p]?.confirmado === false)
}

interface GrupoTabContentProps {
  estudiantes: EstudianteInforme[]
  periodos: PeriodoId[]
  preescolar: boolean
  seleccionados: Set<number>
  onToggleEstudiante: (id: number) => void
  onToggleTodos: (idsVisibles: number[]) => void
  onGuardar: () => void
  onGuardarObservacion: (estudianteId: number, periodo: PeriodoId, texto: string) => void
  onLimpiarObservacion: (estudianteId: number, periodo: PeriodoId) => void
}

function GrupoTabContent({
  estudiantes,
  periodos,
  preescolar,
  seleccionados,
  onToggleEstudiante,
  onToggleTodos,
  onGuardar,
  onGuardarObservacion,
  onLimpiarObservacion,
}: GrupoTabContentProps) {
  const [busqueda, setBusqueda] = React.useState("")
  const [observacionAbierta, setObservacionAbierta] = React.useState<{
    estudiante: EstudianteInforme
    periodo: PeriodoId
  } | null>(null)

  const estudiantesFiltrados = React.useMemo(
    () => estudiantes.filter((e) => coincide(e, busqueda)),
    [estudiantes, busqueda],
  )

  const seleccionConPendientes = estudiantes.some(
    (e) => seleccionados.has(e.id) && tieneNotasSinConfirmar(e, periodos),
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={busqueda}
          onValueChange={setBusqueda}
          placeholder={preescolar ? "Buscar por nombre" : "Buscar por nombre y documento"}
          label="Buscar estudiante"
          className="sm:w-96"
        />
        {!preescolar && seleccionConPendientes && (
          <Button type="button" color="primary" size="sm" onClick={onGuardar}>
            <CheckIcon data-icon="inline-start" />
            Guardar notas seleccionadas
          </Button>
        )}
      </div>
      {preescolar ? (
        <>
          <ObservacionesTable
            estudiantes={estudiantesFiltrados}
            periodos={periodos}
            seleccionados={seleccionados}
            onToggleEstudiante={onToggleEstudiante}
            onToggleTodos={() => onToggleTodos(estudiantesFiltrados.map((e) => e.id))}
            onAbrirObservacion={(estudiante, periodo) => setObservacionAbierta({ estudiante, periodo })}
            onLimpiar={(estudiante, periodo) => onLimpiarObservacion(estudiante.id, periodo)}
          />
          <ObservacionSheet
            estudiante={observacionAbierta?.estudiante ?? null}
            periodo={observacionAbierta?.periodo ?? null}
            jornada={observacionAbierta?.estudiante.jornada}
            onOpenChange={(open) => !open && setObservacionAbierta(null)}
            onGuardar={onGuardarObservacion}
          />
        </>
      ) : (
        <GradesTable
          estudiantes={estudiantesFiltrados}
          periodos={periodos}
          seleccionados={seleccionados}
          onToggleEstudiante={onToggleEstudiante}
          onToggleTodos={() => onToggleTodos(estudiantesFiltrados.map((e) => e.id))}
        />
      )}
    </div>
  )
}

function ReportsPageContent() {
  const { notify } = useNotify()
  const navigate = useNavigate()
  const [periodos, setPeriodos] = React.useState<PeriodoId[]>([1, 2])
  const [activeTab, setActiveTab] = React.useState(String(GRUPOS_INFORME[0]?.id))

  // Copia mutable por grupo: acá vive el gris→negro al guardar. No se toca
  // `GRUPOS_INFORME` directo porque es la data "de catálogo" que alimenta
  // a todas las pestañas, incluidas las que el usuario aún no abrió.
  const [estudiantesPorGrupo, setEstudiantesPorGrupo] = React.useState(() =>
    Object.fromEntries(GRUPOS_INFORME.map((g) => [g.id, g.estudiantes])),
  )
  const [seleccionPorGrupo, setSeleccionPorGrupo] = React.useState(() =>
    Object.fromEntries(GRUPOS_INFORME.map((g) => [g.id, new Set<number>()])),
  )

  const grupoActivoId = Number(activeTab)
  const estudiantesActivos = estudiantesPorGrupo[grupoActivoId] ?? []
  const seleccionActiva = seleccionPorGrupo[grupoActivoId] ?? new Set<number>()

  function toggleEstudiante(grupoId: number, id: number) {
    setSeleccionPorGrupo((prev) => {
      const next = new Set(prev[grupoId])
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...prev, [grupoId]: next }
    })
  }

  function toggleTodos(grupoId: number, idsVisibles: number[]) {
    setSeleccionPorGrupo((prev) => {
      const actual = prev[grupoId]
      const todosMarcados = idsVisibles.every((id) => actual.has(id))
      return { ...prev, [grupoId]: todosMarcados ? new Set() : new Set(idsVisibles) }
    })
  }

  function handleGuardar(grupoId: number) {
    const seleccion = seleccionPorGrupo[grupoId]
    setEstudiantesPorGrupo((prev) => ({
      ...prev,
      [grupoId]: prev[grupoId].map((estudiante) => {
        if (!seleccion.has(estudiante.id)) return estudiante
        const notasPorPeriodo = { ...estudiante.notasPorPeriodo }
        for (const periodo of periodos) {
          const notas = notasPorPeriodo[periodo]
          if (notas && !notas.confirmado) notasPorPeriodo[periodo] = { ...notas, confirmado: true }
        }
        return { ...estudiante, notasPorPeriodo }
      }),
    }))
    notify("Notas guardadas: quedan listas para incluirse en el boletín.")
  }

  function handleGuardarObservacion(grupoId: number, estudianteId: number, periodo: PeriodoId, texto: string) {
    setEstudiantesPorGrupo((prev) => ({
      ...prev,
      [grupoId]: prev[grupoId].map((estudiante) => {
        if (estudiante.id !== estudianteId) return estudiante
        return {
          ...estudiante,
          observacionesPorPeriodo: { ...estudiante.observacionesPorPeriodo, [periodo]: texto },
        }
      }),
    }))
    notify("Observación guardada.")
  }

  function handleLimpiarObservacion(grupoId: number, estudianteId: number, periodo: PeriodoId) {
    setEstudiantesPorGrupo((prev) => ({
      ...prev,
      [grupoId]: prev[grupoId].map((estudiante) => {
        if (estudiante.id !== estudianteId) return estudiante
        const observacionesPorPeriodo = { ...estudiante.observacionesPorPeriodo }
        delete observacionesPorPeriodo[periodo]
        return { ...estudiante, observacionesPorPeriodo }
      }),
    }))
    notify("Observación eliminada.")
  }

  function handleGenerarBoletines() {
    if (seleccionActiva.size === 0) {
      notify("Selecciona al menos un estudiante para generar el boletín.", { variant: "error" })
      return
    }
    const conPendientes = estudiantesActivos.filter(
      (e) => seleccionActiva.has(e.id) && tieneNotasSinConfirmar(e, periodos),
    )
    if (conPendientes.length > 0) {
      notify(
        `Guarda primero las notas de ${conPendientes.length === 1 ? conPendientes[0].nombreCompleto : `${conPendientes.length} estudiantes`}: aún tienen notas proyectadas sin confirmar.`,
        { variant: "error" },
      )
      return
    }
    notify("Boletines generados correctamente.")
  }

  function handleHistorial() {
    notify("Aún no hay historial de generaciones para este período.", { variant: "info" })
  }

  function handleDescargar() {
    notify("La descarga del informe consolidado comenzará en breve.")
  }

  function handleVerPlanillasPendientes() {
    notify(`${PLANILLAS_PENDIENTES} docentes aún no registran calificaciones en este período.`, {
      variant: "info",
    })
  }

  function handleIrAPlanilla(docenteId: number) {
    navigate({ to: paths.app.gestionAcademicaInformesPlanillaAprobacion.getHref(docenteId) })
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description="Consulta, sincroniza y genera boletines del período">
          Informes y consolidación de calificaciones
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <PeriodoFilter seleccionados={periodos} onChange={setPeriodos} />

          <div className="flex items-center gap-2">
            <Button variant="outline" color="primary" size="sm" onClick={handleGenerarBoletines}>
              <FileTextIcon data-icon="inline-start" />
              Generar boletines
            </Button>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    color="neutral"
                    size="icon-sm"
                    aria-label="Historial de generaciones"
                    onClick={handleHistorial}
                  />
                }
              >
                <ClockCountdownIcon />
              </TooltipTrigger>
              <TooltipContent>Historial de generaciones</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    color="neutral"
                    size="icon-sm"
                    aria-label="Descargar informe consolidado"
                    onClick={handleDescargar}
                  />
                }
              >
                <FileDownloadOutlinedIcon />
              </TooltipTrigger>
              <TooltipContent>Descargar informe consolidado</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <PendingChangesBanners
          planillasPendientes={PLANILLAS_PENDIENTES}
          cambiosPendientes={CAMBIOS_PENDIENTES}
          onVerPlanillasPendientes={handleVerPlanillasPendientes}
          onIrAPlanilla={handleIrAPlanilla}
        />

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(String(value))}>
          <TabsList variant="folder">
            {GRUPOS_INFORME.map((grupo) => (
              <TabsTrigger key={grupo.id} value={String(grupo.id)}>
                {grupo.nombre}
              </TabsTrigger>
            ))}
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="flex w-10 shrink-0 items-center justify-center border-l border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    aria-label="Agregar grado/grupo"
                    onClick={() => notify("Selección de grados/grupos próximamente.", { variant: "info" })}
                  />
                }
              >
                <PlusIcon />
              </TooltipTrigger>
              <TooltipContent>Agregar grado/grupo</TooltipContent>
            </Tooltip>
          </TabsList>
          {GRUPOS_INFORME.map((grupo) => (
            <TabsContent key={grupo.id} value={String(grupo.id)} className={PANEL_CLASS}>
              <GrupoTabContent
                estudiantes={estudiantesPorGrupo[grupo.id]}
                periodos={periodos}
                preescolar={!!grupo.preescolar}
                seleccionados={seleccionPorGrupo[grupo.id]}
                onToggleEstudiante={(id) => toggleEstudiante(grupo.id, id)}
                onToggleTodos={(idsVisibles) => toggleTodos(grupo.id, idsVisibles)}
                onGuardar={() => handleGuardar(grupo.id)}
                onGuardarObservacion={(estudianteId, periodo, texto) =>
                  handleGuardarObservacion(grupo.id, estudianteId, periodo, texto)
                }
                onLimpiarObservacion={(estudianteId, periodo) =>
                  handleLimpiarObservacion(grupo.id, estudianteId, periodo)
                }
              />
            </TabsContent>
          ))}
        </Tabs>
      </TableScreenBody>
    </TableScreen>
  )
}

export function ReportsPage() {
  return (
    <NoticeProvider>
      <ReportsPageContent />
    </NoticeProvider>
  )
}
