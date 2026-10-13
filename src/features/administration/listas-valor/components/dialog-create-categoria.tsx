import { useState } from "react"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import {
  CheckIcon,
  ControlPointIcon,
  PlusIcon,
  SpinnerIcon,
  TrashIcon,
  XIcon,
} from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage } from "@/lib/api-client"
import { INCOMPLETE_FORM } from "@/lib/forms/messages"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { useCreateCategoria } from "@/features/administration/listas-valor/api/mutations/create-categoria"
import type { Categoria } from "@/features/administration/listas-valor/api/types/lista-valor"
import {
  CategoriaPadreSelect,
  NONE,
  ValorPadreSelect,
} from "@/features/administration/listas-valor/components/padre-select"

interface Fila {
  key: number
  nombre: string
  valor: string
  padre: string
}

const filaVacia = (key: number): Fila => ({ key, nombre: "", valor: "", padre: NONE })

// Mismo formato que valida el backend (V103): mayúsculas sin tildes, dígitos y `_`.
const CATEGORIA_FORMATO = /^[A-Z][A-Z0-9_]*$/

/** Normaliza lo que se escribe al formato de código de la lista. */
function toCodigoCategoria(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 30)
}

interface DialogCreateCategoriaProps {
  categorias: Categoria[]
  onCreated: (categoria: string) => void
}

