import { useState } from "react"

import { Button } from "@/components/ui/button"
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

import { useUnidadActividadesDisponiblesQuery } from "@/features/planeador/api/query/use-unidad-actividades-disponibles-query"
import { useLinkActividadUnidad } from "@/features/planeador/api/mutations/link-actividad-unidad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

interface DialogAgregarActividadProps {
  unidad: UnidadTematica
}

/**
 * Popover "Vincular actividad" de la pestaña Actividades — mismo patrón que
 * `CrearUnidadPopover` (`form-editar-actividad.tsx`): autocontenido, con su
 * propio trigger y estado de apertura, en vez de un `Dialog` controlado
 * desde el caller (`TabHeader` ya no necesita `dialogOpen`/`setDialogOpen`).
 *
 * Lista las "actividades disponibles" reales para esta unidad
 * (`GET /unidades/:id/actividades-disponibles`, `useUnidadActividadesDisponiblesQuery`)
 * — huérfanas de la misma asignatura y (vía su grupo) del mismo grado que
 * la unidad; el backend ya las devuelve sin las que estén vinculadas, así
 * que acá no hace falta filtrar de nuevo. `search` viaja al servidor
 * (parámetro `search` del endpoint), no se filtra en el cliente.
 *
 * El campo de porcentaje SOLO se pide cuando `metodoCalculo ===
 * "Ponderado"` —con "Promedio simple" o "Suma de puntos" cada actividad
 * vinculada pesa lo mismo (o suma sus puntos), no hay nada que repartir—.
 * En ese caso, el botón "Vincular" de una fila permanece oculto hasta
 * que se tipea un valor mayor a 0: no tiene sentido vincular con un peso
 * en blanco. `porcentajeDisponible` viene YA CALCULADO por fila (unidad +
 * grupo de esa actividad), no hace falta pedirlo aparte (1.5).
 */
