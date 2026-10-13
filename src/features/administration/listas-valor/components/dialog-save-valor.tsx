import { useState } from "react"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { CheckIcon, ControlPointIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage } from "@/lib/api-client"
import { maxLength, required } from "@/lib/forms/messages"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

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

interface Draft {
  nombre: string
  valor: string
  accion: string
  categoriaPadre: string
  padre: string
}

function toDraft(categoria: Categoria, valor?: ListaValor): Draft {
  return {
    nombre: valor?.nombre ?? "",
    valor: valor?.valor ?? "",
    accion: valor?.accion ?? "",
    categoriaPadre: valor?.padre?.categoria ?? categoria.categoriasPadre[0] ?? NONE,
    padre: valor?.padre ? String(valor.padre.pkListaValor) : NONE,
  }
}

function validate(draft: Draft) {
  const errors: Partial<Record<keyof Draft, string>> = {}
  if (!draft.nombre.trim()) errors.nombre = required("El nombre")
  else if (draft.nombre.length > 120) errors.nombre = maxLength(120, "El nombre")
  if (!draft.valor.trim()) errors.valor = required("El código")
  else if (draft.valor.length > 130) errors.valor = maxLength(130, "El código")
  if (draft.accion.length > 150) errors.accion = maxLength(150, "La acción")
  return errors
}

interface DialogSaveValorProps {
  categoria: Categoria
  categorias: Categoria[]
  /** Presente = edición. */
  valor?: ListaValor
}

/** Alta y edición de un valor, incluido su padre (autorreferencia). */
export function DialogSaveValor({ categoria, categorias, valor }: DialogSaveValorProps) {
  const isEditing = valor != null
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => toDraft(categoria, valor))
  const [submitted, setSubmitted] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const errors = submitted ? validate(draft) : {}
  const initial = toDraft(categoria, valor)
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)

  // Todos los valores de una lista cuelgan de una misma lista padre (V101). Solo
  // se puede cambiar la lista padre si este es el único valor que la fija.
  const padreFijo =
    categoria.categoriasPadre.length > 0 && !(isEditing && categoria.totalValores === 1)

  const save = useSaveValor({
    mutationConfig: {
      onSuccess: () => {
        setOpen(false)
        notify(isEditing ? SUCCESS_MESSAGES.listaValor.updated : SUCCESS_MESSAGES.listaValor.created)
      },
      onError: (error) => setNotice({ id: Date.now(), message: getErrorMessage(error) }),
    },
  })

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(toDraft(categoria, valor))
      setSubmitted(false)
    }
    setNotice(null)
    setOpen(next)
  }

  function requestClose() {
    if (save.isPending) return
    if (dirty) {
      setConfirmDiscardOpen(true)
      return
    }
    handleOpenChange(false)
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (Object.keys(validate(draft)).length > 0) return
    save.mutate({
      id: valor?.pkListaValor,
      categoria: categoria.categoria,
      nombre: draft.nombre.trim(),
      valor: draft.valor.trim(),
      accion: draft.accion.trim() || null,
      padre: draft.padre === NONE ? null : Number(draft.padre),
    })
  }

  const formId = `valor-form-${valor?.pkListaValor ?? "nuevo"}`
  const categoriaPadre = draft.categoriaPadre === NONE ? null : draft.categoriaPadre

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? handleOpenChange(true) : requestClose())}>
      {isEditing ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger render={<Button variant="ghost" color="neutral" size="icon-sm" />} />
            }
          >
            <span className="sr-only">Editar valor</span>
            <PencilIcon />
          </TooltipTrigger>
          <TooltipContent>Editar valor</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger render={<Button color="primary" size="sm" />}>
          <ControlPointIcon data-icon="inline-start" />
          Agregar valor
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-2xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar valor" : "Agregar valor"}</DialogTitle>
          <DialogDescription>Lista {categoria.categoria}</DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        <form id={formId} onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field variant="outlined" data-invalid={errors.nombre ? "true" : undefined}>
            <FieldLabel htmlFor={`${formId}-nombre`}>Nombre*</FieldLabel>
            <Input
              id={`${formId}-nombre`}
              placeholder="Agregar"
              maxLength={120}
              value={draft.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              aria-invalid={Boolean(errors.nombre)}
            />
            <FieldError>{errors.nombre}</FieldError>
          </Field>
          <Field variant="outlined" data-invalid={errors.valor ? "true" : undefined}>
            <FieldLabel htmlFor={`${formId}-valor`}>Código*</FieldLabel>
            <Input
              id={`${formId}-valor`}
              placeholder="Agregar"
              maxLength={130}
              value={draft.valor}
              disabled={isEditing}
              onChange={(e) => set("valor", e.target.value)}
              aria-invalid={Boolean(errors.valor)}
            />
            {isEditing ? (
              <FieldDescription>El código no se puede cambiar.</FieldDescription>
            ) : (
              <FieldError>{errors.valor}</FieldError>
            )}
          </Field>
          <Field
            variant="outlined"
            className="sm:col-span-2"
            data-invalid={errors.accion ? "true" : undefined}
          >
            <FieldLabel htmlFor={`${formId}-accion`}>Acción</FieldLabel>
            <Input
              id={`${formId}-accion`}
              placeholder="Agregar"
              maxLength={150}
              value={draft.accion}
              onChange={(e) => set("accion", e.target.value)}
            />
            <FieldError>{errors.accion}</FieldError>
          </Field>

          <fieldset className="grid gap-4 rounded-lg border border-border p-4 sm:col-span-2 sm:grid-cols-2">
            <legend className="px-1 text-sm font-medium">Depende de</legend>
            <Field variant="outlined">
              <FieldLabel htmlFor={`${formId}-categoria-padre`}>Lista padre</FieldLabel>
              <CategoriaPadreSelect
                id={`${formId}-categoria-padre`}
                value={draft.categoriaPadre}
                categorias={categorias}
                exclude={categoria.categoria}
                disabled={padreFijo}
                onChange={(next) =>
                  setDraft((prev) => ({ ...prev, categoriaPadre: next, padre: NONE }))
                }
              />
              {padreFijo && (
                <FieldDescription>
                  Todos los valores de esta lista dependen de {categoria.categoriasPadre[0]}.
                </FieldDescription>
              )}
            </Field>
            <Field variant="outlined">
              <FieldLabel htmlFor={`${formId}-padre`}>Valor padre</FieldLabel>
              <ValorPadreSelect
                id={`${formId}-padre`}
                categoria={categoriaPadre}
                value={draft.padre}
                onChange={(next) => set("padre", next)}
              />
            </Field>
          </fieldset>
        </form>
        <DialogFooter>
          <Button
            size="sm"
            type="submit"
            color="primary"
            form={formId}
            disabled={save.isPending}
            aria-busy={save.isPending}
          >
            {save.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
          <Button size="sm" type="button" variant="fill" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
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
