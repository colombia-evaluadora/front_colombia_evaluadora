import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { useOnlineOnly } from "@/lib/offline/use-online-only"
import { paths } from "@/config/paths"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { InfoIcon, MagnifyingGlassIcon, PlusCircleIcon, PlusIcon } from "@/components/ui/icons"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { getErrorMessage } from "@/lib/api-client"

import { useUnidadActividadesDisponiblesQuery } from "@/features/planeador/api/query/use-unidad-actividades-disponibles-query"
import { useUnidadReferenteQuery } from "@/features/planeador/api/query/use-unidad-referente-query"
import {
  useUnidadesTabsQuery,
  instrumentoLabelFromReferente,
} from "@/features/planeador/api/query/use-unidades-tabs-query"
import { UNIDAD_TAB_FALLBACK } from "@/features/planeador/components/planeador-tabs"
import { articuloDefinido } from "@/features/planeador/lib/unidad-instrumento-label"
import {
  ROTULO_ACTIVIDAD_FALLBACK,
  rotuloEnMinuscula,
} from "@/features/planeador/api/query/use-rotulo-actividad-query"
import { useLinkActividadUnidad } from "@/features/planeador/api/mutations/link-actividad-unidad"
import { useUpdatePuntajeActividadUnidad } from "@/features/planeador/api/mutations/update-puntaje-actividad-unidad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"
import { usePlaneadorSoloLectura } from "@/features/planeador/hooks/use-planeador-solo-lectura"

interface DialogAgregarActividadProps {
  unidad: UnidadTematica
  /** Rótulo de la unidad del panel; gana sobre el resuelto por referente para que coincidan. */
  rotuloUnidad?: string
}

/**
 * Popover "Vincular actividad". En Suma de puntos el puntaje va en un 2º request (`fn_unidad_actividad_vincular` no lo acepta).
 * `porcentajeDisponible` llega por fila (`fn_unidad_ponderacion_disponible`, V223): tope por (unidad, grupo).
 */
