import { useState } from "react"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { MarcoOpciones } from "@/components/marco-opciones"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { CharacterCounter } from "@/components/ui/character-counter"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { TEXTAREA_OUTLINED, Textarea } from "@/components/ui/textarea"
import { getErrorMessage } from "@/lib/api-client"
import { maxLength, required } from "@/lib/forms/messages"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { useCreateCategoria } from "@/features/administration/listas-valor/api/mutations/create-categoria"
import { useEstadoCategoria } from "@/features/administration/listas-valor/api/mutations/estado-categoria"
import { useUpdateCategoria } from "@/features/administration/listas-valor/api/mutations/update-categoria"
import { codigoDeLista, type Categoria } from "@/features/administration/listas-valor/api/types/lista-valor"
import { CategoriaPadreSelect, NONE } from "@/features/administration/listas-valor/components/padre-select"

const NOMBRE_MAX = 80
const DESCRIPCION_MAX = 300

interface Draft {
  nombre: string
  descripcion: string
  padre: string
  ordinal: boolean
  habilitada: boolean
}

const toDraft = (categoria?: Categoria): Draft => ({
  nombre: categoria?.nombre ?? "",
  descripcion: categoria?.descripcion ?? "",
  padre: categoria?.categoriaPadre ?? NONE,
  ordinal: categoria?.esOrdinal ?? false,
  habilitada: categoria?.habilitada ?? true,
})

interface DialogListaProps {
  /** Presente = Modificar lista (S.1.LIS.LST.2a); sin ella, Nueva lista (LIS.2). */
  categoria?: Categoria
  categorias: Categoria[]
  onClose: () => void
  onCreated?: (categoria: string) => void
  /** Inactivar una lista que usan campos del sistema abre «No se puede inactivar la lista» (LIS.3). */
  onBloqueoInactivar?: (categoria: Categoria) => void
}

/**
 * Nueva lista y Modificar lista: Nombre, Descripción, Lista padre, Lista ordinal y Estado. El md no pide código:
 * al crear se propone a partir del nombre (`codigoDeLista`) y no cambia después. Se monta al abrir.
 */
