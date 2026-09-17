import { useState } from "react"
import { ArrowLeftIcon, ArrowRightIcon, FolderOpenIcon, LockIcon } from "@/components/ui/icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { AssignmentSubject } from "@/features/establishment/academic-period/api/types/academic-assignment"

function SearchInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <Field orientation="vertical" variant="outlined" className="mt-0 flex-none gap-2">
      <FieldLabel htmlFor={id}>Buscar</FieldLabel>
      <Input
        id={id}
        type="search"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <FolderOpenIcon className="size-8" weight="light" />
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
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
}

export function AssignmentTransfer({
  available,
  assigned,
  onAssign,
  onUnassign,
  headingLevel = 4,
}: AssignmentTransferProps) {
  const [availSearch, setAvailSearch] = useState("")
  const [curSearch, setCurSearch] = useState("")

  const HeadingTag = `h${headingLevel}` as const

  const filteredAvailable = available.filter((s) => matches(s, availSearch))
  const filteredAssigned = assigned.filter((s) => matches(s, curSearch))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Disponibles */}
      <div className="flex flex-col gap-3">
        <div className="flex min-h-9 items-center justify-between gap-2">
          <HeadingTag className="text-sm font-semibold">Asignatura(s) disponible(s)</HeadingTag>
          {available.length > 0 && (
            <Button
              type="button"
              color="primary"
              size="sm"
              disabled={filteredAvailable.length === 0}
              onClick={() => onAssign(filteredAvailable.map((s) => s.id))}
            >
              Mover todas
              <ArrowRightIcon weight="bold" data-icon="inline-end" />
            </Button>
          )}
        </div>
        {/* Buscador + lista encerrados en una sola caja con borde redondeado.
            Altura fija para que ambos lados midan lo mismo. */}
        <div className="flex h-96 min-h-0 flex-col gap-2 rounded-md border p-3">
          {available.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <SearchInput
                id="assign-available-search"
                value={availSearch}
                onChange={setAvailSearch}
                placeholder={SEARCH_PLACEHOLDER}
              />
              {filteredAvailable.length === 0 ? (
                <EmptyState />
              ) : (
                <ul className="flex min-h-0 flex-1 flex-col divide-y overflow-y-auto">
                  {filteredAvailable.map((s) => (
                    <li
                      key={s.id}
                      className="flex animate-in items-center justify-between gap-2 px-1 py-1.5 duration-200 fade-in slide-in-from-right-4"
                    >
                      <span className="truncate text-sm">
                        {s.nombre} {s.gradoGrupo} {s.jornada}
                      </span>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground"
                              aria-label={`Asignar ${s.nombre} ${s.gradoGrupo} ${s.jornada}`}
                              onClick={() => onAssign([s.id])}
                            />
                          }
                        >
                          <ArrowRightIcon />
                        </TooltipTrigger>
                        <TooltipContent>{`Asignar ${s.nombre} ${s.gradoGrupo} ${s.jornada}`}</TooltipContent>
                      </Tooltip>
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
        <div className="flex min-h-9 items-center justify-between gap-2">
          <HeadingTag className="text-sm font-semibold">Asignaturas actuales</HeadingTag>
          {assigned.length > 0 && (
            <Button
              type="button"
              color="primary"
              size="sm"
              disabled={filteredAssigned.every((s) => s.bloqueadoPreescolar)}
              onClick={() =>
                onUnassign(
                  filteredAssigned.filter((s) => !s.bloqueadoPreescolar).map((s) => s.id),
                )
              }
            >
              <ArrowLeftIcon weight="bold" data-icon="inline-start" />
              Mover todas
            </Button>
          )}
        </div>
        <div className="flex h-96 min-h-0 flex-col gap-2 rounded-md border p-3">
          {assigned.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <SearchInput
                id="assign-current-search"
                value={curSearch}
                onChange={setCurSearch}
                placeholder={SEARCH_PLACEHOLDER}
              />
              {filteredAssigned.length === 0 ? (
                <EmptyState />
              ) : (
                <ul className="flex min-h-0 flex-1 flex-col divide-y overflow-y-auto">
                  {filteredAssigned.map((s) => (
                    <li
                      key={s.id}
                      className="flex animate-in items-center justify-between gap-2 px-1 py-1.5 duration-200 fade-in slide-in-from-left-4"
                    >
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground"
                              disabled={s.bloqueadoPreescolar}
                              aria-label={
                                s.bloqueadoPreescolar
                                  ? `${s.nombre} ${s.gradoGrupo} ${s.jornada} — asignada automáticamente al director de grupo, no se puede quitar acá`
                                  : `Quitar ${s.nombre} ${s.gradoGrupo} ${s.jornada}`
                              }
                              onClick={() => onUnassign([s.id])}
                            />
                          }
                        >
                          {s.bloqueadoPreescolar ? <LockIcon /> : <ArrowLeftIcon />}
                        </TooltipTrigger>
                        <TooltipContent>
                          {s.bloqueadoPreescolar
                            ? `${s.nombre} ${s.gradoGrupo} ${s.jornada} — asignada automáticamente al director de grupo, no se puede quitar acá`
                            : `Quitar ${s.nombre} ${s.gradoGrupo} ${s.jornada}`}
                        </TooltipContent>
                      </Tooltip>
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