export function DialogAgregarActividad({ unidad, rotuloUnidad }: DialogAgregarActividadProps) {
  const { puedeCrear } = usePlaneadorSoloLectura()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  // Borrador de peso/puntaje: no dispara nada hasta "Vincular"; se limpia al cerrar.
  const [pesos, setPesos] = useState<Record<string, string>>({})
  // Error del back dentro del popover: la página monta un `NoticeProvider`
  // (toast global de axios suprimido) y el aviso de página queda tapado por
  // el popover, así que un rechazo al vincular pasaba en silencio.
  const [notice, setNotice] = useState<Notice | null>(null)
  const mostrarError = (error: unknown) => setNotice({ id: Date.now(), message: getErrorMessage(error) })

  const { data: disponibles = [] } = useUnidadActividadesDisponiblesQuery(unidad.id, search)
  const linkActividad = useLinkActividadUnidad()
  // Sin red no se vinculan actividades (plan offline §7.5).
  const soloEnLinea = useOnlineOnly()
  const updatePuntaje = useUpdatePuntajeActividadUnidad()

  // Formativa no califica: sin peso. Se usa el referente real; `unidad.enfoquePedagogico` siempre llega "Evaluativo".
  const { data: unidadReferente } = useUnidadReferenteQuery(unidad.id)
  const esFormativa = unidadReferente?.esFormativo ?? false
  const esPonderado = !esFormativa && unidad.metodoCalculo === "Ponderado"
  const esSumatoria = !esFormativa && unidad.metodoCalculo === "Suma de puntos"
  const pideValor = esPonderado || esSumatoria

  // El rótulo del instrumento varía por nivel; se resuelve por `referente.id` para coincidir con sus etiquetas.
  const { data: unidadTabs } = useUnidadesTabsQuery()
  const instrumentoLabel =
    rotuloUnidad || instrumentoLabelFromReferente(unidadReferente?.id, unidadTabs, UNIDAD_TAB_FALLBACK)
  const instrumentoLabelLower = instrumentoLabel.toLowerCase()
  // Artículos del rótulo para el copy; "del" va a mano porque "de el" no contrae.
  const articulo = articuloDefinido(instrumentoLabel)
  const instrumentoConArticulo = `${articulo} ${instrumentoLabelLower}`
  const demostrativo = articulo === "el" ? "Este" : "Esta"
  const deInstrumento = articulo === "el" ? "del" : "de la"

  // Rótulo de "actividad" por grado (Regla 13, V488/V511); el indefinido sale del mismo género.
  const rotuloLabel = unidad.rotuloEjecucion ?? ROTULO_ACTIVIDAD_FALLBACK
  const rotuloLabelLower = rotuloEnMinuscula(rotuloLabel)
  const rotuloIndefinido = articuloDefinido(rotuloLabel) === "el" ? "un" : "una"
  // Solo género, nunca plural: el rótulo es texto libre (ver "Actividads").
  const rotuloGenero = rotuloIndefinido === "un" ? "o" : "a"
  const rotuloNingun = rotuloGenero === "o" ? "ningún" : "ninguna"

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setSearch("")
      setPesos({})
      setNotice(null)
    }
  }

  function handleVincular(actividadId: number) {
    const valorRaw = pesos[actividadId]?.trim()
    const valor = pideValor ? Number(valorRaw) || 0 : 0

    setNotice(null)
    linkActividad.mutate(
      {
        unidadId: unidad.id,
        actividadId,
        ponderacion: esPonderado ? valor : 0,
        omitirPonderacion: !esPonderado,
      },
      {
        onSuccess: (data) => {
          if (data?.status === "error") {
            setNotice({ id: Date.now(), message: data.message || "No se pudo vincular." })
            return
          }
          // Suma de puntos: el puntaje se guarda aparte, ya vinculada.
          if (esSumatoria && valor > 0) {
            updatePuntaje.mutate({ actividadId, puntaje: valor }, { onError: mostrarError })
          }
          setPesos((prev) => {
            const next = { ...prev }
            delete next[actividadId]
            return next
          })
        },
        onError: mostrarError,
      },
    )
  }

  if (!puedeCrear) return null

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            color="primary"
            variant="fill"
            size="sm"
            className="shrink-0"
            disabled={soloEnLinea.disabled}
            title={soloEnLinea.tooltip ?? undefined}
          />
        }
      >
        <PlusIcon data-icon="inline-start" />
        Vincular {rotuloLabelLower}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        // Más ancho que el default: es una tabla completa.
        className="flex max-h-[70vh] w-[min(46rem,90vw)] flex-col overflow-hidden"
      >
        <PopoverHeader className="shrink-0">
          <PopoverTitle>Vincular {rotuloLabelLower}</PopoverTitle>
        </PopoverHeader>

        {/* Único bloque con scroll; la tabla va en un div aparte porque se mide mal dentro del flex que recorta. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4">
            <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
            <div className="flex items-end justify-between gap-4">
              <Field variant="outlined" className="min-w-0 flex-1">
                <FieldLabel htmlFor="buscar-actividad">Buscar por {rotuloLabelLower}</FieldLabel>
                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="buscar-actividad"
                    placeholder={`Buscar ${rotuloLabelLower}...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </Field>
              {/* Abre el alta con grado, asignatura y unidad preseleccionados (`unidadId`). */}
              <Button
                variant="fill"
                color="primary"
                size="sm"
                type="button"
                className="shrink-0"
                nativeButton={false}
                render={
                  <Link
                    to={paths.app.planeadorActividadCrear.getHref()}
                    search={{ unidadId: String(unidad.id) }}
                  />
                }
              >
                <PlusCircleIcon data-icon="inline-start" />
                Agregar {rotuloLabelLower}
              </Button>
            </div>

            <p className="text-sm">
              <span className="font-semibold">Disponibles para vincular:</span> selecciona{" "}
              {rotuloIndefinido} {rotuloLabelLower} ya cread{rotuloGenero} para vincularl
              {rotuloGenero} con {instrumentoConArticulo}.
            </p>

            {/* `table-fixed` con anchos por columna: evita scroll horizontal, el contenido largo envuelve. */}
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[28%]">{rotuloLabel}</TableHead>
                  <TableHead className="w-[13%]">Tipo</TableHead>
                  {/* Formativa no tiene instrumento: columna oculta, igual que en la tabla del panel. */}
                  {!esFormativa && <TableHead className="w-[18%]">Instrumento</TableHead>}
                  <TableHead className="w-[11%]">Grupo</TableHead>
                  {pideValor && (
                    <>
                      <TableHead className="w-[10%] text-right">
                        {esPonderado ? "(%)" : "(Σ)"}
                      </TableHead>
                      {/* Header vacío: la columna solo muestra el disponible o el botón "Vincular". */}
                      <TableHead className="w-[20%]" />
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {disponibles.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={(esFormativa ? 3 : 4) + (pideValor ? 2 : 0)}
                      className="h-20 text-center text-muted-foreground"
                    >
                      {search
                        ? `No se encontró ${rotuloNingun} ${rotuloLabelLower} que coincida con la búsqueda.`
                        : `No hay ${rotuloNingun} ${rotuloLabelLower} disponible para vincular.`}
                    </TableCell>
                  </TableRow>
                ) : (
                  disponibles.map((actividad) => {
                    const peso = pesos[actividad.id] ?? ""
                    const tienePeso = Number(peso) > 0
                    const disponible = actividad.porcentajeDisponible ?? 100
                    return (
                      <TableRow key={actividad.id}>
                        <TableCell className="font-semibold whitespace-normal">
                          {/* Máximo 2 líneas para no desalinear la fila. */}
                          <span className="line-clamp-2" title={actividad.nombre}>
                            {actividad.nombre}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-normal">{actividad.tipo}</TableCell>
                        {!esFormativa && (
                          <TableCell className="whitespace-normal">{actividad.instrumento}</TableCell>
                        )}
                        <TableCell className="whitespace-normal">{actividad.grupo}</TableCell>
                        {pideValor && (
                          <>
                            <TableCell>
                              <Input
                                variant="outlined"
                                type="number"
                                min={0}
                                // Suma de puntos no tiene tope: el % lo deriva el backend.
                                max={esPonderado ? disponible : undefined}
                                placeholder="0"
                                value={peso}
                                onChange={(e) => {
                                  const raw = e.target.value
                                  // Recorta al disponible solo en Ponderado: `max` del input no bloquea el tecleo.
                                  const clamped =
                                    raw === ""
                                      ? ""
                                      : esPonderado
                                        ? String(Math.min(Number(raw) || 0, disponible))
                                        : raw
                                  setPesos((prev) => ({
                                    ...prev,
                                    [actividad.id]: clamped,
                                  }))
                                }}
                                className="ml-auto w-16 text-right"
                              />
                            </TableCell>
                            {/* Columna aparte para que el texto no envuelva debajo del input. */}
                            <TableCell className="whitespace-normal">
                              {/* "Vincular" solo con valor tipeado (en 0 no se distingue de no vinculada); si no, en Ponderado se ve el disponible. */}
                              {tienePeso ? (
                                <Button
                                  variant="outline"
                                  color="primary"
                                  size="sm"
                                  type="button"
                                  disabled={linkActividad.isPending || soloEnLinea.disabled}
                                  title={soloEnLinea.tooltip ?? undefined}
                                  onClick={() => handleVincular(actividad.id)}
                                >
                                  <PlusCircleIcon data-icon="inline-start" />
                                  Vincular
                                </Button>
                              ) : esPonderado ? (
                                <span className="text-muted-foreground text-xs">
                                  Disponible para asignar: {disponible}%
                                </span>
                              ) : null}
                            </TableCell>
                          </>
                        )}
                        {!pideValor && (
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              color="primary"
                              size="sm"
                              type="button"
                              disabled={linkActividad.isPending || soloEnLinea.disabled}
                              title={soloEnLinea.tooltip ?? undefined}
                              onClick={() => handleVincular(actividad.id)}
                            >
                              <PlusCircleIcon data-icon="inline-start" />
                              Vincular
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>

            {esPonderado && (
              <div className="border-blue-stroke bg-blue-22 text-blue flex items-start gap-3 rounded-md border p-3 text-sm">
                <InfoIcon className="size-5 shrink-0" />
                <p>
                  {demostrativo} {instrumentoLabelLower} utiliza cálculo ponderado. Al vincular{" "}
                  {rotuloIndefinido} {rotuloLabelLower}, debes asignar el porcentaje que tendrá
                  dentro {deInstrumento} {instrumentoLabelLower}.
                </p>
              </div>
            )}
            {esSumatoria && (
              <div className="border-blue-stroke bg-blue-22 text-blue flex items-start gap-3 rounded-md border p-3 text-sm">
                <InfoIcon className="size-5 shrink-0" />
                <p>
                  {demostrativo} {instrumentoLabelLower} suma el puntaje de cada {rotuloLabelLower}{" "}
                  vinculad{rotuloGenero}. Al vincular {rotuloIndefinido} {rotuloLabelLower}, asigná
                  el puntaje que tendrá —
                  el sistema calcula el porcentaje que le corresponde dentro {deInstrumento}{" "}
                  {instrumentoLabelLower}.
                </p>
              </div>
            )}
            {/* Aviso de "Promedio simple" como en `UnidadDetallePanel`; en Formativa no aplica. */}
            {!esFormativa && unidad.metodoCalculo === "Promedio simple" && (
              <div className="border-blue-stroke bg-blue-22 text-blue flex items-start gap-3 rounded-md border p-3 text-sm">
                <InfoIcon className="size-5 shrink-0" />
                <p>
                  {demostrativo} {instrumentoLabelLower} promedia el puntaje de cada{" "}
                  {rotuloLabelLower} por igual: no hay un peso ni un puntaje que asignar.
                </p>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
