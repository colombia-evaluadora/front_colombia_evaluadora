import { useState } from "react"
import { useStore } from "@tanstack/react-form"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckIcon, InfoIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"
import { FormDisabledProvider, useAppForm } from "@/lib/forms"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { toSafeTextInput } from "@/lib/text-input"

import { useEstadoCriterioPrioridad } from "@/features/administration/criterios-prioridad/api/mutations/estado-criterio-prioridad"
import { useSaveCriterioPrioridad } from "@/features/administration/criterios-prioridad/api/mutations/save-criterio-prioridad"
import { useCriterioCamposQuery } from "@/features/administration/criterios-prioridad/api/query/use-criterios-prioridad-query"
import {
  criterioFormSchema,
  type CriterioFormValues,
} from "@/features/administration/criterios-prioridad/api/schema"
import {
  CRITERIO_EN_USO_MENSAJE,
  bloqueTexto,
  type BloqueOpcion,
  type CriterioPrioridad,
} from "@/features/administration/criterios-prioridad/api/types/criterio-prioridad"
import {
  CampoRadios,
  EstadoCriterio,
  ReglaRadios,
  ValoresSelect,
} from "@/features/administration/criterios-prioridad/components/criterio-campos"

const FORM_ID = "criterio-prioridad-form"

/** nuevo · modificar · ver ("Criterio › [nombre]", solo lectura salvo el Estado si está en uso). */
export type ModoCriterio = "nuevo" | "modificar" | "ver"

interface DialogCriterioPrioridadProps {
  modo: ModoCriterio | null
  criterio: CriterioPrioridad | null
  puedeEditar: boolean
  onClose: () => void
  /** Desde "ver" de un criterio libre: pasar a modificarlo. */
  onModificar: (criterio: CriterioPrioridad) => void
}

/** Lo abre la página; el form se monta en cada apertura y arranca de los datos del criterio. */
export function DialogCriterioPrioridad({ modo, ...props }: DialogCriterioPrioridadProps) {
  if (!modo) return null
  return (
    <CriterioContent
      key={`${modo}-${props.criterio?.pkCriterio ?? "nuevo"}`}
      modo={modo}
      {...props}
    />
  )
}

function toValues(criterio: CriterioPrioridad | null): CriterioFormValues {
  return {
    nombre: criterio?.nombre ?? "",
    descripcion: criterio?.descripcion ?? "",
    bloque: criterio?.campo.bloque.codigo ?? "",
    campo: criterio?.campo.pkCampo ?? 0,
    regla: criterio?.regla.pkRegla ?? 0,
    valores: criterio?.valores.map((v) => v.pkListaValor) ?? [],
    habilitado: criterio?.habilitado ?? true,
  }
}

type ContentProps = Omit<DialogCriterioPrioridadProps, "modo"> & { modo: ModoCriterio }

