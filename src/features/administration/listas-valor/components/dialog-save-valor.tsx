import { useState } from "react"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { MarcoOpciones } from "@/components/marco-opciones"
import { TituloConAyuda } from "@/components/titulo-con-ayuda"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { FloppyDiskIcon, LockIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { getErrorMessage } from "@/lib/api-client"
import { maxLength, required } from "@/lib/forms/messages"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { toDigitsOnly } from "@/lib/text-input"

import { useEstadoValor } from "@/features/administration/listas-valor/api/mutations/estado-valor"
import { useOrdenarValores } from "@/features/administration/listas-valor/api/mutations/ordenar-valores"
import { usePredeterminadoValor } from "@/features/administration/listas-valor/api/mutations/predeterminado-valor"
import { useSaveValor, type MarcasValor } from "@/features/administration/listas-valor/api/mutations/save-valor"
import {
  CODIGO_VALOR,
  ESTAMENTOS,
  MARCAS_LISTA,
  toCodigo,
  type Categoria,
  type ListaValor,
} from "@/features/administration/listas-valor/api/types/lista-valor"
import { NONE, ValorPadreSelect } from "@/features/administration/listas-valor/components/padre-select"

/** Aviso de un valor usado por el sistema (S.1.VAL.LST.2a, LST.4 y LST.6). */
export const AVISO_VALOR_SISTEMA =
  "Usado por el sistema: se puede renombrar y reordenar, pero no inactivar ni eliminar."

interface Draft {
  nombre: string
  valor: string
  etiqueta: string
  padre: string
  orden: string
  predeterminado: boolean
  habilitado: boolean
  delSimpade: boolean
  disparaPiar: boolean
  estamento: string
}

function toDraft(valor: ListaValor | undefined, total: number): Draft {
  return {
    nombre: valor?.nombre ?? "",
    valor: valor?.valor ?? "",
    etiqueta: valor?.etiqueta ?? "",
    padre: valor?.padre ? String(valor.padre.pkListaValor) : NONE,
    orden: String(valor?.orden ?? total + 1),
    predeterminado: valor?.predeterminado ?? false,
    habilitado: valor?.habilitado ?? true,
    delSimpade: valor?.delSimpade ?? false,
    // PIAR: por defecto, Sí (texto del prototipo).
    disparaPiar: valor?.disparaPiar ?? true,
    estamento: valor?.estamento ?? "",
  }
}

interface DialogSaveValorProps {
  categoria: Categoria
  /** Presente = Modificar valor. */
  valor?: ListaValor
  /** Valores actuales de la lista, en orden: para validar y aplicar el Orden. */
  valores: ListaValor[]
  /** Nombre visible de la lista padre, para el label «Valor padre (Departamento)». */
  nombreListaPadre?: string
  onClose: () => void
}

/**
 * Nuevo valor (S.1.VAL.LST.3/3a) y Modificar valor (LST.6/6a/6b). Se monta al abrir, así que arranca con los
 * datos del valor. Datos, orden, predeterminado y estado son endpoints distintos: se llaman en ese orden y
 * solo los que cambiaron.
 */
export function DialogSaveValor({ categoria, valor, valores, nombreListaPadre, onClose }: DialogSaveValorProps) {
  const isEditing = valor != null
  const conPadre = categoria.categoriaPadre != null
  const marca = categoria.marca ?? null
  const esSistema = valor?.esSistema ?? false
  const maxOrden = valores.length + (isEditing ? 0 : 1)
  const inicial = toDraft(valor, valores.length)

  const { notify } = useNotify()
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(inicial)
  // El código lo propone el nombre hasta que se escribe a mano (regla 1 del md).
  const [codigoManual, setCodigoManual] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const save = useSaveValor()
  const ordenar = useOrdenarValores()
  const predeterminado = usePredeterminadoValor()
  const estado = useEstadoValor()
  const busy = save.isPending || ordenar.isPending || predeterminado.isPending || estado.isPending

  const dirty = JSON.stringify(draft) !== JSON.stringify(inicial)
  const errors = submitted ? validate() : {}

  function validate() {
    const e: Partial<Record<keyof Draft, string>> = {}
    if (!draft.nombre.trim()) e.nombre = required("El nombre")
    else if (draft.nombre.length > 100) e.nombre = maxLength(100, "El nombre")
    // Los códigos viejos pueden no cumplir el formato: solo se valida al crear.
    if (!isEditing && !CODIGO_VALOR.test(draft.valor))
      e.valor = draft.valor ? "Use de 2 a 20 mayúsculas, números o guion bajo" : required("El código")
    if (draft.etiqueta.length > 10) e.etiqueta = maxLength(10, "La etiqueta")
    const orden = Number(draft.orden)
    if (!draft.orden) e.orden = required("El orden")
    else if (orden < 1 || orden > maxOrden) e.orden = `Entre 1 y ${maxOrden}`
    if (conPadre && draft.padre === NONE) e.padre = required("El valor padre")
    if (marca === "ESTAMENTO" && !draft.estamento) e.estamento = required("El estamento")
    return e
  }

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function requestClose() {
    if (busy) return
    if (dirty) setConfirmDiscardOpen(true)
    else onClose()
  }

  function marcas(): MarcasValor | undefined {
    if (marca === "SIMPADE") return { delSimpade: draft.delSimpade }
    if (marca === "PIAR") return { disparaPiar: draft.disparaPiar }
    if (marca === "ESTAMENTO") return { estamento: draft.estamento || null }
    return undefined
  }

  async function guardar() {
    const orden = Number(draft.orden)
    try {
      const guardado = await save.mutateAsync({
        id: valor?.pkListaValor,
        categoria: categoria.categoria,
        nombre: draft.nombre.trim(),
        valor: draft.valor,
        etiqueta: draft.etiqueta.trim() || null,
        // Acción no está en el md: se conserva la que tenga.
        accion: valor?.accion ?? null,
        padre: draft.padre === NONE ? null : Number(draft.padre),
        orden: isEditing ? null : orden,
        marcas: marcas(),
      })
      // Al modificar, el orden va por `/orden` con la lista completa.
      if (isEditing && orden !== valor.orden) {
        const resto = valores.filter((v) => v.pkListaValor !== valor.pkListaValor).map((v) => v.pkListaValor)
        resto.splice(orden - 1, 0, valor.pkListaValor)
        await ordenar.mutateAsync({ categoria: categoria.categoria, orden: resto })
      }
      if (draft.habilitado !== (valor?.habilitado ?? true))
        await estado.mutateAsync({ id: guardado.pkListaValor, habilitado: draft.habilitado })
      // Un inactivo no puede ser predeterminado (V101): va después del estado.
      if (draft.predeterminado !== (valor?.predeterminado ?? false) && (draft.habilitado || !draft.predeterminado))
        await predeterminado.mutateAsync({ id: guardado.pkListaValor, predeterminado: draft.predeterminado })
      onClose()
      notify(isEditing ? SUCCESS_MESSAGES.listaValor.updated : SUCCESS_MESSAGES.listaValor.created)
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
    void guardar()
  }

  const formId = `valor-form-${valor?.pkListaValor ?? "nuevo"}`

  // En edición el código queda bloqueado (candado); al crear, lo propone el nombre.
  const campoCodigo = (
    <Field variant="outlined" data-invalid={errors.valor ? "true" : undefined}>
      <FieldLabel htmlFor={`${formId}-valor`}>Código*</FieldLabel>
      {isEditing ? (
        <ConCandado>
          <Input id={`${formId}-valor`} value={draft.valor} disabled readOnly className="pr-9 font-mono" />
        </ConCandado>
      ) : (
        <ConContador valor={draft.valor} max={20}>
          <Input
            id={`${formId}-valor`}
            placeholder="Agregar"
            value={draft.valor}
            maxLength={20}
            className="pr-16 font-mono"
            aria-invalid={Boolean(errors.valor)}
            onChange={(e) => {
              setCodigoManual(true)
              set("valor", toCodigo(e.target.value, 20))
            }}
          />
        </ConContador>
      )}
      {errors.valor ? (
        <FieldError>{errors.valor}</FieldError>
      ) : (
        <FieldDescription>
          {isEditing
            ? "No se modifica después de crear el valor."
            : "Lo propone el sistema a partir del nombre; no se modifica después de guardar."}
        </FieldDescription>
      )}
    </Field>
  )

  return (
    <Dialog open onOpenChange={(next) => !next && requestClose()}>
      <DialogContent className="sm:max-w-2xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modificar valor" : "Nuevo valor"} · {categoria.nombre}
          </DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        <form id={formId} onSubmit={handleSubmit} className="grid items-start gap-4 sm:grid-cols-2">
          <Field variant="outlined">
            <FieldLabel htmlFor={`${formId}-lista`}>Lista*</FieldLabel>
            <ConCandado>
              <Input id={`${formId}-lista`} value={categoria.nombre} disabled readOnly className="pr-9" />
            </ConCandado>
          </Field>
          {conPadre ? (
            <Field variant="outlined" data-invalid={errors.padre ? "true" : undefined}>
              <FieldLabel htmlFor={`${formId}-padre`}>
                Valor padre ({nombreListaPadre ?? categoria.categoriaPadre})*
              </FieldLabel>
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
                <FieldDescription>Solo valores activos de la lista padre.</FieldDescription>
              )}
            </Field>
          ) : (
            campoCodigo
          )}
          <Field variant="outlined" data-invalid={errors.nombre ? "true" : undefined}>
            <FieldLabel htmlFor={`${formId}-nombre`}>Nombre*</FieldLabel>
            <ConContador valor={draft.nombre} max={100}>
              <Input
                id={`${formId}-nombre`}
                // El cursor arranca en Nombre (Lista va bloqueada y, sin lista padre, Código queda antes).
                autoFocus
                placeholder="Agregar"
                maxLength={100}
                className="pr-20"
                value={draft.nombre}
                aria-invalid={Boolean(errors.nombre)}
                onChange={(e) => {
                  const nombre = e.target.value
                  setDraft((prev) => ({
                    ...prev,
                    nombre,
                    valor: isEditing || codigoManual ? prev.valor : toCodigo(nombre, 20),
                  }))
                }}
              />
            </ConContador>
            <FieldError>{errors.nombre}</FieldError>
          </Field>
          {conPadre && campoCodigo}
          {/* Etiqueta y Orden comparten la columna, como en el prototipo. */}
          <div className="grid grid-cols-2 items-start gap-3">
            <Field variant="outlined" data-invalid={errors.etiqueta ? "true" : undefined}>
              <FieldLabel htmlFor={`${formId}-etiqueta`}>Etiqueta</FieldLabel>
              <ConContador valor={draft.etiqueta} max={10}>
                <Input
                  id={`${formId}-etiqueta`}
                  placeholder="Abreviatura"
                  maxLength={10}
                  className="pr-14"
                  value={draft.etiqueta}
                  aria-invalid={Boolean(errors.etiqueta)}
                  onChange={(e) => set("etiqueta", e.target.value)}
                />
              </ConContador>
              <FieldError>{errors.etiqueta}</FieldError>
            </Field>
            <Field variant="outlined" data-invalid={errors.orden ? "true" : undefined}>
              <FieldLabel htmlFor={`${formId}-orden`}>Orden*</FieldLabel>
              <Input
                id={`${formId}-orden`}
                inputMode="numeric"
                placeholder="Agregar"
                value={draft.orden}
                aria-invalid={Boolean(errors.orden)}
                onChange={(e) => set("orden", toDigitsOnly(e.target.value, 4))}
              />
              {errors.orden ? (
                <FieldError>{errors.orden}</FieldError>
              ) : (
                <FieldDescription>De 1 a {maxOrden}.</FieldDescription>
              )}
            </Field>
          </div>
          <MarcoOpciones
            id={`${formId}-predeterminado-marco`}
            label="Predeterminado"
            required
            descripcion="Al marcarlo, el valor predeterminado anterior deja de serlo."
          >
            <label htmlFor={`${formId}-predeterminado`} className="flex w-fit cursor-pointer items-center gap-3">
              <Switch
                round
                id={`${formId}-predeterminado`}
                checked={draft.predeterminado}
                disabled={!draft.habilitado}
                onCheckedChange={(checked) => set("predeterminado", checked)}
              />
              {draft.predeterminado ? "Sí" : "No"}
            </label>
          </MarcoOpciones>
          <MarcoOpciones
            id={`${formId}-estado-marco`}
            label="Estado"
            required
            descripcion={esSistema ? AVISO_VALOR_SISTEMA : undefined}
          >
            <label htmlFor={`${formId}-estado`} className="flex w-fit cursor-pointer items-center gap-3">
              <Switch
                round
                id={`${formId}-estado`}
                checked={draft.habilitado}
                disabled={esSistema}
                onCheckedChange={(checked) =>
                  setDraft((prev) => ({
                    ...prev,
                    habilitado: checked,
                    predeterminado: checked && prev.predeterminado,
                  }))
                }
              />
              {draft.habilitado ? "Activo" : "Inactivo"}
            </label>
          </MarcoOpciones>
          {(marca === "SIMPADE" || marca === "PIAR") && (
            <MarcoOpciones id={`${formId}-marca-marco`} label={
                <TituloConAyuda titulo={MARCAS_LISTA[marca].campo} ayuda={MARCAS_LISTA[marca].ayuda}>
                  <span>
                    {MARCAS_LISTA[marca].campo}
                    <span data-required-mark="">*</span>
                  </span>
                </TituloConAyuda>
              }
            >
              <label htmlFor={`${formId}-marca`} className="flex w-fit cursor-pointer items-center gap-3">
                <Switch
                  round
                  id={`${formId}-marca`}
                  checked={marca === "SIMPADE" ? draft.delSimpade : draft.disparaPiar}
                  onCheckedChange={(checked) =>
                    set(marca === "SIMPADE" ? "delSimpade" : "disparaPiar", checked)
                  }
                />
                {(marca === "SIMPADE" ? draft.delSimpade : draft.disparaPiar) ? "Sí" : "No"}
              </label>
            </MarcoOpciones>
          )}
          {marca === "ESTAMENTO" && (
            <Field variant="outlined" data-invalid={errors.estamento ? "true" : undefined}>
              <FieldLabel htmlFor={`${formId}-estamento`}>
                <TituloConAyuda titulo="Estamento" ayuda={MARCAS_LISTA.ESTAMENTO.ayuda}>
                  <span>
                    Estamento<span data-required-mark="">*</span>
                  </span>
                </TituloConAyuda>
              </FieldLabel>
              <Select value={draft.estamento || null} onValueChange={(next) => set("estamento", String(next ?? ""))}>
                <SelectTrigger id={`${formId}-estamento`} variant="outlined" aria-invalid={Boolean(errors.estamento)}>
                  <SelectValue>{(current) => (current ? String(current) : "Seleccione")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ESTAMENTOS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError>{errors.estamento}</FieldError>
            </Field>
          )}
        </form>
        <DialogFooter className="sm:items-center">
          <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>
          <Button size="sm" type="button" variant="outline" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button size="sm" type="submit" color="primary" form={formId} disabled={busy} aria-busy={busy}>
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

/** Contador «7 / 100» dentro del input, a la derecha. */
function ConContador({ valor, max, children }: { valor: string; max: number; children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground tabular-nums">
        {valor.length} / {max}
      </span>
    </div>
  )
}

/** Campo de solo lectura: candado a la derecha del input. */
function ConCandado({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      <LockIcon aria-hidden className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
