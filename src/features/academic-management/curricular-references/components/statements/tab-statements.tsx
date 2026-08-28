import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  ControlPointIcon,
  MagnifyingGlassIcon,
  PencilIcon,
} from "@/components/ui/icons"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table"
import { TableSortableHeader, sortBySortKey, type TableSort } from "@/components/table-sort-header"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"

import { useCurricularStatementsQuery } from "@/features/academic-management/curricular-references/api/query/use-curricular-statements"
import { useCurricularEvidencesQuery } from "@/features/academic-management/curricular-references/api/query/use-curricular-evidences"
import { ManageStatementDialog } from "@/features/academic-management/curricular-references/components/statements/dialog-manage-statement"
import { DeleteStatementDialog } from "@/features/academic-management/curricular-references/components/statements/dialog-delete-statement"
import { AddEvidencesDialog } from "@/features/academic-management/curricular-references/components/statements/dialog-add-evidences"
import type { CurricularReference } from "@/features/academic-management/curricular-references/api/types/curricular-reference"
import type { CurricularStatement } from "@/features/academic-management/curricular-references/api/types/statement"

interface TabStatementsProps {
  reference: CurricularReference
}

export function TabStatements({ reference }: TabStatementsProps) {
  const level1Label = reference.level1 || "Enunciado"
  const level2Label = reference.level2 || "Evidencia"

  const [areaId, setAreaId] = useState<number | null>(reference.areas[0]?.id ?? null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedStatementId, setSelectedStatementId] = useState<number | null>(null)
  const [statementDialog, setStatementDialog] = useState<{ open: boolean; statement: CurricularStatement | null }>(
    { open: false, statement: null },
  )
  const [evidencesDialogOpen, setEvidencesDialogOpen] = useState(false)
  const [evidenceSort, setEvidenceSort] = useState<TableSort<"id" | "text" | "active">>(null)

  const { data: statements = [], isPending: isStatementsPending } = useCurricularStatementsQuery(
    reference.id,
    areaId,
  )

  const filteredStatements = statements.filter((statement) =>
    statement.text.toLowerCase().includes(search.trim().toLowerCase()),
  )

  useEffect(() => {
    if (filteredStatements.some((statement) => statement.id === selectedStatementId)) return
    setSelectedStatementId(filteredStatements[0]?.id ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statements, areaId])

  const { data: evidences = [], isPending: isEvidencesPending } = useCurricularEvidencesQuery(
    selectedStatementId,
  )

  const areaLabels = Object.fromEntries(reference.areas.map((area) => [area.id, area.name]))
  const sortedEvidences = sortBySortKey(evidences, evidenceSort)

  return (
    <div className="flex flex-col gap-4">
      {/* Fila propia, a todo el ancho de la tarjeta — no va metido en la
          columna angosta de la lista de enunciados. */}
      <Field orientation="vertical" variant="outlined" className="w-full">
        <FieldLabel htmlFor="statement-area">Áreas o dimensiones</FieldLabel>
        <ComboboxField
          items={areaLabels}
          value={areaId}
          onValueChange={(value) => setAreaId((value as number) ?? null)}
        >
          <ComboboxFieldTrigger id="statement-area" size="sm" className="h-12 w-full [&_svg]:size-5">
            <ComboboxFieldValue placeholder="Seleccionar" />
          </ComboboxFieldTrigger>
          <ComboboxFieldContent>
            {reference.areas.map((area) => (
              <ComboboxFieldItem key={area.id} value={area.id}>
                {area.name}
              </ComboboxFieldItem>
            ))}
          </ComboboxFieldContent>
        </ComboboxField>
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[20rem_1fr]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          {/* Flotante sobre un `Popover`: así no empuja la lista de abajo
              cuando se abre, a diferencia de meterlo en el flujo normal. */}
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger
              render={
                <Button type="button" variant="outline" color="primary" size="icon-sm" aria-label="Buscar" />
              }
            >
              <MagnifyingGlassIcon />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-2">
              <InputGroup className="h-10 w-full rounded-full border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
                <InputGroupAddon align="inline-start" className="ml-2">
                  <MagnifyingGlassIcon className="text-muted-foreground size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  autoFocus
                  type="search"
                  autoComplete="off"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por"
                  className="[&::-webkit-search-cancel-button]:appearance-none"
                />
              </InputGroup>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={areaId == null}
            onClick={() => setStatementDialog({ open: true, statement: null })}
          >
            <ControlPointIcon data-icon="inline-start" className="size-5" />
            Agregar {level1Label.toLowerCase()}
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {isStatementsPending ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : filteredStatements.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border p-4 text-center text-sm">
              {areaId == null ? "Selecciona un área." : `Sin ${level1Label.toLowerCase()}s.`}
            </p>
          ) : (
            filteredStatements.map((statement) => {
              const selected = statement.id === selectedStatementId
              return (
                <button
                  key={statement.id}
                  type="button"
                  onClick={() => setSelectedStatementId(statement.id)}
                  className={cn(
                    "group flex flex-col gap-2 rounded-lg border p-3 text-left text-sm transition-colors",
                    selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                  )}
                >
                  <p className="font-bold">{statement.text}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="soft" color={statement.active ? "success" : "destructive"}>
                      {statement.active ? "Activo" : "Inactivo"}
                    </Badge>
                    {selected && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          color="neutral"
                          size="icon-sm"
                          aria-label={`Editar ${level1Label.toLowerCase()}`}
                          onClick={(event) => {
                            event.stopPropagation()
                            setStatementDialog({ open: true, statement })
                          }}
                        >
                          <PencilIcon />
                        </Button>
                        <DeleteStatementDialog
                          statement={statement}
                          levelLabel={level1Label}
                          onDeleted={() => setSelectedStatementId(null)}
                        />
                      </div>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        {/* Cabecera con fondo propio, separada de la tabla — mismo criterio
            que `TableScreenTitle` (bg-muted/10 + borde inferior). */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/10 px-4 py-2">
          <p className="font-heading text-lg font-bold">
            {level2Label}s del {level1Label.toLowerCase()}
          </p>
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={selectedStatementId == null}
            onClick={() => setEvidencesDialogOpen(true)}
          >
            <ControlPointIcon data-icon="inline-start" className="size-5" />
            Agregar {level2Label.toLowerCase()}s
          </Button>
        </div>

        <div className="p-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-foreground">
                <div className="flex justify-center">
                  <TableSortableHeader
                    title="#"
                    sortKey="id"
                    sort={evidenceSort}
                    onSortChange={setEvidenceSort}
                  />
                </div>
              </TableHead>
              <TableHead className="text-foreground">
                <TableSortableHeader
                  title={level2Label}
                  sortKey="text"
                  sort={evidenceSort}
                  onSortChange={setEvidenceSort}
                />
              </TableHead>
              <TableHead className="text-foreground">
                <TableSortableHeader
                  title="Estado"
                  sortKey="active"
                  sort={evidenceSort}
                  onSortChange={setEvidenceSort}
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedStatementId == null ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Selecciona un {level1Label.toLowerCase()} para ver sus {level2Label.toLowerCase()}s.
                </TableCell>
              </TableRow>
            ) : isEvidencesPending ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ) : sortedEvidences.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Sin {level2Label.toLowerCase()}s.
                </TableCell>
              </TableRow>
            ) : (
              sortedEvidences.map((evidence, index) => (
                <TableRow key={evidence.id}>
                  <TableCell className="text-center font-bold">{index + 1}</TableCell>
                  <TableCell>{evidence.text}</TableCell>
                  <TableCell>
                    <Badge
                      variant="soft"
                      color={evidence.active ? "success" : "destructive"}
                      className="rounded-full px-4 py-1.5 text-sm"
                    >
                      {evidence.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>
      </div>

      <ManageStatementDialog
        open={statementDialog.open}
        onOpenChange={(open) => setStatementDialog((prev) => ({ ...prev, open }))}
        curricularReferenceId={reference.id}
        areaId={areaId}
        statement={statementDialog.statement}
        levelLabel={level1Label}
      />

      {selectedStatementId != null && (
        <AddEvidencesDialog
          open={evidencesDialogOpen}
          onOpenChange={setEvidencesDialogOpen}
          statementId={selectedStatementId}
          levelLabel={level2Label}
        />
      )}
    </div>
  )
}