// El schema necesita el código de cada regla: el form se monta con el catálogo ya cargado.
function CriterioContent(props: ContentProps) {
  const { data: bloques, isError, error } = useCriterioCamposQuery()
  if (bloques) return <CriterioForm {...props} bloques={bloques} />
  return (
    <Dialog open onOpenChange={(next) => !next && props.onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{props.modo === "nuevo" ? "Nuevo criterio" : "Criterio"}</DialogTitle>
        </DialogHeader>
        {isError ? (
          <NoticeBanner
            notice={{ id: 0, message: getErrorMessage(error) }}
            onClose={props.onClose}
            variant="error"
          />
        ) : (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-20" />
            <Skeleton className="h-32" />
          </div>
        )}
        <DialogFooter>
          <Button size="sm" type="button" variant="fill" color="neutral" onClick={props.onClose}>
            <XIcon data-icon="inline-start" />
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CriterioForm({
  modo,
  criterio,
  puedeEditar,
  onClose,
  onModificar,
  bloques,
}: ContentProps & { bloques: BloqueOpcion[] }) {
  const { notify } = useNotify()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  const soloLectura = modo === "ver"
  // En uso: todo protegido salvo el Estado (Sección 5). Un "ver" libre no edita nada.
  const estadoEditable = modo !== "ver" || (Boolean(criterio?.enUso) && puedeEditar)

  const reglaCodigo = new Map(
    bloques.flatMap((b) =>
      b.campos.flatMap((c) => c.reglas.map((r) => [r.pkRegla, r.codigo] as const)),
    ),
  )
  const esUnoDe = (pkRegla: number) => reglaCodigo.get(pkRegla) === "ES_UNO_DE"
  const defaultValues = toValues(criterio)

  const save = useSaveCriterioPrioridad()
  const estado = useEstadoCriterioPrioridad()
  const busy = save.isPending || estado.isPending

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: criterioFormSchema(esUnoDe) },
    onSubmit: ({ value }) => guardar(value),
  })
  const values = useStore(form.store, (s) => s.values)

  const conCampos = bloques.filter((b) => b.campos.length > 0)
  const bloque = bloques.find((b) => b.codigo === values.bloque)
  const campo = bloque?.campos.find((c) => c.pkCampo === values.campo)

  // Datos y estado son dos endpoints: primero los datos, luego el estado.
  async function guardar(value: CriterioFormValues) {
    const datos = {
      nombre: value.nombre.trim(),
      descripcion: value.descripcion.trim() || null,
      campo: value.campo,
      regla: value.regla,
      valores: esUnoDe(value.regla) ? value.valores : [],
    }
    const { habilitado: _a, ...actuales } = value
    const { habilitado: _b, ...iniciales } = defaultValues
    const cambianDatos =
      modo === "nuevo" ||
      (modo === "modificar" && JSON.stringify(actuales) !== JSON.stringify(iniciales))
    const cambiaEstado = criterio != null && value.habilitado !== criterio.habilitado
    try {
      if (criterio == null) await save.mutateAsync({ ...datos, habilitado: value.habilitado })
      else if (cambianDatos) await save.mutateAsync({ id: criterio.pkCriterio, ...datos })
      if (cambiaEstado && criterio != null)
        await estado.mutateAsync({ id: criterio.pkCriterio, habilitado: value.habilitado })
      onClose()
      if (!cambianDatos && !cambiaEstado) return
      notify(
        cambianDatos
          ? SUCCESS_MESSAGES.criterioPrioridad.created
          : value.habilitado
            ? SUCCESS_MESSAGES.criterioPrioridad.activated
            : SUCCESS_MESSAGES.criterioPrioridad.deactivated,
      )
    } catch (err) {
      // Nombre repetido (409) llega con el texto del requerimiento desde el back.
      setNotice({ id: Date.now(), message: getErrorMessage(err) })
    }
  }

  function requestClose() {
    if (busy) return
    if (JSON.stringify(form.state.values) !== JSON.stringify(defaultValues)) {
      setConfirmDiscardOpen(true)
      return
    }
    onClose()
  }

  const titulo =
    modo === "nuevo"
      ? "Nuevo criterio"
      : modo === "modificar"
        ? "Modificar criterio"
        : `Criterio › ${criterio?.nombre ?? ""}`
  const conGuardar = !soloLectura || estadoEditable

  return (
    <Dialog open onOpenChange={(next) => !next && requestClose()}>
      <DialogContent className="sm:max-w-2xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {titulo}
            {criterio?.enUso && (
              <Badge variant="soft" color="info">
                En uso
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Un criterio evalúa un campo de la matrícula o de la inscripción con una regla. El Rector
            elige cuáles aplica y en qué orden en la Configuración de la admisión.
          </DialogDescription>
        </DialogHeader>
        {criterio?.enUso && (
          <p className="flex items-start gap-2 rounded-md bg-blue-22 px-3 py-2 text-sm text-blue">
            <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            {CRITERIO_EN_USO_MENSAJE}
          </p>
        )}
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto px-0.5 py-1"
        >
          <FormDisabledProvider disabled={soloLectura}>
            <form.AppField name="nombre">
              {(f) => (
                <f.TextField
                    label="Nombre"
                    required
                    maxLength={80}
                    transform={(v) => toSafeTextInput(v, 80)}
                    placeholder="Ej. Estrato"
                  />
              )}
            </form.AppField>
            <form.AppField name="descripcion">
              {(f) => (
                <f.TextareaField
                  label="Descripción"
                  maxLength={300}
                  transform={(v) => toSafeTextInput(v, 300)}
                  rows={2}
                  placeholder="Para qué sirve el criterio (opcional, de 10 a 300 caracteres)"
                />
              )}
            </form.AppField>
            <form.AppField
              name="bloque"
              listeners={{
                onChange: () => {
                  form.setFieldValue("campo", 0)
                  form.setFieldValue("regla", 0)
                  form.setFieldValue("valores", [])
                },
              }}
            >
              {(f) => (
                <f.SelectField
                  label="Bloque"
                  required
                  options={bloquesOpciones(conCampos, bloque)}
                  description="Sección de la matrícula (2.2 a 2.13) o la Inscripción."
                />
              )}
            </form.AppField>
            <form.AppField
              name="campo"
              listeners={{
                onChange: ({ value }) => {
                  // La regla elegida se conserva solo si el campo nuevo la admite.
                  const nuevo = bloque?.campos.find((c) => c.pkCampo === value)
                  const sigue = nuevo?.reglas.some(
                    (r) => r.pkRegla === form.getFieldValue("regla") && r.motivo == null,
                  )
                  if (!sigue) form.setFieldValue("regla", 0)
                  form.setFieldValue("valores", [])
                },
              }}
            >
              {() => <CampoRadios campos={bloque?.campos ?? []} sinBloque={!bloque} />}
            </form.AppField>
            <form.AppField
              name="regla"
              listeners={{
                onChange: ({ value }) => !esUnoDe(value) && form.setFieldValue("valores", []),
              }}
            >
              {() => <ReglaRadios reglas={campo?.reglas ?? []} sinCampo={!campo} />}
            </form.AppField>
            {esUnoDe(values.regla) && (
              <form.AppField name="valores">
                {() => <ValoresSelect opciones={campo?.valores ?? []} />}
              </form.AppField>
            )}
          </FormDisabledProvider>
          <form.AppField name="habilitado">
            {() => <EstadoCriterio disabled={!estadoEditable} />}
          </form.AppField>
        </form>

        <DialogFooter>
          {conGuardar && (
            <Button
              size="sm"
              type="submit"
              color="primary"
              form={FORM_ID}
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
          )}
          {soloLectura && criterio != null && !criterio.enUso && puedeEditar && (
            <Button
              size="sm"
              type="button"
              variant="outline"
              color="neutral"
              onClick={() => onModificar(criterio)}
            >
              <PencilIcon data-icon="inline-start" />
              Modificar
            </Button>
          )}
          <Button size="sm" type="button" variant="fill" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            {conGuardar ? "Cancelar" : "Cerrar"}
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

/** Solo los bloques con campos evaluables; el del criterio aunque ya no tenga otros. */
function bloquesOpciones(conCampos: BloqueOpcion[], actual: BloqueOpcion | undefined) {
  const lista = actual && !conCampos.includes(actual) ? [...conCampos, actual] : conCampos
  return lista.map((b) => ({ value: b.codigo, label: bloqueTexto(b) }))
}
