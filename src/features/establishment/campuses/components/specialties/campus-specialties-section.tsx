import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { CheckIcon, PencilIcon, PlusIcon, ProhibitIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { actionsOverlayClass } from "@/components/table-row-actions"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage, isConflictError } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { useCampusSpecialtiesQuery } from "@/features/establishment/campuses/api/query/use-campus-specialties"
import { useDeleteCampusSpecialty } from "@/features/establishment/campuses/api/mutations/specialties"
import type { CampusSpecialty } from "@/features/establishment/campuses/api/types/campus"
import { CampusStatusBadge } from "@/features/establishment/campuses/components/campus-badges"
import { SpecialtyDialog } from "@/features/establishment/campuses/components/specialties/specialty-dialog"

interface CampusSpecialtiesSectionProps {
  campusId: number
  /** En Ver detalle se lista sin acciones. */
  readOnly: boolean
}

function DeleteSpecialtyDialog({
  campusId,
  item,
  onClose,
}: {
  campusId: number
  item: CampusSpecialty | null
  onClose: () => void
}) {
  const { notify } = useNotify()
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)
  const label = item ? (item.ownName ?? item.specialtyName) : ""
  const mutation = useDeleteCampusSpecialty({
    mutationConfig: {
      onSuccess: () => {
        notify(SUCCESS_MESSAGES.campusSpecialty.deleted)
        onClose()
      },
      onError: (error) => {
        // Con asignaturas o matrículas que la usan, el backend responde 409 con la lista (Regla 86).
        if (isConflictError(error)) {
          setBlockedMessage(getErrorMessage(error))
          return
        }
        onClose()
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  return (
    <AlertDialog
      open={item != null}
      onOpenChange={(open) => {
        if (open || mutation.isPending) return
        setBlockedMessage(null)
        onClose()
      }}
    >
      <AlertDialogContent>
        {blockedMessage ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-start gap-2">
                <ProhibitIcon className="mt-0.5 size-6 shrink-0 text-red" aria-hidden />
                No se puede eliminar la especialidad {label}
              </AlertDialogTitle>
              <AlertDialogDescription>{blockedMessage}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel color="primary">
                <CheckIcon data-icon="inline-start" />
                Entendido
              </AlertDialogCancel>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminará la especialidad {label} del catálogo de la sede. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant="outline" color="neutral" disabled={mutation.isPending}>
                <XIcon data-icon="inline-start" />
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                color="destructive"
                disabled={mutation.isPending}
                aria-busy={mutation.isPending}
                onClick={() => item && mutation.mutate({ campusId, specialtyItemId: item.id })}
              >
                {mutation.isPending ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <TrashIcon data-icon="inline-start" />
                )}
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Catálogo de especialidades de la sede (sección 3.2, Regla 86). */
export function CampusSpecialtiesSection({ campusId, readOnly }: CampusSpecialtiesSectionProps) {
  const { data: items = [], isPending, isError, error } = useCampusSpecialtiesQuery(campusId)
  const [editing, setEditing] = useState<CampusSpecialty | "new" | null>(null)
  const [deleting, setDeleting] = useState<CampusSpecialty | null>(null)

  return (
    <div className="flex flex-col gap-3">
      {readOnly ? null : (
        <div className="flex justify-end">
          <Button type="button" variant="fill" color="primary" size="sm" onClick={() => setEditing("new")}>
            <PlusIcon data-icon="inline-start" />
            Agregar especialidad
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Carácter</TableHead>
              <TableHead>Especialidad</TableHead>
              <TableHead>Nombre propio</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                  Cargando especialidades…
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-red">
                  {getErrorMessage(error)}
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                  La sede aún no tiene especialidades. Use Agregar especialidad para elegirlas de la lista.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="group/row">
                  <TableCell>{item.characterName}</TableCell>
                  <TableCell>{item.specialtyName}</TableCell>
                  <TableCell>{item.ownName ?? "—"}</TableCell>
                  <TableCell className="relative">
                    <CampusStatusBadge status={item.status} />
                    {readOnly ? null : (
                      <div className={actionsOverlayClass(false, "background")}>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                color="neutral"
                                size="icon-sm"
                                aria-label="Modificar especialidad"
                                onClick={() => setEditing(item)}
                              />
                            }
                          >
                            <PencilIcon />
                          </TooltipTrigger>
                          <TooltipContent>Modificar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                color="neutral"
                                size="icon-sm"
                                aria-label="Eliminar especialidad"
                                onClick={() => setDeleting(item)}
                              />
                            }
                          >
                            <TrashIcon />
                          </TooltipTrigger>
                          <TooltipContent>Eliminar</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {readOnly ? null : (
        <>
          <SpecialtyDialog
            campusId={campusId}
            item={editing === "new" ? null : editing}
            open={editing != null}
            onOpenChange={(open) => !open && setEditing(null)}
          />
          <DeleteSpecialtyDialog campusId={campusId} item={deleting} onClose={() => setDeleting(null)} />
        </>
      )}
    </div>
  )
}
