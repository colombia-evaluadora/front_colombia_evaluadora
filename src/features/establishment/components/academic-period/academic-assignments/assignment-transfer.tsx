import { useState } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  TrayIcon,
} from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import type { AssignmentSubject } from "../../../api/types/academic-period/academic-assignment"

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

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 border text-center text-muted-foreground">
      <TrayIcon className="size-8" weight="light" />
      <span className="text-sm">Sin datos</span>
    </div>
  )
}

function matches(subject: AssignmentSubject, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (
    subject.nombre.toLowerCase().includes(q) ||
    subject.gradoGrupo.toLowerCase().includes(q) ||
    subject.jornada.toLowerCase().includes(q)
  )
}

const SEARCH_PLACEHOLDER = "Asignatura, grado, grupo o jornada"

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
  const [availSearch, setAvailSearch] = useState("")
  const [curSearch, setCurSearch] = useState("")

  const filteredAvailable = available.filter((s) => matches(s, availSearch))
  const filteredAssigned = assigned.filter((s) => matches(s, curSearch))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Disponibles */}
      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-semibold">Asignatura(s) disponible(s)</h4>
        {/* Zona de contenido con altura fija: así ambos lados miden lo mismo,
            con o sin buscador. */}
        <div className="flex h-80 min-h-0 flex-col gap-3">
          {available.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    Buscar
                  </label>
                  <SearchInput
                    value={availSearch}
                    onChange={setAvailSearch}
                    placeholder={SEARCH_PLACEHOLDER}
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

              {filteredAvailable.length === 0 ? (
                <EmptyState />
              ) : (
                <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto border">
                  {filteredAvailable.map((s) => (
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
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {/* Actuales */}
      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-semibold">Asignaturas actuales</h4>
        <div className="flex h-80 min-h-0 flex-col gap-3">
          {assigned.length === 0 ? (
            <EmptyState />
          ) : (
            <>
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
                    Buscar
                  </label>
                  <SearchInput
                    value={curSearch}
                    onChange={setCurSearch}
                    placeholder={SEARCH_PLACEHOLDER}
                  />
                </div>
              </div>

              {filteredAssigned.length === 0 ? (
                <EmptyState />
              ) : (
                <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto border">
                  {filteredAssigned.map((s) => (
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
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
