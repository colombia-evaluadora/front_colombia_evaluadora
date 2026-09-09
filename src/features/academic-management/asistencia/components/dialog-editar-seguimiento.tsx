import * as React from "react"

import { useNotify } from "@/components/notice/notice-context"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FileUpload, FileUploadTrigger } from "@/components/ui/file-upload"
import { EyeIcon, PaperclipIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"

import { useAsistenciaEditarMutation } from "@/features/academic-management/asistencia/api/mutations/use-asistencia-editar-mutation"
import { useTipoAsistenciaCatalogQuery } from "@/features/academic-management/asistencia/api/query/use-tipo-asistencia-catalog-query"
import { useArchivoViewUrl } from "@/features/files/api/query/use-archivo-view-url"
import { nombreMateriaSeguimiento } from "@/features/academic-management/asistencia/api/ui-mappings"
import type { AsistenciaQueryRow } from "@/features/academic-management/asistencia/api/types/asistencia"

interface EditarSeguimientoDialogProps {
  row: AsistenciaQueryRow
}


const TEXTAREA_OUTLINED =
  "rounded-md border border-input px-3 py-2 hover:border-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"

function VerSoporteButton({ archivoLocal, fkSoporteArchivo }: { archivoLocal: File | null; fkSoporteArchivo: number | null }) {
  const { data: url, isPending } = useArchivoViewUrl(archivoLocal ? null : fkSoporteArchivo)
  const puedeVer = Boolean(archivoLocal) || Boolean(url)

  function handleVer() {
    if (archivoLocal) {
      window.open(URL.createObjectURL(archivoLocal), "_blank", "noopener,noreferrer")
    } else if (url) {
      window.open(url, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <button
      type="button"
      aria-label="Ver soporte"
      disabled={!puedeVer || isPending}
      className="text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      onClick={handleVer}
    >
      <EyeIcon className="size-3.5 shrink-0" />
    </button>
  )
}

/** Editar UN registro de "Seguimiento" (PATCH /asistencias/:ID). */
export function EditarSeguimientoDialog({ row }: EditarSeguimientoDialogProps) {
  const { notify } = useNotify()
  const [open, setOpen] = React.useState(false)
  const [tipo, setTipo] = React.useState(row.tipo_asistencia_valor.toString())
  const [observacion, setObservacion] = React.useState(row.observacion ?? "")
  const [soporteNuevo, setSoporteNuevo] = React.useState<File | null>(null)
  const [soporteEliminado, setSoporteEliminado] = React.useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = React.useState(false)

  const editar = useAsistenciaEditarMutation()
  const { data: tipoOptions = [] } = useTipoAsistenciaCatalogQuery()

  // El diálogo reabre siempre con los valores actuales de la fila -- si se
  // editó una vez y se vuelve a abrir, no debe arrastrar el borrador anterior.
  function handleOpenChange(next: boolean) {
    if (next) {
      setTipo(row.tipo_asistencia_valor.toString())
      setObservacion(row.observacion ?? "")
      setSoporteNuevo(null)
      setSoporteEliminado(false)
      setConfirmDiscardOpen(false)
    }
    setOpen(next)
  }

  const soporteExistenteNombre = soporteNuevo || soporteEliminado ? null : row.soporte_nombre
  const soporteExistenteFk = soporteNuevo || soporteEliminado ? null : row.fk_soporte_archivo
  const haySoporte = Boolean(soporteNuevo || soporteExistenteNombre)

  const isDirty =
    tipo !== row.tipo_asistencia_valor.toString() ||
    observacion.trim() !== (row.observacion ?? "") ||
    soporteNuevo !== null ||
    soporteEliminado

  function requestClose() {
    if (editar.isPending) return
    if (isDirty) {
      setConfirmDiscardOpen(true)
      return
    }
    handleOpenChange(false)
  }

  function handleGuardar() {
    const tipoNum = Number(tipo) as AsistenciaQueryRow["tipo_asistencia_valor"]
    const observacionTrim = observacion.trim()

    editar.mutate(
      {
        pkTasistencia: row.pk_tasistencia,
        body: {
          ...(tipoNum !== row.tipo_asistencia_valor && { TIPO_ASISTENCIA: tipoNum }),
          ...(observacionTrim !== (row.observacion ?? "") && {
            ...(observacionTrim ? { OBSERVACION: observacionTrim } : { LIMPIAR_OBSERVACION: true }),
          }),
          ...(soporteNuevo && { SOPORTE_ARCHIVO: soporteNuevo }),
          ...(soporteEliminado && !soporteNuevo && { LIMPIAR_ARCHIVO: true }),
        },
      },
      {
        onSuccess: () => {
          notify("Registro actualizado.")
          setOpen(false)
        },
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose()
        else handleOpenChange(next)
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" color="neutral" size="icon-xs" aria-label={`Editar registro de ${row.estudiante}`}>
            <PencilIcon />
          </Button>
        }
      />
      <DialogContent showCloseButton={false} inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>Editar asistencia</DialogTitle>
          <DialogDescription>
            {row.estudiante} · {row.grupo} · {nombreMateriaSeguimiento(row)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Tipo de asistencia</FieldLabel>
            <Select
              items={Object.fromEntries(tipoOptions.map((opt) => [opt.value.toString(), opt.label]))}
              value={tipo}
              onValueChange={(value) => setTipo(value ?? "")}
            >
              <SelectTrigger variant="outlined">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {tipoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Observación</FieldLabel>
            <Textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Sin observación"
              className={TEXTAREA_OUTLINED}
            />
          </Field>

          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel>Soporte de justificación</FieldLabel>
            <div className="flex items-center gap-1.5 rounded-md border border-input px-3 py-2">
              <FileUpload
                value={soporteNuevo ? [soporteNuevo] : []}
                onValueChange={(files) => {
                  setSoporteNuevo(files[0] ?? null)
                  if (files[0]) setSoporteEliminado(false)
                }}
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={10 * 1024 * 1024}
                className="w-fit"
              >
                <FileUploadTrigger
                  render={
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-1.5 text-sm hover:underline",
                        haySoporte ? "text-foreground" : "text-muted-foreground",
                      )}
                    />
                  }
                >
                  <PaperclipIcon className="size-4 shrink-0" />
                  <span className="max-w-56 truncate">
                    {soporteNuevo?.name ?? soporteExistenteNombre ?? "Sin soporte"}
                  </span>
                </FileUploadTrigger>
              </FileUpload>
              {haySoporte && <VerSoporteButton archivoLocal={soporteNuevo} fkSoporteArchivo={soporteExistenteFk} />}
              {haySoporte && (
                <button
                  type="button"
                  aria-label="Quitar soporte"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSoporteNuevo(null)
                    setSoporteEliminado(true)
                  }}
                >
                  <XIcon className="size-3.5 shrink-0" />
                </button>
              )}
            </div>
          </Field>
        </div>

        <DialogFooter className="justify-end gap-2">
          <Button
            size="sm"
            type="button"
            color="primary"
            disabled={editar.isPending}
            aria-busy={editar.isPending}
            onClick={handleGuardar}
          >
            {editar.isPending && <SpinnerIcon data-icon="inline-start" className="animate-spin" />}
            Guardar
          </Button>
          <Button
            size="sm"
            type="button"
            variant="fill"
            color="neutral"
            disabled={editar.isPending}
            onClick={requestClose}
          >
            <XIcon data-icon="inline-start" />
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          handleOpenChange(false)
        }}
      />
    </Dialog>
  )
}
