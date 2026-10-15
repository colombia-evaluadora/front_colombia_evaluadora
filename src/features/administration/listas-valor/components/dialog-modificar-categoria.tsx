import { useState } from "react"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { CheckIcon, PencilIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { TEXTAREA_OUTLINED, Textarea } from "@/components/ui/textarea"
import { getErrorMessage } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { useEstadoCategoria } from "@/features/administration/listas-valor/api/mutations/estado-categoria"
import { useDeleteCategoria } from "@/features/administration/listas-valor/api/mutations/delete-categoria"
import { useUpdateCategoria } from "@/features/administration/listas-valor/api/mutations/update-categoria"
import type { Categoria } from "@/features/administration/listas-valor/api/types/lista-valor"
import { EstadoField } from "@/features/administration/listas-valor/components/estado-field"
import {
  CategoriaPadreSelect,
  NONE,
} from "@/features/administration/listas-valor/components/padre-select"

interface Draft {
  nombre: string
  descripcion: string
  padre: string
  ordinal: boolean
  habilitada: boolean
}

const toDraft = (categoria: Categoria): Draft => ({
  nombre: categoria.nombre,
  descripcion: categoria.descripcion ?? "",
  padre: categoria.categoriaPadre ?? NONE,
  ordinal: categoria.esOrdinal,
  habilitada: categoria.habilitada,
})

interface DialogModificarCategoriaProps {
  categoria: Categoria
  categorias: Categoria[]
  puedeEditar: boolean
  puedeEliminar: boolean
  onDeleted: () => void
}

/**
 * Modificar una lista (`PUT /listas-valor/categorias/:CATEGORIA`): nombre, descripción, lista
 * padre y si es ordinal, o eliminarla. El código es inmutable. Cambiar la lista padre
 * de una lista cuyos valores ya tienen valor padre lo rechaza el back: hay que
 * quitárselos primero (V101).
 */
export function DialogModificarCategoria({
  categoria,
  categorias,
  puedeEditar,
  puedeEliminar,
  onDeleted,
}: DialogModificarCategoriaProps) {
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => toDraft(categoria))
  const [submitted, setSubmitted] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(categoria))
  const largo = draft.descripcion.trim().length
  const descInvalida = largo > 0 && (largo < 10 || largo > 300)
  const descError = submitted && descInvalida ? "Entre 10 y 300 caracteres" : undefined
  const nombreError = submitted && !draft.nombre.trim() ? "El nombre es obligatorio" : undefined

  const update = useUpdateCategoria()
  const estado = useEstadoCategoria()
  const cambiaEstado = draft.habilitada !== categoria.habilitada
  const cambianDatos =
    JSON.stringify({ ...draft, habilitada: categoria.habilitada }) !==
    JSON.stringify(toDraft(categoria))

  // Datos y estado son dos endpoints: primero los datos, luego el estado.
  async function guardar() {
    try {
      if (cambianDatos)
        await update.mutateAsync({
          categoria: categoria.categoria,
          nombre: draft.nombre.trim(),
          descripcion: draft.descripcion.trim() || null,
          padre: draft.padre === NONE ? null : draft.padre,
          ordinal: draft.ordinal,
        })
      if (cambiaEstado)
        await estado.mutateAsync({ categoria: categoria.categoria, habilitada: draft.habilitada })
      setOpen(false)
      const m = SUCCESS_MESSAGES.listaValorCategoria
      notify(
        cambiaEstado && !cambianDatos
          ? draft.habilitada
            ? m.activated
            : m.deactivated
          : m.updated,
      )
    } catch (error) {
      setNotice({ id: Date.now(), message: getErrorMessage(error) })
    }
  }

  const deleteCategoria = useDeleteCategoria({
    mutationConfig: {
      onSuccess: () => {
        setConfirmDeleteOpen(false)
        setOpen(false)
        notify(SUCCESS_MESSAGES.listaValorCategoria.deleted)
        onDeleted()
      },
      onError: (error) => {
        setConfirmDeleteOpen(false)
        setNotice({ id: Date.now(), message: getErrorMessage(error) })
      },
    },
  })

  const busy = update.isPending || estado.isPending || deleteCategoria.isPending

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(toDraft(categoria))
      setSubmitted(false)
    }
    setNotice(null)
    setOpen(next)
  }

  function requestClose() {
    if (busy) return
    if (dirty) {
      setConfirmDiscardOpen(true)
      return
    }
    handleOpenChange(false)
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (descInvalida || !draft.nombre.trim()) return
    if (!dirty) {
      handleOpenChange(false)
      return
    }
    void guardar()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? handleOpenChange(true) : requestClose())}>
      <DialogTrigger render={<Button variant="outline" color="neutral" size="sm" />}>
        <PencilIcon data-icon="inline-start" />
        Modificar
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl" inert={confirmDiscardOpen || confirmDeleteOpen}>
        <DialogHeader>
          <DialogTitle>Modificar lista</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />

        <form
          id="modificar-categoria-form"
          onSubmit={handleSubmit}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field variant="outlined" data-invalid={nombreError ? "true" : undefined}>
            <FieldLabel htmlFor="modificar-categoria-nombre">Nombre de la lista*</FieldLabel>
            <Input
              id="modificar-categoria-nombre"
              maxLength={100}
              value={draft.nombre}
              disabled={!puedeEditar}
              onChange={(e) => setDraft((prev) => ({ ...prev, nombre: e.target.value }))}
              aria-invalid={Boolean(nombreError)}
            />
            {nombreError ? (
              <FieldError>{nombreError}</FieldError>
            ) : (
              <FieldDescription>
                Código <span className="font-mono">{categoria.categoria}</span>, no se cambia.
              </FieldDescription>
            )}
          </Field>
          <Field variant="outlined">
            <FieldLabel htmlFor="modificar-categoria-padre">Depende de</FieldLabel>
            <CategoriaPadreSelect
              id="modificar-categoria-padre"
              value={draft.padre}
              categorias={categorias}
              exclude={categoria.categoria}
              disabled={!puedeEditar}
              onChange={(next) => setDraft((prev) => ({ ...prev, padre: next }))}
            />
          </Field>
          <Field
            variant="outlined"
            className="sm:col-span-2"
            data-invalid={descError ? "true" : undefined}
          >
            <FieldLabel htmlFor="modificar-categoria-descripcion">Descripción</FieldLabel>
            <Textarea
              className={TEXTAREA_OUTLINED}
              id="modificar-categoria-descripcion"
              placeholder="Para qué se usa la lista"
              maxLength={300}
              rows={2}
              value={draft.descripcion}
              disabled={!puedeEditar}
              onChange={(e) => setDraft((prev) => ({ ...prev, descripcion: e.target.value }))}
              aria-invalid={Boolean(descError)}
            />
            {descError ? (
              <FieldError>{descError}</FieldError>
            ) : (
              <FieldDescription>Opcional. Entre 10 y 300 caracteres.</FieldDescription>
            )}
          </Field>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <Checkbox
              checked={draft.ordinal}
              disabled={!puedeEditar}
              onCheckedChange={(next) => setDraft((prev) => ({ ...prev, ordinal: next === true }))}
            />
            <span>
              Lista ordinal
              <span className="block text-xs text-muted-foreground">
                Sus valores tienen un orden con significado, como Bajo, Básico, Alto y Superior.
              </span>
            </span>
          </label>
          <EstadoField
            id="modificar-categoria-estado"
            de="lista"
            className="sm:col-span-2"
            checked={draft.habilitada}
            disabled={!puedeEditar}
            onChange={(next) => setDraft((prev) => ({ ...prev, habilitada: next }))}
          />
        </form>

        <DialogFooter className="sm:justify-between">
          {puedeEliminar ? (
            <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
              <AlertDialogTrigger
                render={
                  <Button
                    size="sm"
                    type="button"
                    variant="ghost"
                    color="destructive"
                    disabled={busy}
                  />
                }
              >
                <TrashIcon data-icon="inline-start" />
                Eliminar lista
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar lista</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminarán los {categoria.totalValores} valores de {categoria.nombre}. No se
                    puede si alguno está en uso, si tiene valores del sistema o si otra lista
                    depende de ella; en esos casos, inactívela.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction
                    color="destructive"
                    disabled={deleteCategoria.isPending}
                    aria-busy={deleteCategoria.isPending}
                    onClick={() => deleteCategoria.mutate({ categoria: categoria.categoria })}
                  >
                    {deleteCategoria.isPending ? (
                      <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <CheckIcon data-icon="inline-start" />
                    )}
                    Si
                  </AlertDialogAction>
                  <AlertDialogCancel variant="fill" color="neutral">
                    <XIcon data-icon="inline-start" />
                    No
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            {puedeEditar && (
              <Button
                size="sm"
                type="submit"
                color="primary"
                form="modificar-categoria-form"
                disabled={busy}
                aria-busy={update.isPending || estado.isPending}
              >
                {update.isPending || estado.isPending ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <CheckIcon data-icon="inline-start" />
                )}
                Guardar
              </Button>
            )}
            <Button size="sm" type="button" variant="fill" color="neutral" onClick={requestClose}>
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
          </div>
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
