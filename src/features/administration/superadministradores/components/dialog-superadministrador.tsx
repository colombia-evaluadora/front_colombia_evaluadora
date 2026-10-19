import { useEffect, useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import { getErrorMessage } from "@/lib/api-client"
import { FormDisabledProvider, useAppForm, useFieldContext } from "@/lib/forms"
import { SUCCESS_MESSAGES, superadministradorSaveNotice } from "@/lib/success-messages"
import { toDigitsOnly, toEmailInput, toLettersOnly } from "@/lib/text-input"
import { cn } from "@/lib/utils"

import { useEstadoSuperadministrador } from "@/features/administration/superadministradores/api/mutations/estado-superadministrador"
import { useSaveSuperadministrador } from "@/features/administration/superadministradores/api/mutations/save-superadministrador"
import { usePersonaPorDocumentoQuery } from "@/features/administration/superadministradores/api/query/use-persona-por-documento"
import { useTiposDocumentoXlQuery } from "@/features/administration/superadministradores/api/query/use-superadministradores-query"
import {
  superadministradorFormSchema,
  type SuperadministradorFormValues,
} from "@/features/administration/superadministradores/api/schema"
import {
  NO_PUEDE_INACTIVARSE_MENSAJE,
  type Superadministrador,
  type TipoDocumentoXl,
} from "@/features/administration/superadministradores/api/types/superadministrador"

const FORM_ID = "superadministrador-form"

/** nuevo · modificar · ver (solo lectura, con Modificar al pie). */
export type ModoSuperadministrador = "nuevo" | "modificar" | "ver"

interface DialogSuperadministradorProps {
  modo: ModoSuperadministrador | null
  superadministrador: Superadministrador | null
  puedeEditar: boolean
  /** El listado: para avisar en el alta si el documento ya es de un Superadministrador. */
  existentes: Superadministrador[]
  onClose: () => void
  onModificar: (s: Superadministrador) => void
}

/** Lo abre la página; el form se monta en cada apertura y arranca de los datos. */
export function DialogSuperadministrador({ modo, ...props }: DialogSuperadministradorProps) {
  if (!modo) return null
  return (
    <SuperadministradorContent
      key={`${modo}-${props.superadministrador?.pkSuperadministrador ?? "nuevo"}`}
      modo={modo}
      {...props}
    />
  )
}

type ContentProps = Omit<DialogSuperadministradorProps, "modo"> & { modo: ModoSuperadministrador }

// El schema necesita saber qué tipos son numéricos: el form se monta con el catálogo cargado.
function SuperadministradorContent(props: ContentProps) {
  const { data: tipos, isError, error } = useTiposDocumentoXlQuery()
  if (tipos) return <SuperadministradorForm {...props} tipos={tipos} />
  return (
    <Dialog open onOpenChange={(next) => !next && props.onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {props.modo === "nuevo" ? "Nuevo Superadministrador" : "Superadministrador"}
          </DialogTitle>
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
            <Skeleton className="h-24" />
            <Skeleton className="h-10" />
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

function toValues(s: Superadministrador | null): SuperadministradorFormValues {
  return {
    tipoDocumento: s?.tipoDocumento?.pk ?? 0,
    numeroDocumento: s?.numeroDocumento ?? "",
    primerNombre: s?.primerNombre ?? "",
    segundoNombre: s?.segundoNombre ?? "",
    primerApellido: s?.primerApellido ?? "",
    segundoApellido: s?.segundoApellido ?? "",
    correo: s?.correo ?? "",
    activo: s?.activo ?? true,
  }
}

function SuperadministradorForm({
  modo,
  superadministrador: actual,
  puedeEditar,
  existentes,
  onClose,
  onModificar,
  tipos,
}: ContentProps & { tipos: TipoDocumentoXl[] }) {
  const { notify } = useNotify()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  const soloLectura = modo === "ver"
  const esNumerico = (pk: number) => tipos.find((t) => t.pk === pk)?.numerico ?? false
  const defaultValues = toValues(actual)

  const save = useSaveSuperadministrador()
  const estado = useEstadoSuperadministrador()
  const busy = save.isPending || estado.isPending

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: superadministradorFormSchema(esNumerico) },
    onSubmit: ({ value }) => guardar(value),
  })
  const tipo = useStore(form.store, (s) => s.values.tipoDocumento)
  const numeroDoc = useStore(form.store, (s) => s.values.numeroDocumento.trim().toUpperCase())

  // Autocompletado del alta: con el documento de alguien que ya existe en la
  // plataforma, el back le suma el rol a su cuenta (Regla 24) y no usa los
  // nombres ni el correo del formulario; por eso se muestran los suyos y se bloquean.
  const [numeroBuscado, setNumeroBuscado] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setNumeroBuscado(numeroDoc), 400)
    return () => clearTimeout(t)
  }, [numeroDoc])
  const yaEs =
    modo === "nuevo" && numeroDoc
      ? existentes.find(
          (s) => s.tipoDocumento?.pk === tipo && s.numeroDocumento?.toUpperCase() === numeroDoc,
        )
      : undefined
  const consulta = usePersonaPorDocumentoQuery(tipo, numeroBuscado, modo === "nuevo" && !yaEs)
  const persona = consulta.data && numeroBuscado === numeroDoc && !yaEs ? consulta.data : null
  const [aplicada, setAplicada] = useState<number | null>(null)
  useEffect(() => {
    const poner = (v: {
      primerNombre: string
      segundoNombre: string
      primerApellido: string
      segundoApellido: string
      correo: string
    }) => {
      form.setFieldValue("primerNombre", v.primerNombre)
      form.setFieldValue("segundoNombre", v.segundoNombre)
      form.setFieldValue("primerApellido", v.primerApellido)
      form.setFieldValue("segundoApellido", v.segundoApellido)
      form.setFieldValue("correo", v.correo)
    }
    if (persona && persona.pkUsuario !== aplicada) {
      poner(persona)
      setAplicada(persona.pkUsuario)
    } else if (!persona && aplicada != null) {
      // Cambió el documento: los datos eran de otra persona.
      poner({
        primerNombre: "",
        segundoNombre: "",
        primerApellido: "",
        segundoApellido: "",
        correo: "",
      })
      setAplicada(null)
    }
  }, [persona, aplicada, form])

  // Datos y estado son dos endpoints: primero los datos, luego el estado.
  async function guardar(value: SuperadministradorFormValues) {
    const { activo: _a, ...datos } = value
    const { activo: _b, ...iniciales } = defaultValues
    const cambianDatos = actual == null || JSON.stringify(datos) !== JSON.stringify(iniciales)
    const cambiaEstado = actual != null && value.activo !== actual.activo
    try {
      let aviso: { message: string; variant: "success" | "warning" } | null = null
      if (cambianDatos) {
        const result = await save.mutateAsync({
          id: actual?.pkSuperadministrador,
          tipoDocumento: value.tipoDocumento,
          numeroDocumento: value.numeroDocumento.trim().toUpperCase(),
          primerNombre: value.primerNombre.trim(),
          segundoNombre: value.segundoNombre.trim() || null,
          primerApellido: value.primerApellido.trim(),
          segundoApellido: value.segundoApellido.trim() || null,
          correo: toEmailInput(value.correo).toLowerCase(),
        })
        aviso = superadministradorSaveNotice(result, actual == null)
      }
      if (cambiaEstado) {
        await estado.mutateAsync({ id: actual.pkSuperadministrador, activo: value.activo })
        aviso ??= {
          message: value.activo
            ? SUCCESS_MESSAGES.superadministrador.activated
            : SUCCESS_MESSAGES.superadministrador.deactivated,
          variant: "success",
        }
      }
      onClose()
      if (aviso) notify(aviso.message, { variant: aviso.variant })
    } catch (err) {
      // Documento o correo repetidos (409) llegan con el texto del requerimiento.
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
      ? "Nuevo Superadministrador"
      : modo === "modificar"
        ? "Modificar Superadministrador"
        : (actual?.nombre ?? "Superadministrador")
  const tipoOptions = tipos.map((t) => ({ value: t.pk, label: `${t.sigla} · ${t.nombre}` }))
  const numerico = esNumerico(tipo)

  return (
    <Dialog open onOpenChange={(next) => !next && requestClose()}>
      <DialogContent className="sm:max-w-2xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {titulo}
            {actual?.esUsted && (
              <span className="text-base font-normal text-muted-foreground">(usted)</span>
            )}
            {actual?.activo && actual.pendienteActivacion && (
              <Badge variant="soft" color="warning">
                Pendiente de activación
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Administra la plataforma: siempre hay al menos uno activo.
          </DialogDescription>
        </DialogHeader>
        {modo === "nuevo" && (
          <p className="flex items-start gap-2 rounded-md bg-blue-22 px-3 py-2 text-sm text-blue">
            <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            Se enviará al correo un enlace para que establezca su contraseña. Si la persona ya tiene
            una cuenta activa en la plataforma, conserva la suya.
          </p>
        )}
        {yaEs && (
          <p className="flex items-start gap-2 rounded-md bg-yellow-22 px-3 py-2 text-sm text-yellow">
            <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            {yaEs.nombre} ya es Superadministrador.
          </p>
        )}
        {persona && (
          <p className="flex items-start gap-2 rounded-md bg-blue-22 px-3 py-2 text-sm text-blue">
            <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            Esta persona ya existe en la plataforma: se le agregará el rol de Superadministrador con
            su cuenta actual{persona.correo ? ` (${persona.correo})` : ""}, sin crear una nueva.
          </p>
        )}
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid max-h-[65vh] gap-4 overflow-y-auto px-0.5 py-1 sm:grid-cols-2"
        >
          <FormDisabledProvider disabled={soloLectura}>
            <form.AppField
              name="tipoDocumento"
              listeners={{
                // Un número con letras deja de valer si el tipo pasa a ser numérico.
                onChange: ({ value }) => {
                  if (esNumerico(value))
                    form.setFieldValue(
                      "numeroDocumento",
                      toDigitsOnly(form.getFieldValue("numeroDocumento"), 20),
                    )
                },
              }}
            >
              {(f) => (
                <f.SelectField
                  label="Tipo de documento"
                  required
                  options={tipoOptions}
                  emptyValue={0}
                />
              )}
            </form.AppField>
            <form.AppField name="numeroDocumento">
              {(f) => (
                <f.TextField
                  label="Número de documento"
                  required
                  maxLength={20}
                  inputMode={numerico ? "numeric" : "text"}
                  transform={(v) =>
                    numerico ? toDigitsOnly(v, 20) : v.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
                  }
                  description={
                    consulta.isFetching
                      ? "Buscando a la persona en la plataforma…"
                      : numerico
                        ? "Solo dígitos, sin puntos ni espacios."
                        : "Letras y dígitos, sin puntos ni espacios."
                  }
                />
              )}
            </form.AppField>
            {/* Persona existente: nombres y correo son los suyos, no se editan aquí. */}
            <FormDisabledProvider disabled={persona != null}>
              <form.AppField name="primerNombre">
                {(f) => (
                  <f.TextField
                    label="Primer nombre"
                    required
                    maxLength={40}
                    transform={(v) => toLettersOnly(v, 40)}
                  />
                )}
              </form.AppField>
              <form.AppField name="segundoNombre">
                {(f) => (
                  <f.TextField
                    label="Segundo nombre"
                    maxLength={40}
                    transform={(v) => toLettersOnly(v, 40)}
                  />
                )}
              </form.AppField>
              <form.AppField name="primerApellido">
                {(f) => (
                  <f.TextField
                    label="Primer apellido"
                    required
                    maxLength={40}
                    transform={(v) => toLettersOnly(v, 40)}
                  />
                )}
              </form.AppField>
              <form.AppField name="segundoApellido">
                {(f) => (
                  <f.TextField
                    label="Segundo apellido"
                    maxLength={40}
                    transform={(v) => toLettersOnly(v, 40)}
                  />
                )}
              </form.AppField>
            </FormDisabledProvider>
            {/* Con su correo de ingreso: el alta exige que documento y correo sean de la misma persona. */}
            <FormDisabledProvider disabled={Boolean(persona?.correo)}>
              <form.AppField name="correo">
                {(f) => (
                  <f.TextField
                    label="Correo electrónico"
                    required
                    type="email"
                    maxLength={254}
                    autoComplete="off"
                    transform={toEmailInput}
                    className="sm:col-span-2"
                    description={
                      modo === "modificar"
                        ? "Si lo cambia, la cuenta vuelve a pendiente y se envía el enlace al correo nuevo."
                        : "Con este correo inicia sesión."
                    }
                  />
                )}
              </form.AppField>
            </FormDisabledProvider>
          </FormDisabledProvider>
          {modo !== "nuevo" && (
            <form.AppField name="activo">
              {() => (
                <EstadoSuperadministrador
                  disabled={soloLectura || Boolean(actual?.esUsted)}
                  bloqueo={actual?.esUsted ? NO_PUEDE_INACTIVARSE_MENSAJE : undefined}
                />
              )}
            </form.AppField>
          )}
        </form>

        <DialogFooter>
          {!soloLectura && (
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
          {soloLectura && actual != null && puedeEditar && (
            <Button
              size="sm"
              type="button"
              variant="outline"
              color="neutral"
              onClick={() => onModificar(actual)}
            >
              <PencilIcon data-icon="inline-start" />
              Modificar
            </Button>
          )}
          <Button size="sm" type="button" variant="fill" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            {soloLectura ? "Cerrar" : "Cancelar"}
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

/** Activo / Inactivo, con el efecto de inactivar (Sección 7). */
function EstadoSuperadministrador({ disabled, bloqueo }: { disabled?: boolean; bloqueo?: string }) {
  const field = useFieldContext<boolean>()
  const checked = Boolean(useStore(field.store, (s) => s.value))
  return (
    <label
      htmlFor="superadministrador-estado"
      className={cn(
        "flex items-start gap-3 rounded-md border px-3 py-2.5 sm:col-span-2",
        checked ? "border-border" : "border-dashed border-border bg-muted/40",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      <Switch
        id="superadministrador-estado"
        size="sm"
        round
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => !disabled && field.handleChange(next)}
      />
      <span className="flex flex-col gap-0.5 text-sm">
        <span className={cn("font-medium", !checked && "text-muted-foreground")}>
          {checked ? "Activo" : "Inactivo"}
        </span>
        <span className="text-xs text-muted-foreground">
          {bloqueo ??
            (checked
              ? "Puede ingresar y administrar la plataforma. Si lo inactiva, pierde el acceso y se cierran sus sesiones."
              : "No puede ingresar a la plataforma.")}
        </span>
      </span>
    </label>
  )
}
