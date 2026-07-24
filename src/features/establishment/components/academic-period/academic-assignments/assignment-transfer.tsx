import { useState } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import type { AssignmentSubject } from "./assignments-data"

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative">
      <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="h-9 pl-8"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function matches(subject: AssignmentSubject, nombre: string, grado: string, jornada?: string) {
  if (nombre && !subject.nombre.toLowerCase().includes(nombre.toLowerCase())) {
    return false
  }
  if (grado && !subject.gradoGrupo.toLowerCase().includes(grado.toLowerCase())) {
    return false
  }
  if (jornada && !subject.jornada.toLowerCase().includes(jornada.toLowerCase())) {
    return false
  }
  return true
}

interface AssignmentTransferProps {
  available: AssignmentSubject[]
  assigned: AssignmentSubject[]
  onAssign: (ids: string[]) => void
  onUnassign: (ids: string[]) => void
}

export function AssignmentTransfer({
  available,
  assigned,
  onAssign,
  onUnassign,
}: AssignmentTransferProps) {
  // Filtros del panel de disponibles.
  const [availNombre, setAvailNombre] = useState("")
  const [availGrado, setAvailGrado] = useState("")
  const [availJornada, setAvailJornada] = useState("")

  // Filtros del panel de actuales.
  const [curNombre, setCurNombre] = useState("")
  const [curGrado, setCurGrado] = useState("")

  const filteredAvailable = available.filter((s) =>
    matches(s, availNombre, availGrado, availJornada)
  )
  const filteredAssigned = assigned.filter((s) => matches(s, curNombre, curGrado))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Disponibles */}
      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-semibold">Asignatura(s) disponible(s)</h4>
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Asignatura
            </label>
            <SearchInput
              value={availNombre}
              onChange={setAvailNombre}
              placeholder="Buscar"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Grado o Grupo
            </label>
            <SearchInput
              value={availGrado}
              onChange={setAvailGrado}
              placeholder="Buscar"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Jornada
            </label>
            <SearchInput
              value={availJornada}
              onChange={setAvailJornada}
              placeholder="Buscar"
            />
          </div>
          <Button
            type="button"
            color="primary"
            size="icon"
            aria-label="Asignar todas las filtradas"
            disabled={filteredAvailable.length === 0}
            onClick={() => onAssign(filteredAvailable.map((s) => s.id))}
          >
            <ArrowRightIcon weight="bold" />
          </Button>
        </div>

        <ul className="flex max-h-80 flex-col overflow-y-auto rounded-lg border">
          {filteredAvailable.length === 0 ? (
            <li className="p-4 text-center text-sm text-muted-foreground">
              Sin asignaturas disponibles.
            </li>
          ) : (
            filteredAvailable.map((s) => (
              <li
                key={s.id}
                className="flex animate-in items-center justify-between gap-2 border-b px-3 py-2.5 duration-200 fade-in slide-in-from-right-4 last:border-b-0"
              >
                <span className="truncate text-sm">
                  {s.nombre} {s.gradoGrupo} {s.jornada}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Asignar ${s.nombre} ${s.gradoGrupo} ${s.jornada}`}
                  onClick={() => onAssign([s.id])}
                >
                  <ArrowRightIcon />
                </Button>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Actuales */}
      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-semibold">Asignaturas actuales</h4>
        <div className="flex items-end gap-2">
          <Button
            type="button"
            color="primary"
            size="icon"
            aria-label="Quitar todas las filtradas"
            disabled={filteredAssigned.length === 0}
            onClick={() => onUnassign(filteredAssigned.map((s) => s.id))}
          >
            <ArrowLeftIcon weight="bold" />
          </Button>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Asignatura
            </label>
            <SearchInput
              value={curNombre}
              onChange={setCurNombre}
              placeholder="Buscar"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Grado/Grupo
            </label>
            <SearchInput
              value={curGrado}
              onChange={setCurGrado}
              placeholder="Buscar"
            />
          </div>
        </div>

        <ul className="flex max-h-80 flex-col overflow-y-auto rounded-lg border">
          {filteredAssigned.length === 0 ? (
            <li className="p-4 text-center text-sm text-muted-foreground">
              Sin asignaturas asignadas.
            </li>
          ) : (
            filteredAssigned.map((s) => (
              <li
                key={s.id}
                className="flex animate-in items-center justify-between gap-2 border-b px-3 py-2.5 duration-200 fade-in slide-in-from-left-4 last:border-b-0"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Quitar ${s.nombre} ${s.gradoGrupo} ${s.jornada}`}
                  onClick={() => onUnassign([s.id])}
                >
                  <ArrowLeftIcon />
                </Button>
                <span className="flex flex-1 items-center gap-2 truncate text-sm font-semibold">
                  {s.nombre}
                  <Badge variant="soft" color="muted">
                    {s.gradoGrupo} {s.jornada}
                  </Badge>
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}