export function DialogAgregarActividad({ unidad }: DialogAgregarActividadProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  // Borrador de porcentaje por actividad — vive acá, no en el form de la
  // fila: cada tecleo no debe disparar nada hasta que se confirma con
  // "Vincular". Se limpia por completo al cerrar el popover.
  const [pesos, setPesos] = useState<Record<string, string>>({})

  const { data: disponibles = [] } = useUnidadActividadesDisponiblesQuery(unidad.id, search)
  const linkActividad = useLinkActividadUnidad()

  const esPonderado = unidad.metodoCalculo === "Ponderado"

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setSearch("")
      setPesos({})
    }
  }

  function handleVincular(actividadId: number) {
    const pesoRaw = pesos[actividadId]?.trim()
    const ponderacion = esPonderado ? Number(pesoRaw) || 0 : 0

    linkActividad.mutate(
      {
        unidadId: unidad.id,
        actividadId,
        ponderacion,
        omitirPonderacion: unidad.metodoCalculo !== "Ponderado",
      },
      {
        onSuccess: (data) => {
          if (data.status === "error") return
          setPesos((prev) => {
            const next = { ...prev }
            delete next[actividadId]
            return next
          })
        },
      },
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={<Button color="primary" variant="fill" size="sm" className="shrink-0" />}
      >
        <PlusIcon data-icon="inline-start" />
        Vincular actividad
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        // Bastante más ancho que el default (`w-72`): esto es una tabla
        // completa, no un mini-form como `CrearUnidadPopover`.
        className="flex max-h-[70vh] w-[min(46rem,90vw)] flex-col overflow-hidden"
      >
        <PopoverHeader className="shrink-0">
          <PopoverTitle>Vincular actividad</PopoverTitle>
        </PopoverHeader>

        {/* Único bloque con scroll: título queda fijo afuera — así una
            lista larga de actividades no empuja el resto del popover fuera
            de la pantalla. El scroll vive en ESTE div (solo
            `overflow-y-auto` + `min-h-0`); el `<table>` de adentro se mide
            raro si comparte el mismo flex container que lo recorta — por
            eso el contenido va en un div de bloque aparte, no directamente
            acá. */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <Field variant="outlined" className="min-w-0 flex-1">
                <FieldLabel htmlFor="buscar-actividad">Buscar por actividad</FieldLabel>
                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="buscar-actividad"
                    placeholder="Buscar actividad..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </Field>
              {/* Crear una actividad nueva desde acá (en vez de elegir una ya
                  existente) todavía no tiene flujo propio — "Nueva actividad"
                  está deshabilitado en toda la app por la misma razón (ver
                  `planeador-page.tsx`). Queda visible para no esconder que la
                  función existe en el diseño, pendiente de esa iteración. */}
              <Button
                variant="fill"
                color="primary"
                size="sm"
                type="button"
                disabled
                className="shrink-0"
              >
                <PlusCircleIcon data-icon="inline-start" />
                Agregar actividad
              </Button>
            </div>

            <p className="text-sm">
              <span className="font-semibold">Actividades disponibles:</span> selecciona una
              actividad creada previamente para vincularla a esta unidad.
            </p>

            {/* `table-fixed` + un ancho por columna: sin esto, "Instrumento"
                (nombres largos, ej. "Escala de valoración") y "Disponible
                para asignar: X%" (con `whitespace-nowrap` por default de
                `TableCell`) empujaban la tabla más ancha que el popover y
                aparecía scroll horizontal — quedaba la columna Actividad
                cortada apenas se scrolleaba para ver el %. Con ancho fijo,
                el contenido largo envuelve (`whitespace-normal` en cada
                celda) en vez de desbordar. El input de "(%)" y el
                "Disponible para asignar"/botón "Vincular" van en columnas
                SEPARADAS (la segunda con header vacío): compartir celda
                hacía que el texto largo se envolviera debajo del input y
                empujara la fila más alta de lo necesario. */}
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[28%]">Actividad</TableHead>
                  <TableHead className="w-[13%]">Tipo</TableHead>
                  <TableHead className="w-[18%]">Instrumento</TableHead>
                  <TableHead className="w-[11%]">Grupo</TableHead>
                  {esPonderado && (
                    <>
                      <TableHead className="w-[10%] text-right">(%)</TableHead>
                      {/* Header vacío a propósito: esta columna solo muestra
                          "Disponible para asignar" o el botón "Vincular" —
                          ninguno de los dos es un encabezado real. Separarla
                          del input evita que el texto largo se envuelva
                          DEBAJO del input y lo empuje de su columna. */}
                      <TableHead className="w-[20%]" />
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {disponibles.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={esPonderado ? 6 : 4}
                      className="h-20 text-center text-muted-foreground"
                    >
                      {search
                        ? "Sin actividades que coincidan con la búsqueda."
                        : "No hay actividades disponibles para vincular."}
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
                          {/* Máximo 2 líneas — un nombre largo desalineaba la
                              fila entera contra las columnas de al lado. */}
                          <span className="line-clamp-2" title={actividad.nombre}>
                            {actividad.nombre}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-normal">{actividad.tipo}</TableCell>
                        <TableCell className="whitespace-normal">{actividad.instrumento}</TableCell>
                        <TableCell className="whitespace-normal">{actividad.grupo}</TableCell>
                        {esPonderado && (
                          <>
                            <TableCell>
                              <Input
                                variant="outlined"
                                type="number"
                                min={0}
                                max={disponible}
                                placeholder="0"
                                value={peso}
                                onChange={(e) => {
                                  const raw = e.target.value
                                  // Recorta al disponible de la fila: sin esto
                                  // se podía tipear (o pegar) un % que sumado
                                  // al resto de la unidad pasara de 100 —
                                  // `max` del input HTML no bloquea el tecleo,
                                  // solo marca `:invalid`.
                                  const clamped =
                                    raw === "" ? "" : String(Math.min(Number(raw) || 0, disponible))
                                  setPesos((prev) => ({
                                    ...prev,
                                    [actividad.id]: clamped,
                                  }))
                                }}
                                className="ml-auto w-16 text-right"
                              />
                            </TableCell>
                            {/* Columna aparte (header vacío) para no envolver
                                el texto largo DEBAJO del input de arriba —
                                antes compartían celda y la fila crecía más
                                de lo que el input necesitaba. */}
                            <TableCell className="whitespace-normal">
                              {/* El botón "Vincular" solo aparece con un peso
                                  tipeado — sin eso, vincular no tiene sentido
                                  (quedaría en 0%, indistinguible de "no
                                  vinculada"). Mientras tanto se ve el
                                  disponible restante, para que el docente sepa
                                  cuánto le queda por repartir. */}
                              {tienePeso ? (
                                <Button
                                  variant="outline"
                                  color="primary"
                                  size="sm"
                                  type="button"
                                  disabled={linkActividad.isPending}
                                  onClick={() => handleVincular(actividad.id)}
                                >
                                  <PlusCircleIcon data-icon="inline-start" />
                                  Vincular
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  Disponible para asignar: {disponible}%
                                </span>
                              )}
                            </TableCell>
                          </>
                        )}
                        {!esPonderado && (
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              color="primary"
                              size="sm"
                              type="button"
                              disabled={linkActividad.isPending}
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
                  Esta unidad temática utiliza cálculo ponderado. Al vincular una actividad, debes
                  asignar el porcentaje que tendrá dentro de la unidad.
                </p>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
