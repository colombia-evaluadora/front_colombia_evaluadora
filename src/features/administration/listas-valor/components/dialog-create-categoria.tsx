import { useRef, useState } from "react"

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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { TEXTAREA_OUTLINED, Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getErrorMessage } from "@/lib/api-client"
import { INCOMPLETE_FORM } from "@/lib/forms/messages"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

import { useCreateCategoria } from "@/features/administration/listas-valor/api/mutations/create-categoria"
import {
  CODIGO_VALOR,
  toCodigo,
  type Categoria,
} from "@/features/administration/listas-valor/api/types/lista-valor"
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

// Mismo formato que valida el backend (V101): letra inicial, mayúsculas sin tildes, dígitos y `_`.
const CATEGORIA_FORMATO = /^[A-Z][A-Z0-9_]{0,29}$/

/** La descripción es opcional, pero si va tiene de 10 a 300 caracteres (V101). */
function descripcionError(descripcion: string) {
  const largo = descripcion.trim().length
  return largo > 0 && (largo < 10 || largo > 300) ? "Entre 10 y 300 caracteres" : undefined
}

const esFilaVacia = (f: Fila) => !f.nombre.trim() && !f.valor && f.padre === NONE

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
  const [nombreVisible, setNombreVisible] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [categoriaPadre, setCategoriaPadre] = useState(NONE)
  const [ordinal, setOrdinal] = useState(false)
  const [filas, setFilas] = useState<Fila[]>([filaVacia(0)])
  const [submitted, setSubmitted] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const listaRef = useRef<HTMLUListElement>(null)

  const dirty =
    nombre !== "" ||
    nombreVisible !== "" ||
    descripcion !== "" ||
    categoriaPadre !== NONE ||
    ordinal ||
    filas.some((f) => !esFilaVacia(f))

  const nombreError = !submitted
    ? undefined
    : !nombre
      ? "El código de la lista es obligatorio"
      : !CATEGORIA_FORMATO.test(nombre)
        ? "Debe empezar con una letra"
        : categorias.some((c) => c.categoria === nombre)
          ? "Ya existe una lista con este código"
          : undefined

  const descError = submitted ? descripcionError(descripcion) : undefined
  const padre = categoriaPadre === NONE ? null : categoriaPadre

  // La lista se puede crear sin valores: las filas vacías se ignoran.
  const codigos = filas.map((f) => f.valor)
  const nombres = filas.map((f) => f.nombre.trim().toLowerCase())
  function validarFila(fila: Fila, index: number) {
    if (esFilaVacia(fila)) return undefined
    if (!fila.nombre.trim()) return "El nombre es obligatorio"
    if (!CODIGO_VALOR.test(fila.valor)) return "Código: de 2 a 20 mayúsculas, números o guion bajo"
    if (codigos.indexOf(fila.valor) !== index) return "Código repetido"
    if (nombres.indexOf(fila.nombre.trim().toLowerCase()) !== index) return "Nombre repetido"
    if (padre && fila.padre === NONE) return "Elija el valor padre"
    return undefined
  }
  const filaError = (fila: Fila, index: number) =>
    submitted ? validarFila(fila, index) : undefined

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
    setNombreVisible("")
    setDescripcion("")
    setCategoriaPadre(NONE)
    setOrdinal(false)
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
      descripcionError(descripcion) != null ||
      filas.some((f, i) => validarFila(f, i) != null)
    if (invalid) {
      setNotice({ id: Date.now(), message: INCOMPLETE_FORM })
      return
    }
    create.mutate({
      categoria: nombre,
      nombre: nombreVisible.trim() || null,
      descripcion: descripcion.trim() || null,
      padre,
      ordinal,
      valores: filas
        .filter((f) => !esFilaVacia(f))
        .map((f) => ({
          nombre: f.nombre.trim(),
          valor: f.valor,
          padre: f.padre === NONE ? null : Number(f.padre),
        })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? handleOpenChange(true) : requestClose())}>
      {/* Vive junto al buscador del índice: el primary de la pantalla es "Agregar valor". */}
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger render={<Button variant="outline" color="neutral" size="icon" />} />
          }
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
        <form id="categoria-form" onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field variant="outlined" data-invalid={nombreError ? "true" : undefined}>
              <FieldLabel htmlFor="categoria-nombre">Código de la lista*</FieldLabel>
              <Input
                id="categoria-nombre"
                placeholder="Ej. MUNICIPIO"
                value={nombre}
                onChange={(e) => setNombre(toCodigo(e.target.value, 30))}
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
              <FieldLabel htmlFor="categoria-nombre-visible">Nombre</FieldLabel>
              <Input
                id="categoria-nombre-visible"
                placeholder="Ej. Municipio"
                maxLength={100}
                value={nombreVisible}
                onChange={(e) => setNombreVisible(e.target.value)}
              />
              <FieldDescription>Opcional. Si no se escribe, sale del código.</FieldDescription>
            </Field>
            <Field variant="outlined" className="sm:col-span-2">
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
            <Field
              variant="outlined"
              className="sm:col-span-2"
              data-invalid={descError ? "true" : undefined}
            >
              <FieldLabel htmlFor="categoria-descripcion">Descripción</FieldLabel>
              <Textarea
                className={TEXTAREA_OUTLINED}
                id="categoria-descripcion"
                placeholder="Para qué se usa la lista"
                maxLength={300}
                rows={2}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                aria-invalid={Boolean(descError)}
              />
              {descError ? (
                <FieldError>{descError}</FieldError>
              ) : (
                <FieldDescription>Opcional. Entre 10 y 300 caracteres.</FieldDescription>
              )}
            </Field>
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <Checkbox checked={ordinal} onCheckedChange={(next) => setOrdinal(next === true)} />
              <span>
                Lista ordinal
                <span className="block text-xs text-muted-foreground">
                  Sus valores tienen un orden con significado, como Bajo, Básico, Alto y Superior.
                </span>
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                Valores{" "}
                <span className="font-normal text-muted-foreground">(opcional, en este orden)</span>
              </h3>
              <Button
                type="button"
                size="xs"
                variant="soft"
                color="primary"
                onClick={() => {
                  setFilas((prev) => [...prev, filaVacia(Math.max(...prev.map((f) => f.key)) + 1)])
                  // La fila nueva queda abajo, fuera de vista si ya hay scroll.
                  requestAnimationFrame(() =>
                    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight }),
                  )
                }}
              >
                <PlusIcon data-icon="inline-start" />
                Agregar fila
              </Button>
            </div>
            {/* Alto de 5 filas (2.75rem + gap); con más, scroll interno. El padding deja ver el ring de foco. */}
            <ul
              ref={listaRef}
              className="-m-1 flex max-h-[16.75rem] flex-col gap-2 overflow-x-hidden overflow-y-auto p-1"
            >
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
                        maxLength={100}
                        value={fila.nombre}
                        aria-invalid={
                          Boolean(error) && (!fila.nombre.trim() || error === "Nombre repetido")
                        }
                        onChange={(e) => updateFila(fila.key, { nombre: e.target.value })}
                      />
                      <Input
                        variant="outlined"
                        aria-label={`Código del valor ${index + 1}`}
                        placeholder="Código"
                        value={fila.valor}
                        aria-invalid={error?.startsWith("Código") ?? false}
                        className="font-mono"
                        onChange={(e) =>
                          updateFila(fila.key, { valor: toCodigo(e.target.value, 20) })
                        }
                      />
                      {padre && (
                        <ValorPadreSelect
                          id={`fila-padre-${fila.key}`}
                          aria-label={`Valor padre del valor ${index + 1}`}
                          categoria={padre}
                          value={fila.padre}
                          required
                          onChange={(next) => updateFila(fila.key, { padre: next })}
                        />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        color="neutral"
                        size="icon-sm"
                        disabled={filas.length === 1 && esFilaVacia(fila)}
                        onClick={() =>
                          setFilas((prev) =>
                            prev.length === 1
                              ? [filaVacia(fila.key + 1)]
                              : prev.filter((f) => f.key !== fila.key),
                          )
                        }
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