export function DialogLista({ categoria, categorias, onClose, onCreated, onBloqueoInactivar }: DialogListaProps) {
  const isEditing = categoria != null
  const inicial = toDraft(categoria)
  const { notify } = useNotify()
  const [draft, setDraft] = useState<Draft>(inicial)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const create = useCreateCategoria()
  const update = useUpdateCategoria()
  const estado = useEstadoCategoria()
  const busy = create.isPending || update.isPending || estado.isPending
  const dirty = JSON.stringify(draft) !== JSON.stringify(inicial)

  const codigo = isEditing
    ? categoria.categoria
    : codigoDeLista(draft.nombre, categorias.map((c) => c.categoria))

  function validate() {
    const e: Partial<Record<keyof Draft, string>> = {}
    const nombre = draft.nombre.trim()
    if (!nombre) e.nombre = required("El nombre")
    else if (nombre.length > NOMBRE_MAX) e.nombre = maxLength(NOMBRE_MAX, "El nombre")
    else if (
      categorias.some(
        (c) => c.categoria !== categoria?.categoria && c.nombre.trim().toLowerCase() === nombre.toLowerCase(),
      )
    )
      e.nombre = "Ya existe una lista con ese nombre"
    // V101: la descripción es opcional, pero si va tiene de 10 a 300 caracteres.
    const largo = draft.descripcion.trim().length
    if (largo > 0 && (largo < 10 || largo > DESCRIPCION_MAX)) e.descripcion = `Entre 10 y ${DESCRIPCION_MAX} caracteres`
    return e
  }
  const errors = submitted ? validate() : {}

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function requestClose() {
    if (busy) return
    if (dirty) setConfirmDiscardOpen(true)
    else onClose()
  }

  async function guardar() {
    const datos = {
      nombre: draft.nombre.trim(),
      descripcion: draft.descripcion.trim() || null,
      padre: draft.padre === NONE ? null : draft.padre,
      ordinal: draft.ordinal,
    }
    try {
      if (!isEditing) {
        const creada = await create.mutateAsync({ categoria: codigo, ...datos, valores: [] })
        if (!draft.habilitada) await estado.mutateAsync({ categoria: creada.categoria, habilitada: false })
        onClose()
        notify(SUCCESS_MESSAGES.listaValorCategoria.created)
        onCreated?.(creada.categoria)
        return
      }
      const cambiaEstado = draft.habilitada !== categoria.habilitada
      const cambianDatos = JSON.stringify({ ...draft, habilitada: categoria.habilitada }) !== JSON.stringify(inicial)
      if (cambianDatos) await update.mutateAsync({ categoria: categoria.categoria, ...datos })
      if (cambiaEstado) await estado.mutateAsync({ categoria: categoria.categoria, habilitada: draft.habilitada })
      onClose()
      const m = SUCCESS_MESSAGES.listaValorCategoria
      notify(cambiaEstado && !cambianDatos ? (draft.habilitada ? m.activated : m.deactivated) : m.updated)
    } catch (error) {
      setNotice({ id: Date.now(), message: getErrorMessage(error) })
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (Object.keys(validate()).length > 0) return
    if (!dirty) {
      onClose()
      return
    }
    // LIS.3: la usan campos del sistema; el diálogo dice cuáles en lugar de un error del back.
    if (isEditing && categoria.habilitada && !draft.habilitada && categoria.camposQueUsan?.length) {
      onBloqueoInactivar?.(categoria)
      return
    }
    void guardar()
  }

  return (
    <Dialog open onOpenChange={(next) => !next && requestClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-2xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>{isEditing ? `Modificar lista · ${categoria.nombre}` : "Nueva lista"}</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        {/* Como el prototipo: Nombre y Descripción a todo el ancho; Lista padre, ordinal y Estado en una fila. */}
        <form id="lista-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field variant="outlined" data-invalid={errors.nombre ? "true" : undefined}>
            <FieldLabel htmlFor="lista-nombre">Nombre*</FieldLabel>
            <div className="relative">
              <Input
                id="lista-nombre"
                placeholder="Agregar"
                maxLength={NOMBRE_MAX}
                className="pr-16"
                autoFocus
                value={draft.nombre}
                aria-invalid={Boolean(errors.nombre)}
                onChange={(e) => set("nombre", e.target.value)}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground tabular-nums">
                {draft.nombre.length} / {NOMBRE_MAX}
              </span>
            </div>
            <FieldError>{errors.nombre}</FieldError>
          </Field>
          <Field variant="outlined" data-invalid={errors.descripcion ? "true" : undefined}>
            <FieldLabel htmlFor="lista-descripcion">Descripción</FieldLabel>
            <Textarea
              className={TEXTAREA_OUTLINED}
              id="lista-descripcion"
              placeholder="Agregar"
              maxLength={DESCRIPCION_MAX}
              rows={2}
              value={draft.descripcion}
              aria-invalid={Boolean(errors.descripcion)}
              onChange={(e) => set("descripcion", e.target.value)}
            />
            {errors.descripcion ? (
              <FieldError>{errors.descripcion}</FieldError>
            ) : (
              <CharacterCounter value={draft.descripcion} max={DESCRIPCION_MAX} />
            )}
          </Field>
          <div className="grid items-start gap-4 sm:grid-cols-[2fr_1fr_1fr]">
            <Field variant="outlined">
              <FieldLabel htmlFor="lista-padre">Lista padre</FieldLabel>
              <CategoriaPadreSelect
                id="lista-padre"
                value={draft.padre}
                categorias={categorias}
                exclude={categoria?.categoria}
                onChange={(next) => set("padre", next)}
              />
              <FieldDescription>Cada valor quedará ligado a un valor de la lista padre.</FieldDescription>
            </Field>
            <MarcoOpciones
              id="lista-ordinal-marco"
              label="Lista ordinal"
              required
              descripcion="El orden expresa una gradación."
            >
              <label htmlFor="lista-ordinal" className="flex w-fit cursor-pointer items-center gap-3">
                <Switch round id="lista-ordinal" checked={draft.ordinal} onCheckedChange={(c) => set("ordinal", c)} />
                {draft.ordinal ? "Sí" : "No"}
              </label>
            </MarcoOpciones>
            <MarcoOpciones id="lista-estado-marco" label="Estado" required>
              <label htmlFor="lista-estado" className="flex w-fit cursor-pointer items-center gap-3">
                <Switch
                  round
                  id="lista-estado"
                  checked={draft.habilitada}
                  onCheckedChange={(c) => set("habilitada", c)}
                />
                {draft.habilitada ? "Activa" : "Inactiva"}
              </label>
            </MarcoOpciones>
          </div>
        </form>
        <DialogFooter className="sm:items-center">
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          <Button variant="outline" color="neutral" size="sm" type="button" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button size="sm" type="submit" color="primary" form="lista-form" disabled={busy} aria-busy={busy}>
            {busy ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FloppyDiskIcon data-icon="inline-start" />
            )}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          onClose()
        }}
      />
    </Dialog>
  )
}
