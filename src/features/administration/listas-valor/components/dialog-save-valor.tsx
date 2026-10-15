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

import { useEstadoValor } from "@/features/administration/listas-valor/api/mutations/estado-valor"
import { useSaveValor } from "@/features/administration/listas-valor/api/mutations/save-valor"
import {
  CODIGO_VALOR,
  toCodigo,
  type Categoria,
  type ListaValor,
} from "@/features/administration/listas-valor/api/types/lista-valor"
import { EstadoField } from "@/features/administration/listas-valor/components/estado-field"
import {
  NONE,
  ValorPadreSelect,
} from "@/features/administration/listas-valor/components/padre-select"

interface Draft {
  nombre: string
  valor: string
  etiqueta: string
  accion: string
  padre: string
  habilitado: boolean
}

function toDraft(valor?: ListaValor): Draft {
  return {
    nombre: valor?.nombre ?? "",
    valor: valor?.valor ?? "",
    etiqueta: valor?.etiqueta ?? "",
    accion: valor?.accion ?? "",
    padre: valor?.padre ? String(valor.padre.pkListaValor) : NONE,
    habilitado: valor?.habilitado ?? true,
  }
}

// Mismos límites que V101: nombre <= 100, etiqueta <= 10, acción <= 150.
function validate(draft: Draft, isEditing: boolean, conPadre: boolean) {
  const errors: Partial<Record<keyof Draft, string>> = {}
  if (!draft.nombre.trim()) errors.nombre = required("El nombre")
  else if (draft.nombre.length > 100) errors.nombre = maxLength(100, "El nombre")
  // Los códigos viejos pueden no cumplir el formato: solo se valida al crear.
  if (!isEditing && !CODIGO_VALOR.test(draft.valor)) {
    errors.valor = draft.valor
      ? "Use de 2 a 20 mayúsculas, números o guion bajo"
      : required("El código")
  }
  if (draft.etiqueta.length > 10) errors.etiqueta = maxLength(10, "La etiqueta")
  if (draft.accion.length > 150) errors.accion = maxLength(150, "La acción")
  if (conPadre && draft.padre === NONE) errors.padre = required("El valor padre")
  return errors
}

interface DialogSaveValorProps {
  categoria: Categoria
  /** Presente = edición. */
  valor?: ListaValor
}

/** Alta y edición de un valor. Si la lista tiene lista padre, el valor padre es obligatorio. */
export function DialogSaveValor({ categoria, valor }: DialogSaveValorProps) {
  const isEditing = valor != null
  const conPadre = categoria.categoriaPadre != null
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => toDraft(valor))
  const [submitted, setSubmitted] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const errors = submitted ? validate(draft, isEditing, conPadre) : {}
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(valor))

  const save = useSaveValor()
  const estado = useEstadoValor()
  const busy = save.isPending || estado.isPending
  const cambiaEstado = isEditing && draft.habilitado !== valor.habilitado
  // Solo cambió el estado: no hace falta el PUT de los datos.
  const cambianDatos =
    !isEditing ||
    JSON.stringify({ ...draft, habilitado: valor.habilitado }) !== JSON.stringify(toDraft(valor))

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(toDraft(valor))
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

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (Object.keys(validate(draft, isEditing, conPadre)).length > 0) return
    if (!dirty) {
      handleOpenChange(false)
      return
    }
    void guardar()
  }

  // Datos y estado son dos endpoints: primero los datos, luego el estado.
  async function guardar() {
    try {
      if (cambianDatos) await save.mutateAsync(datos())
      if (cambiaEstado)
        await estado.mutateAsync({ id: valor.pkListaValor, habilitado: draft.habilitado })
      setOpen(false)
      notify(
        !isEditing
          ? SUCCESS_MESSAGES.listaValor.created
          : cambiaEstado && !cambianDatos
            ? draft.habilitado
              ? SUCCESS_MESSAGES.listaValor.activated
              : SUCCESS_MESSAGES.listaValor.deactivated
            : SUCCESS_MESSAGES.listaValor.updated,
      )
    } catch (error) {
      setNotice({ id: Date.now(), message: getErrorMessage(error) })
    }
  }

  function datos() {
    return {
      id: valor?.pkListaValor,
      categoria: categoria.categoria,
      nombre: draft.nombre.trim(),
      valor: draft.valor,
      etiqueta: draft.etiqueta.trim() || null,
      accion: draft.accion.trim() || null,
      padre: draft.padre === NONE ? null : Number(draft.padre),
      // Nuevo: al final (el back lo pone así sin ORDEN). Edición: el actual.
      orden: valor?.orden ?? null,
    }
  }

  const formId = `valor-form-${valor?.pkListaValor ?? "nuevo"}`

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
          <DialogDescription className="font-mono">{categoria.categoria}</DialogDescription>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        <form id={formId} onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-[1fr_9rem]">
          <Field variant="outlined" data-invalid={errors.nombre ? "true" : undefined}>
            <FieldLabel htmlFor={`${formId}-nombre`}>Nombre*</FieldLabel>
            <Input
              id={`${formId}-nombre`}
              placeholder="Agregar"
              maxLength={100}
              value={draft.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              aria-invalid={Boolean(errors.nombre)}
            />
            <FieldError>{errors.nombre}</FieldError>
          </Field>
          <Field variant="outlined" data-invalid={errors.etiqueta ? "true" : undefined}>
            <FieldLabel htmlFor={`${formId}-etiqueta`}>Etiqueta</FieldLabel>
            <Input
              id={`${formId}-etiqueta`}
              placeholder="Ej. Med"
              maxLength={10}
              value={draft.etiqueta}
              onChange={(e) => set("etiqueta", e.target.value)}
              aria-invalid={Boolean(errors.etiqueta)}
            />
            <FieldError>{errors.etiqueta}</FieldError>
          </Field>
          <Field
            variant="outlined"
            className="sm:col-span-2"
            data-invalid={errors.valor ? "true" : undefined}
          >
            <FieldLabel htmlFor={`${formId}-valor`}>Código*</FieldLabel>
            <Input
              id={`${formId}-valor`}
              placeholder="Ej. MEDELLIN"
              value={draft.valor}
              disabled={isEditing}
              className="font-mono"
              onChange={(e) => set("valor", toCodigo(e.target.value, 20))}
              aria-invalid={Boolean(errors.valor)}
            />
            {errors.valor ? (
              <FieldError>{errors.valor}</FieldError>
            ) : (
              <FieldDescription>
                {isEditing
                  ? "El código no se puede cambiar."
                  : "Mayúsculas, números y guion bajo. De 2 a 20."}
              </FieldDescription>
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
          {conPadre && (
            <Field
              variant="outlined"
              className="sm:col-span-2"
              data-invalid={errors.padre ? "true" : undefined}
            >
              <FieldLabel htmlFor={`${formId}-padre`}>Valor padre*</FieldLabel>
              <ValorPadreSelect
                id={`${formId}-padre`}
                categoria={categoria.categoriaPadre}
                value={draft.padre}
                required
                onChange={(next) => set("padre", next)}
              />
              {errors.padre ? (
                <FieldError>{errors.padre}</FieldError>
              ) : (
                <FieldDescription>De la lista {categoria.categoriaPadre}.</FieldDescription>
              )}
            </Field>
          )}
          {isEditing && (
            <EstadoField
              id={`${formId}-estado`}
              de="valor"
              className="sm:col-span-2"
              checked={draft.habilitado}
              onChange={(next) => set("habilitado", next)}
            />
          )}
        </form>
        <DialogFooter>
          <Button
            size="sm"
            type="submit"
            color="primary"
            form={formId}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? (
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