/** Alta de una lista nueva junto con sus primeros valores (todo o nada). */
export function DialogCreateCategoria({ categorias, onCreated }: DialogCreateCategoriaProps) {
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [nombre, setNombre] = useState("")
  const [categoriaPadre, setCategoriaPadre] = useState(NONE)
  const [filas, setFilas] = useState<Fila[]>([filaVacia(0)])
  const [submitted, setSubmitted] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const dirty =
    nombre !== "" || categoriaPadre !== NONE || filas.some((f) => f.nombre || f.valor)

  const nombreError = !submitted
    ? undefined
    : !nombre
      ? "El nombre de la lista es obligatorio"
      : !CATEGORIA_FORMATO.test(nombre)
        ? "Debe empezar con una letra"
        : categorias.some((c) => c.categoria === nombre)
          ? "Ya existe una lista con este nombre"
          : undefined

  const codigos = filas.map((f) => f.valor.trim())
  const filaError = (fila: Fila, index: number) => {
    if (!submitted) return undefined
    if (!fila.nombre.trim() || !fila.valor.trim()) return "Nombre y código son obligatorios"
    if (codigos.indexOf(fila.valor.trim()) !== index) return "Código repetido"
    return undefined
  }

  const create = useCreateCategoria({
    mutationConfig: {
      onSuccess: (result) => {
        setOpen(false)
        notify(SUCCESS_MESSAGES.listaValorCategoria.created)
        onCreated(result.categoria)
      },
      onError: (error) => setNotice({ id: Date.now(), message: getErrorMessage(error) }),
    },
  })

  function reset() {
    setNombre("")
    setCategoriaPadre(NONE)
    setFilas([filaVacia(0)])
    setSubmitted(false)
    setNotice(null)
  }

  function handleOpenChange(next: boolean) {
    if (next) reset()
    setOpen(next)
  }

  function requestClose() {
    if (create.isPending) return
    if (dirty) {
      setConfirmDiscardOpen(true)
      return
    }
    handleOpenChange(false)
  }

  function updateFila(key: number, patch: Partial<Fila>) {
    setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    const invalid =
      !CATEGORIA_FORMATO.test(nombre) ||
      categorias.some((c) => c.categoria === nombre) ||
      filas.some((f, i) => !f.nombre.trim() || !f.valor.trim() || codigos.indexOf(f.valor.trim()) !== i)
    if (invalid) {
      setNotice({ id: Date.now(), message: INCOMPLETE_FORM })
      return
    }
    create.mutate({
      categoria: nombre,
      valores: filas.map((f) => ({
        nombre: f.nombre.trim(),
        valor: f.valor.trim(),
        padre: f.padre === NONE ? null : Number(f.padre),
      })),
    })
  }

  const padre = categoriaPadre === NONE ? null : categoriaPadre

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? handleOpenChange(true) : requestClose())}>
      {/* Vive junto al buscador del índice: el primary de la pantalla es "Agregar valor". */}
      <Tooltip>
        <TooltipTrigger
          render={<DialogTrigger render={<Button variant="outline" color="neutral" size="icon" />} />}
        >
          <span className="sr-only">Agregar lista</span>
          <ControlPointIcon />
        </TooltipTrigger>
        <TooltipContent>Agregar lista</TooltipContent>
      </Tooltip>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle>Agregar lista</DialogTitle>
        </DialogHeader>
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        <form
          id="categoria-form"
          onSubmit={handleSubmit}
          className="-mx-1 flex min-h-0 flex-col gap-4 overflow-y-auto px-1"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field variant="outlined" data-invalid={nombreError ? "true" : undefined}>
              <FieldLabel htmlFor="categoria-nombre">Nombre de la lista*</FieldLabel>
              <Input
                id="categoria-nombre"
                placeholder="Ej. MUNICIPIO"
                value={nombre}
                onChange={(e) => setNombre(toCodigoCategoria(e.target.value))}
                aria-invalid={Boolean(nombreError)}
                className="font-mono"
              />
              {nombreError ? (
                <FieldError>{nombreError}</FieldError>
              ) : (
                <FieldDescription>Mayúsculas, números y guion bajo. Máximo 30.</FieldDescription>
              )}
            </Field>
            <Field variant="outlined">
              <FieldLabel htmlFor="categoria-padre">Depende de</FieldLabel>
              <CategoriaPadreSelect
                id="categoria-padre"
                value={categoriaPadre}
                categorias={categorias}
                onChange={(next) => {
                  setCategoriaPadre(next)
                  // Los padres elegidos eran de otra lista: se limpian.
                  setFilas((prev) => prev.map((f) => ({ ...f, padre: NONE })))
                }}
              />
              <FieldDescription>Opcional. Ej. MUNICIPIO depende de DEPARTAMENTO.</FieldDescription>
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Valores ({filas.length})</h3>
              <Button
                type="button"
                size="xs"
                variant="soft"
                color="primary"
                onClick={() =>
                  setFilas((prev) => [...prev, filaVacia(Math.max(...prev.map((f) => f.key)) + 1)])
                }
              >
                <PlusIcon data-icon="inline-start" />
                Agregar fila
              </Button>
            </div>
            <ul className="flex flex-col gap-2">
              {filas.map((fila, index) => {
                const error = filaError(fila, index)
                return (
                  <li key={fila.key} className="flex flex-col gap-1">
                    <div
                      className={
                        padre
                          ? "grid items-center gap-2 sm:grid-cols-[1fr_8rem_1fr_auto]"
                          : "grid items-center gap-2 sm:grid-cols-[1fr_8rem_auto]"
                      }
                    >
                      <Input
                        variant="outlined"
                        aria-label={`Nombre del valor ${index + 1}`}
                        placeholder="Nombre"
                        maxLength={120}
                        value={fila.nombre}
                        aria-invalid={Boolean(error) && !fila.nombre.trim()}
                        onChange={(e) => updateFila(fila.key, { nombre: e.target.value })}
                      />
                      <Input
                        variant="outlined"
                        aria-label={`Código del valor ${index + 1}`}
                        placeholder="Código"
                        maxLength={130}
                        value={fila.valor}
                        aria-invalid={Boolean(error) && (error === "Código repetido" || !fila.valor.trim())}
                        className="font-mono"
                        onChange={(e) => updateFila(fila.key, { valor: e.target.value })}
                      />
                      {padre && (
                        <ValorPadreSelect
                          id={`fila-padre-${fila.key}`}
                          aria-label={`Valor padre del valor ${index + 1}`}
                          categoria={padre}
                          value={fila.padre}
                          onChange={(next) => updateFila(fila.key, { padre: next })}
                        />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        color="neutral"
                        size="icon-sm"
                        disabled={filas.length === 1}
                        onClick={() => setFilas((prev) => prev.filter((f) => f.key !== fila.key))}
                      >
                        <span className="sr-only">Quitar fila {index + 1}</span>
                        <TrashIcon />
                      </Button>
                    </div>
                    {error && <p className="text-xs text-red">{error}</p>}
                  </li>
                )
              })}
            </ul>
          </div>
        </form>
        <DialogFooter>
          <Button
            size="sm"
            type="submit"
            color="primary"
            form="categoria-form"
            disabled={create.isPending}
            aria-busy={create.isPending}
          >
            {create.isPending ? (
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
