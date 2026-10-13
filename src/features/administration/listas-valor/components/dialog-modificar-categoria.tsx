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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { CheckIcon, PencilIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { getErrorMessage } from "@/lib/api-client"
import { INCOMPLETE_FORM } from "@/lib/forms/messages"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { useDeleteCategoria } from "@/features/administration/listas-valor/api/mutations/delete-categoria"
import { useSaveValor } from "@/features/administration/listas-valor/api/mutations/save-valor"
import type {
  Categoria,
  ListaValor,
} from "@/features/administration/listas-valor/api/types/lista-valor"
import {
  CategoriaPadreSelect,
  NONE,
  ValorPadreSelect,
} from "@/features/administration/listas-valor/components/padre-select"

interface Fila {
  pk: number
  nombre: string
  valor: string
  accion: string
  padre: string
}

const toFila = (v: ListaValor): Fila => ({
  pk: v.pkListaValor,
  nombre: v.nombre,
  valor: v.valor,
  accion: v.accion ?? "",
  padre: v.padre ? String(v.padre.pkListaValor) : NONE,
})

const mismaFila = (a: Fila, b: Fila) =>
  a.nombre === b.nombre && a.accion === b.accion && a.padre === b.padre

interface DialogModificarCategoriaProps {
  categoria: Categoria
  categorias: Categoria[]
  valores: ListaValor[]
  puedeEditar: boolean
  puedeEliminar: boolean
  onDeleted: () => void
}

/**
 * Modificar una lista: sus valores en bloque (nombre, acción y padre) y su lista
 * padre, o eliminarla completa. El backend no permite renombrar la lista.
 */
export function DialogModificarCategoria({
  categoria,
  categorias,
  valores,
  puedeEditar,
  puedeEliminar,
  onDeleted,
}: DialogModificarCategoriaProps) {
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [categoriaPadre, setCategoriaPadre] = useState(NONE)
  const [filas, setFilas] = useState<Fila[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const iniciales = valores.map(toFila)
  const padreInicial = categoria.categoriasPadre[0] ?? NONE
  const cambiadas = filas.filter((f) => {
    const original = iniciales.find((i) => i.pk === f.pk)
    return !original || !mismaFila(f, original)
  })
  const dirty = cambiadas.length > 0 || categoriaPadre !== padreInicial

  const save = useSaveValor()
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

  const busy = saving || deleteCategoria.isPending

  function handleOpenChange(next: boolean) {
    if (next) {
      setCategoriaPadre(padreInicial)
      setFilas(iniciales)
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

  function updateFila(pk: number, patch: Partial<Fila>) {
    setFilas((prev) => prev.map((f) => (f.pk === pk ? { ...f, ...patch } : f)))
  }

  // No hay PUT en bloque: se guarda valor por valor y se corta en el primer error,
  // dejando en el diálogo lo que falta para reintentar.
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (filas.some((f) => !f.nombre.trim())) {
      setNotice({ id: Date.now(), message: INCOMPLETE_FORM })
      return
    }
    if (cambiadas.length === 0) {
      handleOpenChange(false)
      return
    }
    setSaving(true)
    try {
      for (const f of cambiadas) {
        await save.mutateAsync({
          id: f.pk,
          categoria: categoria.categoria,
          nombre: f.nombre.trim(),
          valor: f.valor,
          accion: f.accion.trim() || null,
          padre: f.padre === NONE ? null : Number(f.padre),
        })
      }
      setOpen(false)
      notify(SUCCESS_MESSAGES.listaValorCategoria.updated)
    } catch (error) {
      setNotice({ id: Date.now(), message: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  const padre = categoriaPadre === NONE ? null : categoriaPadre

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? handleOpenChange(true) : requestClose())}>
      <DialogTrigger render={<Button variant="outline" color="neutral" size="sm" />}>
        <PencilIcon data-icon="inline-start" />
        Modificar
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[85vh] flex-col sm:max-w-4xl"
        inert={confirmDiscardOpen || confirmDeleteOpen}
      >
        <DialogHeader>
          <DialogTitle>Modificar lista</DialogTitle>
          <DialogDescription className="font-mono">{categoria.categoria}</DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />

        <form
          id="modificar-categoria-form"
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-col gap-4"
        >
          <Field variant="outlined" className="sm:max-w-sm">
            <FieldLabel htmlFor="modificar-categoria-padre">Depende de</FieldLabel>
            <CategoriaPadreSelect
              id="modificar-categoria-padre"
              value={categoriaPadre}
              categorias={categorias}
              exclude={categoria.categoria}
              disabled={!puedeEditar}
              onChange={(next) => {
                setCategoriaPadre(next)
                // Todos los valores cuelgan de una sola lista padre (V101): al cambiarla
                // los padres anteriores ya no sirven.
                setFilas((prev) => prev.map((f) => ({ ...f, padre: NONE })))
              }}
            />
            <FieldDescription>
              Al cambiarla se quita el padre de todos los valores; elige uno nuevo en cada fila.
            </FieldDescription>
          </Field>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Valores ({filas.length})</h3>
            {/* Alto de 5 filas (2.75rem + gap); con más, scroll interno. El padding deja ver el ring de foco. */}
            <ul className="-m-1 flex max-h-[16.75rem] flex-col gap-2 overflow-x-hidden overflow-y-auto p-1">
              {filas.map((fila, index) => {
                const invalido = submitted && !fila.nombre.trim()
                return (
                  <li
                    key={fila.pk}
                    className={
                      padre
                        ? "grid items-center gap-2 sm:grid-cols-[1fr_7rem_1fr_1fr]"
                        : "grid items-center gap-2 sm:grid-cols-[1fr_7rem_1fr]"
                    }
                  >
                    <Input
                      variant="outlined"
                      aria-label={`Nombre del valor ${index + 1}`}
                      placeholder="Nombre"
                      maxLength={120}
                      value={fila.nombre}
                      disabled={!puedeEditar}
                      aria-invalid={invalido}
                      onChange={(e) => updateFila(fila.pk, { nombre: e.target.value })}
                    />
                    <Input
                      variant="outlined"
                      aria-label={`Código del valor ${index + 1}`}
                      value={fila.valor}
                      disabled
                      className="font-mono"
                    />
                    <Input
                      variant="outlined"
                      aria-label={`Acción del valor ${index + 1}`}
                      placeholder="Acción"
                      maxLength={150}
                      value={fila.accion}
                      disabled={!puedeEditar}
                      onChange={(e) => updateFila(fila.pk, { accion: e.target.value })}
                    />
                    {padre && (
                      <ValorPadreSelect
                        id={`modificar-padre-${fila.pk}`}
                        aria-label={`Valor padre del valor ${index + 1}`}
                        categoria={padre}
                        value={fila.padre}
                        disabled={!puedeEditar}
                        onChange={(next) => updateFila(fila.pk, { padre: next })}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
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
                    Se eliminarán los {categoria.totalValores} valores de {categoria.categoria}. No
                    se puede si alguno está en uso o tiene valores que dependen de él.
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
                aria-busy={saving}
              >
                {saving ? (
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
