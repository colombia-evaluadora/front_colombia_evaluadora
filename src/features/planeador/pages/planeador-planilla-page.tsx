import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { DotsThreeIcon, InboxIcon, MagnifyingGlassIcon, PlusCircleIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import {
  FiltroPlanillaCascada,
  type FiltroPlanillaValue,
} from "@/features/planeador/components/forms/filtro-planilla-cascada"

/** Opciones de "Ver por" de esta pantalla — a diferencia del listado del
 *  Planeador (`VIEW_OPTIONS`), acá no hay "Instrumento": la planilla siempre
 *  agrupa columnas por actividad o por unidad, nunca por instrumento. */
const VER_POR_OPTIONS = [
  { value: "actividad", label: "Actividad" },
  { value: "unidad", label: "Unidad" },
] as const
type VerPorOption = (typeof VER_POR_OPTIONS)[number]["value"]

/**
 * "Planilla de calificación": grilla de notas por estudiante, con una
 * columna por actividad (o por unidad, según "Ver por") del Grado/Grupo/
 * Asignatura/rango de fechas elegidos en "Filtro". Acá solo va el
 * encabezado + los tres controles — la grilla de notas y la edición por
 * celda quedan para la próxima iteración, una vez validado esto.
 */
export function PlaneadorPlanillaPage() {
  const [verPor, setVerPor] = useState<VerPorOption>("actividad")
  const [buscar, setBuscar] = useState("")
  const [filtro, setFiltro] = useState<FiltroPlanillaValue | null>(null)

  // Recién con Grado, Grupo Y Asignatura elegidos hay contra qué buscar
  // actividades/unidades reales — antes de eso no tiene sentido mostrar una
  // grilla vacía intentando adivinar qué traer.
  const filtroCompleto = filtro != null

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex gap-0">
              <Button
                color="primary"
                size="sm"
                variant="fill"
                aria-label="Nueva actividad"
                className="rounded-r-none border-r-0"
                render={<Link to={paths.app.planeadorActividadCrear.getHref()} />}
              >
                <PlusCircleIcon data-icon="inline-start" />
                Nueva actividad
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      color="primary"
                      size="sm"
                      variant="fill"
                      aria-label="Más opciones"
                      className="rounded-l-none"
                    />
                  }
                >
                  <DotsThreeIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>Exportar todo</DropdownMenuItem>
                  <DropdownMenuItem disabled>Importar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        >
          Planilla de calificación
        </TableScreenTitle>

        <TableScreenToolbar>
          <div className="grid flex-1 gap-4 sm:grid-cols-3">
            <Field variant="outlined">
              <FieldLabel>Ver por</FieldLabel>
              <Select value={verPor} onValueChange={(v) => v && setVerPor(v as VerPorOption)}>
                <SelectTrigger>
                  <SelectValue>
                    {(v) => VER_POR_OPTIONS.find((o) => o.value === v)?.label ?? "Actividad"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {VER_POR_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field variant="outlined">
              <FieldLabel htmlFor="buscar-planilla">Buscar</FieldLabel>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="buscar-planilla"
                  placeholder={verPor === "unidad" ? "Buscar unidad" : "Buscar actividad"}
                  value={buscar}
                  onChange={(e) => setBuscar(e.target.value)}
                  className="pl-9"
                />
              </div>
            </Field>

            <Field variant="outlined">
              <FieldLabel>Filtro</FieldLabel>
              <FiltroPlanillaCascada value={filtro} onChange={setFiltro} />
            </Field>
          </div>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        {!filtroCompleto && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <InboxIcon className="size-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Seleccione Grado, Grupo o Asignatura</p>
          </div>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}
