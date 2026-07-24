import { Fragment, useState } from "react"
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { useRatingScalesQuery } from "../../../api/query/use-rating-scales-query"
import { useTeachingLevelsQuery } from "../../../api/query/use-teaching-levels-query"
import { RATING_SCALE_TYPE_BADGE } from "../../../api/ui-mappings"
import type { RatingScale } from "../../../api/types/academic-period/rating-scales"
import { CreateRatingScaleDialog } from "../dialogs/dialog-create-rating-scale"
import { RatingSymbolView } from "../rating-symbol"

export function TabRatingScales() {
  const { data: levels = [], isPending: levelsPending } =
    useTeachingLevelsQuery()
  // Traemos todas las escalas y agrupamos por nivel en el cliente.
  const { data, isPending: scalesPending } = useRatingScalesQuery({
    filters: {},
    sorting: [],
    pageIndex: 0,
    pageSize: 100,
  })

  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const scales = data?.rows ?? []
  const isPending = levelsPending || scalesPending

  function toggle(levelId: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(levelId)) next.delete(levelId)
      else next.add(levelId)
      return next
    })
  }

  function scalesForLevel(levelId: number): RatingScale[] {
    return scales.filter((scale) => scale.teachingLevelIds.includes(levelId))
  }

  return (
    <>
      <div className="mb-2 flex items-center justify-end">
        <CreateRatingScaleDialog />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead className="w-8" />
              <TableHead>Niveles de enseñanza</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center">
                  <Spinner className="mx-auto" />
                </TableCell>
              </TableRow>
            ) : levels.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-muted-foreground py-8 text-center"
                >
                  Sin niveles de enseñanza.
                </TableCell>
              </TableRow>
            ) : (
              levels.map((level) => {
                const levelScales = scalesForLevel(level.id)
                const isOpen = expanded.has(level.id)
                return (
                  <Fragment key={level.id}>
                    <TableRow className="cursor-pointer" onClick={() => toggle(level.id)}>
                      <TableCell>
                        <button
                          type="button"
                          aria-label={isOpen ? "Contraer" : "Expandir"}
                          className="text-muted-foreground flex items-center"
                        >
                          {isOpen ? (
                            <CaretDownIcon className="size-4" />
                          ) : (
                            <CaretRightIcon className="size-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox color="neutral" aria-label={`Seleccionar ${level.nombre}`} />
                      </TableCell>
                      <TableCell className="font-semibold uppercase">
                        {level.nombre}
                      </TableCell>
                    </TableRow>

                    {isOpen && (
                      <TableRow>
                        <TableCell />
                        <TableCell colSpan={2} className="p-0">
                          <ScalesSubTable scales={levelScales} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

function ScalesSubTable({ scales }: { scales: RatingScale[] }) {
  if (scales.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-3 text-sm">
        Sin escalas para este nivel.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Abreviación</TableHead>
          <TableHead>Nota máximo</TableHead>
          <TableHead>Nota mínimo</TableHead>
          <TableHead>Nota equivalente</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Iconografía</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scales.map((scale) => (
          <TableRow key={scale.codigo}>
            <TableCell className="font-medium">{scale.nombre}</TableCell>
            <TableCell>{scale.abreviacion}</TableCell>
            <TableCell>{scale.notaMaxima}</TableCell>
            <TableCell>{scale.notaMinima}</TableCell>
            <TableCell>{scale.notaEquivalente}</TableCell>
            <TableCell>
              <Badge {...RATING_SCALE_TYPE_BADGE[scale.tipo]}>
                {scale.tipo}
              </Badge>
            </TableCell>
            <TableCell className="text-lg">
              <RatingSymbolView value={scale.iconografia} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
