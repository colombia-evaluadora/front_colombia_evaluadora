import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { InfoIcon, MagnifyingGlassIcon, PlusCircleIcon, XIcon } from "@/components/ui/icons"

import { useActividadesQuery } from "@/features/planeador/api/query/use-actividades-query"
import { useLinkActividadUnidad } from "@/features/planeador/api/mutations/link-actividad-unidad"
import type { UnidadTematica } from "@/features/planeador/api/types/unidad-tematica"

interface DialogAgregarActividadProps {
  unidad: UnidadTematica
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal "Agregar actividad" de la pestaña Actividades. Lista las
 * actividades de la MISMA unidad (`Actividad.unidad.id === unidad.id`)
 * que todavía no están vinculadas —su id no aparece en ningún
 * `UnidadActividad.actividadId` de `unidad.actividades`— para que el
 * docente elija cuáles sumar a la rúbrica/promedio/puntaje de la unidad.
 *
 * El campo de porcentaje SOLO se pide cuando `metodoCalculo ===
 * "Ponderado"` —con "Promedio simple" o "Suma de puntos" cada actividad
 * vinculada pesa lo mismo (o suma sus puntos), no hay nada que repartir—.
 * En ese caso, el botón "Vincular" de una fila permanece oculto hasta
 * que se tipea un valor mayor a 0: no tiene sentido vincular con un peso
 * en blanco.
 */
export function DialogAgregarActividad({ unidad, open, onOpenChange }: DialogAgregarActividadProps) {
  const [search, setSearch] = useState("")
  // Borrador de porcentaje por actividad — vive acá, no en el form de la
  // fila: cada tecleo no debe disparar nada hasta que se confirma con
  // "Vincular". Se limpia por completo al cerrar el modal.
  const [pesos, setPesos] = useState<Record<string, string>>({})

  const { data: actividades = [] } = useActividadesQuery()
  const linkActividad = useLinkActividadUnidad()

  const esPonderado = unidad.metodoCalculo === "Ponderado"

  // % ya comprometido por las actividades YA vinculadas — el "disponible"
  // que se muestra es contra este total, no contra lo que el usuario esté
  // tipeando ahora mismo en las filas (esos valores no cuentan hasta que
  // se confirma "Vincular" y la unidad se vuelve a consultar).
  const disponible = useMemo(() => {
    const comprometido = unidad.actividades.reduce((acc, a) => acc + a.ponderacion, 0)
    return Math.max(0, 100 - comprometido)
  }, [unidad.actividades])

  const vinculadasIds = useMemo(
    () => new Set(unidad.actividades.map((a) => a.actividadId)),
    [unidad.actividades],
  )

  const disponibles = useMemo(() => {
    const query = search.trim().toLowerCase()
    return actividades.filter((actividad) => {
      if (actividad.unidad.id !== unidad.id) return false
      if (vinculadasIds.has(actividad.id)) return false
      if (!query) return true
      return actividad.nombre.toLowerCase().includes(query)
    })
  }, [actividades, unidad.id, vinculadasIds, search])

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    if (!next) {
      setSearch("")
      setPesos({})
    }
  }

  function handleVincular(actividadId: number) {
    const pesoRaw = pesos[actividadId]?.trim()
    const ponderacion = esPonderado ? Number(pesoRaw) || 0 : 0

    linkActividad.mutate(
      { unidadId: unidad.id, actividadId, ponderacion },
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-3xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Agregar actividad</DialogTitle>
        </DialogHeader>

        {/* Único bloque con scroll: título y "Cerrar" quedan fijos afuera —
            así una lista larga de actividades no empuja el resto del modal
            fuera de la pantalla. */}
        {/* El scroll vive en ESTE div (solo `overflow-y-auto` + `min-h-0` para
            poder encogerse dentro del alto fijo del modal); el `<table>` de
            adentro se mide raro si comparte el mismo flex container que lo
            recorta — por eso el contenido va en un div de bloque aparte, no
            directamente acá. */}
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

            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Actividad</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Instrumento</TableHead>
                  <TableHead>Grupo</TableHead>
                  {esPonderado && <TableHead className="text-right">(%)</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {disponibles.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={esPonderado ? 5 : 4}
                      className="h-20 text-center text-muted-foreground"
                    >
                      {search
                        ? "Sin actividades que coincidan con la búsqueda."
                        : "No hay actividades de esta unidad disponibles para vincular."}
                    </TableCell>
                  </TableRow>
                ) : (
                  disponibles.map((actividad) => {
                    const peso = pesos[actividad.id] ?? ""
                    const tienePeso = Number(peso) > 0
                    return (
                      <TableRow key={actividad.id}>
                        <TableCell className="font-semibold whitespace-normal">
                          {actividad.nombre}
                        </TableCell>
                        <TableCell>{actividad.esEvaluativa ? "Sumativa" : "Formativa"}</TableCell>
                        <TableCell>{actividad.instrumento}</TableCell>
                        <TableCell>{actividad.grupo}</TableCell>
                        {esPonderado && (
                          <TableCell>
                            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                              <Input
                                variant="outlined"
                                type="number"
                                min={0}
                                max={disponible}
                                placeholder="0"
                                value={peso}
                                onChange={(e) =>
                                  setPesos((prev) => ({
                                    ...prev,
                                    [actividad.id]: e.target.value,
                                  }))
                                }
                                className="w-16 text-right"
                              />
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
                                <span className="text-muted-foreground text-xs whitespace-nowrap">
                                  Disponible para asignar: {disponible}%
                                </span>
                              )}
                            </div>
                          </TableCell>
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

        <DialogFooter className="shrink-0 sm:justify-end">
          <DialogClose render={<Button size="sm" type="button" variant="fill" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cerrar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
