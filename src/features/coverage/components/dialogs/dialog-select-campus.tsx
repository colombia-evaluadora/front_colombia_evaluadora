import { useEffect, useState } from "react"

import { CheckIcon, XIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TableSortableHeader, sortBySortKey, type TableSort } from "@/components/table-sort-header"
import { cn } from "@/lib/utils"

import { MOCK_CAMPUS_OPTIONS, type CampusOption } from "@/features/coverage/utils/campus-options"

interface SelectCampusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Sede actualmente seleccionada (por nombre), para preseleccionar la fila. */
  value?: string
  onConfirm: (campus: CampusOption) => void
}

export function SelectCampusDialog({ open, onOpenChange, value, onConfirm }: SelectCampusDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    MOCK_CAMPUS_OPTIONS.find((campus) => campus.name === value)?.id ?? null,
  )
  const [sort, setSort] = useState<TableSort<"name" | "shift" | "gender">>(null)

  // Cada apertura arranca desde la sede actual del registro -- si el usuario
  // abre, cambia de idea y cierra sin "Aceptar", la próxima apertura no debe
  // arrastrar esa selección descartada.
  useEffect(() => {
    if (open) setSelectedId(MOCK_CAMPUS_OPTIONS.find((campus) => campus.name === value)?.id ?? null)
  }, [open, value])

  const sortedOptions = sortBySortKey(MOCK_CAMPUS_OPTIONS, sort)
  const selectedCampus = MOCK_CAMPUS_OPTIONS.find((campus) => campus.id === selectedId) ?? null

  function handleConfirm() {
    if (!selectedCampus) return
    onConfirm(selectedCampus)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-2xl">
        <DialogHeader className="sm:text-center sm:place-items-center">
          <DialogTitle>Seleccionar establecimiento</DialogTitle>
        </DialogHeader>

        <Table containerClassName="rounded-md border">
          <TableHeader>
            <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
              <TableHead className="w-10">
                <span className="sr-only">Seleccionar</span>
              </TableHead>
              <TableHead className="text-foreground">
                <TableSortableHeader title="Sede educativa" sortKey="name" sort={sort} onSortChange={setSort} />
              </TableHead>
              <TableHead className="text-foreground">
                <TableSortableHeader title="Jornada" sortKey="shift" sort={sort} onSortChange={setSort} />
              </TableHead>
              <TableHead className="text-foreground">
                <TableSortableHeader title="Género" sortKey="gender" sort={sort} onSortChange={setSort} />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedOptions.map((campus) => {
              const isSelected = selectedId === campus.id
              return (
                <TableRow
                  key={campus.id}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => setSelectedId(campus.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      setSelectedId(campus.id)
                    }
                  }}
                  className={cn("cursor-pointer outline-none", isSelected && "bg-muted-22")}
                >
                  <TableCell>
                    <span
                      className={cn(
                        "flex size-4.5 shrink-0 items-center justify-center rounded-full border",
                        isSelected ? "border-primary" : "border-input",
                      )}
                    >
                      {isSelected ? <span className="size-2 rounded-full bg-primary" /> : null}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground uppercase">{campus.name}</span>
                      <span className="text-xs text-muted-foreground">{campus.address}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{campus.shift}</TableCell>
                  <TableCell className="text-muted-foreground">{campus.gender}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        <DialogFooter className="sm:justify-center">
          <Button size="sm" color="primary" disabled={!selectedCampus} onClick={handleConfirm}>
            <CheckIcon data-icon="inline-start" />
            Aceptar
          </Button>
          <DialogClose render={<Button size="sm" variant="fill" color="neutral" />}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
