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
import { Pagination } from "@/components/pagination"

import { toSentenceCase } from "@/features/academic-management/curricular-references/api/ui-mappings"
import { useCurricularStatementsQuery } from "@/features/academic-management/curricular-references/api/query/use-curricular-statements"
import { useCurricularEvidencesQuery } from "@/features/academic-management/curricular-references/api/query/use-curricular-evidences"
import { ManageStatementDialog } from "@/features/academic-management/curricular-references/components/statements/dialog-manage-statement"
import { DeleteStatementDialog } from "@/features/academic-management/curricular-references/components/statements/dialog-delete-statement"
import { AddEvidencesDialog } from "@/features/academic-management/curricular-references/components/statements/dialog-add-evidences"
import { DeleteEvidenceDialog } from "@/features/academic-management/curricular-references/components/statements/dialog-delete-evidence"
import type { CurricularReference } from "@/features/academic-management/curricular-references/api/types/curricular-reference"
import type { CurricularEvidence, CurricularStatement } from "@/features/academic-management/curricular-references/api/types/statement"

interface TabStatementsProps {
  reference: CurricularReference
}

export function TabStatements({ reference }: TabStatementsProps) {
  const level1Label = toSentenceCase(reference.level1 || "Enunciado")
  const level2Label = toSentenceCase(reference.level2 || "Evidencia")
  const [areaId, setAreaId] = useState<number | null | undefined>(
    reference.areas.length > 0 ? reference.areas[0].id : null,
  )
  const [onlyUnassigned, setOnlyUnassigned] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [evidenceSearchOpen, setEvidenceSearchOpen] = useState(false)
  const [evidenceSearch, setEvidenceSearch] = useState("")
  const [selectedStatementId, setSelectedStatementId] = useState<number | null>(null)
  const [statementDialog, setStatementDialog] = useState<{ open: boolean; statement: CurricularStatement | null }>(
    { open: false, statement: null },
  )
  const [evidenceDialog, setEvidenceDialog] = useState<{ open: boolean; evidence: CurricularEvidence | null }>(
    { open: false, evidence: null },
  )
  const [evidenceSort, setEvidenceSort] = useState<TableSort<"id" | "text" | "active">>(null)
  const [evidencePageIndex, setEvidencePageIndex] = useState(0)
  const [evidencePageSize, setEvidencePageSize] = useState(10)

  const { data: statements = [], isPending: isStatementsPending } = useCurricularStatementsQuery(
    reference.id,
    areaId,
  )

  const filteredStatements = statements.filter(
    (statement) =>
      statement.text.toLowerCase().includes(search.trim().toLowerCase()) &&
      (!onlyUnassigned || statement.areaId === null),
  )

  useEffect(() => {
    if (filteredStatements.some((statement) => statement.id === selectedStatementId)) return
    setSelectedStatementId(filteredStatements[0]?.id ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statements, areaId, onlyUnassigned])

  const { data: evidences = [], isPending: isEvidencesPending } = useCurricularEvidencesQuery(
    selectedStatementId,
  )
  const hasReferenceAreas = reference.areas.length > 0
  const UNASSIGNED_AREA = -1
  const areaLabels = {
    [UNASSIGNED_AREA]: "Sin asignar",
    ...Object.fromEntries(reference.areas.map((area) => [area.id, toSentenceCase(area.name)])),
  }
  const filteredEvidences = evidences.filter((evidence) =>
    evidence.text.toLowerCase().includes(evidenceSearch.trim().toLowerCase()),
  )
  const sortedEvidences = sortBySortKey(filteredEvidences, evidenceSort)

  const evidencePageCount = Math.max(1, Math.ceil(sortedEvidences.length / evidencePageSize))
  const clampedEvidencePageIndex = Math.min(evidencePageIndex, evidencePageCount - 1)
  const pagedEvidences = sortedEvidences.slice(
    clampedEvidencePageIndex * evidencePageSize,
    clampedEvidencePageIndex * evidencePageSize + evidencePageSize,
  )

  useEffect(() => {
    setEvidencePageIndex(0)
  }, [selectedStatementId, evidenceSort, evidenceSearch])

  return (
    <div className="flex flex-col gap-4">
      {hasReferenceAreas && (
        <Field orientation="vertical" variant="outlined" className="w-full">
          <FieldLabel htmlFor="statement-area">Áreas o dimensiones</FieldLabel>
          <ComboboxField
            items={areaLabels}
            value={onlyUnassigned ? UNASSIGNED_AREA : areaId}
            onValueChange={(value) => {
              if (value == null) {
                setAreaId(undefined)
                setOnlyUnassigned(false)
                return
              }
              if (value === UNASSIGNED_AREA) {
                setAreaId(null)
                setOnlyUnassigned(true)
                return
              }
              setAreaId(value as number)
              setOnlyUnassigned(false)
            }}
          >
            <ComboboxFieldTrigger id="statement-area" size="sm" className="h-12 w-full [&_svg]:size-5">
              <ComboboxFieldValue placeholder="Seleccionar" />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              <ComboboxFieldItem value={UNASSIGNED_AREA}>Sin asignar</ComboboxFieldItem>
              {reference.areas.map((area) => (
                <ComboboxFieldItem key={area.id} value={area.id}>
                  {toSentenceCase(area.name)}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        </Field>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[20rem_1fr]">
      <div className="min-w-0 flex flex-col gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger
              render={
                <Button type="button" variant="outline" color="primary" size="icon-sm" aria-label="Buscar" />
              }
            >
              <MagnifyingGlassIcon />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-2">
              <InputGroup className="h-10 w-full rounded-full border-transparent border-b-transparent has-[[data-slot=input-group-control]:focus-visible]:border-transparent has-[[data-slot=input-group-control]:focus-visible]:border-b-transparent has-[[data-slot=input-group-control]:focus-visible]:ring-0">
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
            className="min-w-0 shrink"
            disabled={areaId === undefined}
            onClick={() => setStatementDialog({ open: true, statement: null })}
          >
            <ControlPointIcon data-icon="inline-start" className="size-5 shrink-0" />
            <span className="truncate" title={`Agregar ${level1Label.toLowerCase()}`}>
              Agregar {level1Label.toLowerCase()}
            </span>
          </Button>
        </div>

        <div className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
          {isStatementsPending ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : filteredStatements.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border p-4 text-center text-sm break-words">
              {areaId === undefined ? "Selecciona un área." : `Sin ${level1Label.toLowerCase()}s.`}
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
                  <p className="break-words font-bold">{statement.text}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="soft" color={statement.active ? "success" : "destructive"}>
                      {statement.active ? "Activo" : "Inactivo"}
                    </Badge>
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                      )}
                    >
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
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex items-center justify-between gap-2 border-b border-border bg-table-screen-title px-4 py-2">
          <p
            className="min-w-0 flex-1 truncate font-heading text-[17px] font-bold"
            title={`${level2Label}s del ${level1Label.toLowerCase()}`}
          >
            {level2Label}s del {level1Label.toLowerCase()}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Popover open={evidenceSearchOpen} onOpenChange={setEvidenceSearchOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    color="primary"
                    size="icon-sm"
                    aria-label="Buscar"
                    disabled={selectedStatementId == null}
                  />
                }
              >
                <MagnifyingGlassIcon />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-2">
                <InputGroup className="h-10 w-full rounded-full border-transparent border-b-transparent has-[[data-slot=input-group-control]:focus-visible]:border-transparent has-[[data-slot=input-group-control]:focus-visible]:border-b-transparent has-[[data-slot=input-group-control]:focus-visible]:ring-0">
                  <InputGroupAddon align="inline-start" className="ml-2">
                    <MagnifyingGlassIcon className="text-muted-foreground size-4" />
                  </InputGroupAddon>
                  <InputGroupInput
                    autoFocus
                    type="search"
                    autoComplete="off"
                    value={evidenceSearch}
                    onChange={(event) => setEvidenceSearch(event.target.value)}
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
              className="min-w-0 max-w-48"
              disabled={selectedStatementId == null}
              onClick={() => setEvidenceDialog({ open: true, evidence: null })}
            >
              <ControlPointIcon data-icon="inline-start" className="size-5 shrink-0" />
              <span className="truncate" title={`Agregar ${level2Label.toLowerCase()}s`}>
                Agregar {level2Label.toLowerCase()}s
              </span>
            </Button>
          </div>
        </div>

        <div className="p-4">
        <div className="max-h-[28rem] overflow-y-auto">
        <Table className="table-fixed">
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16 text-foreground">
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
                  titleClassName="max-w-40 truncate"
                  sortKey="text"
                  sort={evidenceSort}
                  onSortChange={setEvidenceSort}
                />
              </TableHead>
              <TableHead className="w-32 text-foreground">
                <TableSortableHeader
                  title="Estado"
                  sortKey="active"
                  sort={evidenceSort}
                  onSortChange={setEvidenceSort}
                />
              </TableHead>
              <TableHead className="w-24 text-foreground">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedStatementId == null ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground break-words">
                  Selecciona un {level1Label.toLowerCase()} para ver sus {level2Label.toLowerCase()}s.
                </TableCell>
              </TableRow>
            ) : isEvidencesPending ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            ) : sortedEvidences.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground break-words">
                  Sin {level2Label.toLowerCase()}s.
                </TableCell>
              </TableRow>
            ) : (
              pagedEvidences.map((evidence, index) => (
                <TableRow key={evidence.id} className="group">
                  <TableCell className="text-center font-bold">
                    {clampedEvidencePageIndex * evidencePageSize + index + 1}
                  </TableCell>
                  <TableCell className="break-words">{evidence.text}</TableCell>
                  <TableCell>
                    <Badge
                      variant="soft"
                      color={evidence.active ? "success" : "destructive"}
                      className="rounded-full px-4 py-1.5 text-sm"
                    >
                      {evidence.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 has-[[aria-expanded=true]]:opacity-100">
                      <Button
                        type="button"
                        variant="ghost"
                        color="neutral"
                        size="icon-sm"
                        aria-label={`Editar ${level2Label.toLowerCase()}`}
                        onClick={() => setEvidenceDialog({ open: true, evidence })}
                      >
                        <PencilIcon />
                      </Button>
                      <DeleteEvidenceDialog evidence={evidence} levelLabel={level2Label} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
        {sortedEvidences.length > 0 && (
          <Pagination
            pageIndex={clampedEvidencePageIndex}
            pageCount={evidencePageCount}
            canPrev={clampedEvidencePageIndex > 0}
            canNext={clampedEvidencePageIndex < evidencePageCount - 1}
            onPageChange={setEvidencePageIndex}
            totalCount={sortedEvidences.length}
            pageSize={evidencePageSize}
            onPageSizeChange={(size) => {
              setEvidencePageSize(size)
              setEvidencePageIndex(0)
            }}
          />
        )}
        </div>
      </div>
      </div>

      <ManageStatementDialog
        open={statementDialog.open}
        onOpenChange={(open) => setStatementDialog((prev) => ({ ...prev, open }))}
        curricularReferenceId={reference.id}
        areaId={areaId}
        areas={reference.areas}
        statement={statementDialog.statement}
        levelLabel={level1Label}
        onCreated={setSelectedStatementId}
      />

      {selectedStatementId != null && (
        <AddEvidencesDialog
          open={evidenceDialog.open}
          onOpenChange={(open) => setEvidenceDialog((prev) => ({ ...prev, open }))}
          curricularReferenceId={reference.id}
          statementId={selectedStatementId}
          levelLabel={level2Label}
          evidence={evidenceDialog.evidence}
        />
      )}
    </div>
  )
}
