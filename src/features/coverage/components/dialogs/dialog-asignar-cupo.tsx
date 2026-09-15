import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { WarningIcon, CheckIcon, XIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { formatGrade } from "@/features/coverage/api/ui-mappings"
import { usePreMatriculaCatalogsQuery } from "@/features/coverage/api/query/use-pre-matricula-catalogs-query"
import type { PreMatricula, PreMatriculaGroupsByCampus } from "@/features/coverage/api/types/pre-matricula"

interface AsignarCupoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /**
   * IDs de los registros seleccionados (para consultar sus sedes y grupos).
   */
  selectedIds: string[]
  /**
   * Grado sugerido para la matrícula. Se muestra desactivado.
   * Null si los registros seleccionados tienen grados distintos.
   */
  targetGrade: number | null
  /**
   * Grupo inicial del campo editable.
   */
  suggestedGroup?: string
  /**
   * Estudiantes seleccionados que están reprobados: repiten su grado actual
   * (ej. repetir 6°). El administrador debe confirmar esta acción.
   */
  reprobados?: PreMatricula[]
  onConfirm: (values: { useSuggestedGroups: boolean; group: string }) => void
}

export function AsignarCupoDialog({
  open,
  onOpenChange,
  selectedIds,
  targetGrade,
  suggestedGroup = "",
  reprobados = [],
  onConfirm,
}: AsignarCupoDialogProps) {
  const [useSuggestedGroups, setUseSuggestedGroups] = useState(true)
  const [group, setGroup] = useState(suggestedGroup)

  const { data: catalogsByCampus = [] } = usePreMatriculaCatalogsQuery({
    targetGrade: targetGrade ?? 1,
    ids: selectedIds,
    enabled: open,
  })

  function handleConfirm() {
    onConfirm({ useSuggestedGroups, group })
    onOpenChange(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setUseSuggestedGroups(true)
      setGroup(suggestedGroup)
    }
    onOpenChange(next)
  }

  const gradeValue = targetGrade !== null ? String(targetGrade) : ""
  const gradeItems = targetGrade !== null ? { [gradeValue]: formatGrade(targetGrade) } : {}

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="flex max-h-[85vh] flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Confirmar asignación de cupo</DialogTitle>
        </DialogHeader>

        {/* Único bloque con scroll: header y footer quedan fijos afuera —
            el aviso de reprobados (`reprobados.map`, sin tope) puede crecer
            con un lote grande de asignación y antes empujaba todo el
            diálogo fuera de la pantalla. */}
        <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {reprobados.length > 0 && (
          <Alert variant="destructive">
            <WarningIcon />
            <AlertTitle>Estudiante(s) reprobado(s)</AlertTitle>
            <AlertDescription>
              {reprobados.length === 1 ? (
                <>
                  <strong>
                    {reprobados[0].firstName} {reprobados[0].lastName}
                  </strong>{" "}
                  está reprobado: su grado a cursar será el mismo grado actual (repetir{" "}
                  {formatGrade(reprobados[0].grade)}). Debe confirmar esta acción.
                </>
              ) : (
                <>
                  Los siguientes {reprobados.length} estudiantes están reprobados: su grado a
                  cursar será el mismo grado actual (repetir grado).
                  <ul className="mt-2 list-inside list-disc">
                    {reprobados.map((r) => (
                      <li key={r.id}>
                        <strong>
                          {r.firstName} {r.lastName}
                        </strong>{" "}
                        — repetir {formatGrade(r.grade)}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Checkbox: Matricular en los grupos sugeridos */}
        <Label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox
            id="use-suggested-groups"
            checked={useSuggestedGroups}
            onCheckedChange={(v) => setUseSuggestedGroups(!!v)}
          />
          Matricular en los grupos sugeridos.
        </Label>

        {/* Campos Grado y Grupo */}
        <div className="grid grid-cols-2 gap-3">
          {/* Grado — desactivado, valor sugerido */}
          <Field variant="outlined" className="gap-2">
            <FieldLabel htmlFor="matricula-grado">Grado</FieldLabel>
            <ComboboxField value={gradeValue} items={gradeItems} disabled>
              <ComboboxFieldTrigger id="matricula-grado" size="sm" className="w-full">
                <ComboboxFieldValue placeholder="—" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {targetGrade !== null && (
                  <ComboboxFieldItem value={gradeValue}>
                    {formatGrade(targetGrade)}
                  </ComboboxFieldItem>
                )}
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>

          {/* Grupo — editable con opciones por sede */}
          <Field variant="outlined" className="gap-2">
            <FieldLabel htmlFor="matricula-grupo">Grupo</FieldLabel>
            <ComboboxField value={group} onValueChange={(v) => setGroup(v ?? "")}>
              <ComboboxFieldTrigger id="matricula-grupo" size="sm" className="w-full">
                <ComboboxFieldValue placeholder="Ej. 401" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                <GroupsByCampusItems catalogsByCampus={catalogsByCampus} />
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>
        </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button size="sm" color="primary" onClick={handleConfirm}>
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

/** Renderiza los ítems del combobox agrupados por sede, igual al mockup. */
function GroupsByCampusItems({
  catalogsByCampus,
}: {
  catalogsByCampus: PreMatriculaGroupsByCampus[]
}) {
  return catalogsByCampus.map(({ campus, groups }) => (
    <div key={campus} role="group">
      {/* Encabezado de sede */}
      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{campus}</div>
      {groups.map((g) => (
        <ComboboxFieldItem key={`${campus}-${g}`} value={g}>
          {g}
        </ComboboxFieldItem>
      ))}
    </div>
  ))
}
