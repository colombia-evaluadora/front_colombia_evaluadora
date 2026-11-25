import { useEffect, useState } from "react"
import { useStore } from "@tanstack/react-form"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { MarcoOpciones } from "@/components/marco-opciones"
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
import { FloppyDiskIcon, InfoIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { getErrorMessage } from "@/lib/api-client"
import { FormDisabledProvider, useAppForm } from "@/lib/forms"
import { administradorSaveNotice } from "@/lib/success-messages"
import { toDigitsOnly, toEmailInput } from "@/lib/text-input"
import { limpiarNombre } from "@/features/establishment/shared/person-field-rules"
import { useGuardedDialog } from "@/features/establishment/academic-period/hooks/use-guarded-dialog"
import { usePersonaPorDocumentoQuery } from "@/features/administration/superadministradores/api/query/use-persona-por-documento"

import { useSaveAdministrador } from "@/features/administration/administradores-territoriales/api/mutations/administrador-mutations"
import {
  useAdministradoresQuery,
  useAdministradorQuery,
  useCatalogosAdministradorQuery,
} from "@/features/administration/administradores-territoriales/api/query/use-administradores-query"
import {
  administradorFormSchema,
  type AdministradorFormValues,
} from "@/features/administration/administradores-territoriales/api/schema"
import type {
  AdministradorTerritorial,
  CatalogosAdministrador,
} from "@/features/administration/administradores-territoriales/api/types/administrador"

const FORM_ID = "administrador-territorial-form"

export type ModoAdministrador = "nuevo" | "modificar" | "ver"

interface DialogAdministradorProps {
  modo: ModoAdministrador
  /** null = alta. */
  pkAdministrador: number | null
  puedeEditar: boolean
  onClose: () => void
  /** Desde Ver detalle: pasar a Modificar en el mismo modal. */
  onModificar: (pkAdministrador: number) => void
}

/**
 * S.11.EDI.1 (nuevo), S.11.EDI.2 (modificar) y Ver detalle en un modal, como Superadministradores y
 * Supervisores territoriales (decisión del equipo; el md los pone en pantalla propia). Mismo formulario que
 * el de Supervisores, sin Establecimientos a cargo: su alcance son todos los establecimientos (Regla 32).
 */
export function DialogAdministrador(props: DialogAdministradorProps) {
  const administrador = useAdministradorQuery(props.pkAdministrador)
  const catalogos = useCatalogosAdministradorQuery()
  const error = administrador.error ?? catalogos.error
  const cargando = (props.pkAdministrador != null && administrador.isPending) || catalogos.isPending

  if (!error && !cargando) {
    return (
      <AdministradorForm
        key={`${props.modo}-${props.pkAdministrador ?? "nuevo"}`}
        {...props}
        actual={props.pkAdministrador != null ? (administrador.data ?? null) : null}
        catalogos={catalogos.data ?? { tiposDocumento: [] }}
      />
    )
  }
  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{props.modo === "nuevo" ? "Nuevo administrador territorial" : "Administrador territorial"}</DialogTitle>
        </DialogHeader>
        {error ? (
          <NoticeBanner notice={{ id: 0, message: getErrorMessage(error) }} onClose={props.onClose} variant="error" />
        ) : (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-24" />
            <Skeleton className="h-10" />
          </div>
        )}
        <DialogFooter>
          <Button size="sm" type="button" variant="outline" color="neutral" onClick={props.onClose}>
            <XIcon data-icon="inline-start" />
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Alta: Cédula de ciudadanía (CC) por defecto, como el prototipo (S.11.EDI.1). */
function toValues(s: AdministradorTerritorial | null, tipos: { pk: number; sigla: string }[]): AdministradorFormValues {
  return {
    tipoDocumento: s ? (s.tipoDocumento?.pk ?? 0) : (tipos.find((t) => t.sigla === "CC")?.pk ?? 0),
    numeroDocumento: s?.numeroDocumento ?? "",
    primerNombre: s?.primerNombre ?? "",
    segundoNombre: s?.segundoNombre ?? "",
    primerApellido: s?.primerApellido ?? "",
    segundoApellido: s?.segundoApellido ?? "",
    correo: s?.correo ?? "",
    dependencia: s?.dependencia ?? "",
    activo: s?.activo ?? true,
  }
}

function AdministradorForm({
  modo,
  actual,
  catalogos,
  puedeEditar,
  onClose,
  onModificar,
}: DialogAdministradorProps & { actual: AdministradorTerritorial | null; catalogos: CatalogosAdministrador }) {
  const { notify } = useNotify()
  const [notice, setNotice] = useState<Notice | null>(null)
  const save = useSaveAdministrador()

  const soloLectura = modo === "ver"
  const { tiposDocumento: tipos } = catalogos
  const esNumerico = (pk: number) => tipos.find((t) => t.pk === pk)?.numerico ?? false
  const defaultValues = toValues(actual, tipos)


  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: administradorFormSchema(esNumerico) },
    onSubmit: async ({ value }) => {
      try {
        const result = await save.mutateAsync({
          id: actual?.pkAdministrador,
          tipoDocumento: value.tipoDocumento,
          numeroDocumento: value.numeroDocumento.trim().toUpperCase(),
          primerNombre: value.primerNombre.trim(),
          segundoNombre: value.segundoNombre.trim() || null,
          primerApellido: value.primerApellido.trim(),
          segundoApellido: value.segundoApellido.trim() || null,
          correo: toEmailInput(value.correo).toLowerCase(),
          dependencia: value.dependencia.trim() || null,
          activo: value.activo,
        })
        const aviso = administradorSaveNotice(result, actual == null)
        onClose()
        notify(aviso.message, { variant: aviso.variant })
      } catch (err) {
        // Documento o correo repetidos (409) llegan con el texto de la Sección 7.3.
        setNotice({ id: Date.now(), message: getErrorMessage(err) })
      }
    },
  })

  // Persona que ya existe en la plataforma: se le agrega el rol con su cuenta (Regla 24).
  const tipo = useStore(form.store, (s) => s.values.tipoDocumento)
  const numeroDoc = useStore(form.store, (s) => s.values.numeroDocumento.trim().toUpperCase())
  const [numeroBuscado, setNumeroBuscado] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setNumeroBuscado(numeroDoc), 400)
    return () => clearTimeout(t)
  }, [numeroDoc])
  // Si el documento ya es de alguien de la lista no se busca: el alta daría 409.
  const { data: existentes = [] } = useAdministradoresQuery()
  const yaEs =
    modo === "nuevo" && numeroDoc
      ? existentes.find((x) => x.tipoDocumento?.pk === tipo && x.numeroDocumento?.toUpperCase() === numeroDoc)
      : undefined
  const consulta = usePersonaPorDocumentoQuery(tipo, numeroBuscado, modo === "nuevo" && !yaEs)
  const persona = consulta.data && numeroBuscado === numeroDoc && !yaEs ? consulta.data : null
  const [aplicada, setAplicada] = useState<number | null>(null)
  useEffect(() => {
    const poner = (v: { primerNombre: string; segundoNombre: string; primerApellido: string; segundoApellido: string; correo: string }) => {
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
      poner({ primerNombre: "", segundoNombre: "", primerApellido: "", segundoApellido: "", correo: "" })
      setAplicada(null)
    }
  }, [persona, aplicada, form])

  const { confirmDiscardOpen, requestClose, onOpenChange, discardDialogProps } = useGuardedDialog({
    isSaving: save.isPending,
    isDirty: () => !soloLectura && JSON.stringify(form.state.values) !== JSON.stringify(defaultValues),
    onOpen: () => {},
    onClose,
  })

  const tipoOptions = tipos.map((t) => ({ value: t.pk, label: `${t.sigla} · ${t.nombre}` }))
  const numerico = esNumerico(tipo)
  const titulo =
    modo === "nuevo"
      ? "Nuevo administrador territorial"
      : modo === "modificar"
        ? "Modificar administrador territorial"
        : (actual?.nombre ?? "Administrador territorial")

  return (
    <Dialog open onOpenChange={onOpenChange}>
      {/* Sin X: el pie ya tiene Cancelar/Cerrar (CLAUDE.md §13). */}
      <DialogContent showCloseButton={false} className="sm:max-w-3xl" inert={confirmDiscardOpen}>
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {titulo}
            {actual?.activo && actual.pendienteActivacion && (
              <Badge variant="soft" color="warning">
                Pendiente de activación
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>Administra la parte de la entidad territorial: su alcance son todos los establecimientos de la instalación.</DialogDescription>
        </DialogHeader>

        {modo === "nuevo" && (
          <p className="flex items-start gap-2 rounded-md border border-blue-stroke bg-blue-22 px-3 py-2 text-sm text-blue">
            <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            Se enviará un enlace de un solo uso, válido por 48 horas, para que establezca su contraseña.
          </p>
        )}
        {yaEs && (
          <p className="flex items-start gap-2 rounded-md border border-yellow-stroke bg-yellow-22 px-3 py-2 text-sm text-yellow">
            <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            {yaEs.nombre} ya es Administrador territorial{yaEs.activo ? "" : " (inactivo): actívelo desde el listado"}.
          </p>
        )}
        {persona && (
          <p className="flex items-start gap-2 rounded-md border border-blue-stroke bg-blue-22 px-3 py-2 text-sm text-blue">
            <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
            Esta persona ya tiene cuenta en la plataforma: se le agregará el rol de Administrador territorial
            {persona.correo ? ` con su cuenta actual (${persona.correo})` : ""}, sin crear otra.
          </p>
        )}
        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid max-h-[65vh] gap-x-4 gap-y-5 overflow-y-auto px-0.5 pt-2 pb-1 sm:grid-cols-2"
        >
          <FormDisabledProvider disabled={soloLectura}>
            <form.AppField
              name="tipoDocumento"
              listeners={{
                // Un número con letras deja de valer si el tipo pasa a ser numérico.
                onChange: ({ value }) => {
                  if (esNumerico(value))
                    form.setFieldValue("numeroDocumento", toDigitsOnly(form.getFieldValue("numeroDocumento"), 20))
                },
              }}
            >
              {(f) => (
                <f.SelectField
                  label="Tipo de documento"
                  required
                  options={tipoOptions}
                  emptyValue={0}
                  // Ayuda del prototipo (S.11.EDI.1).
                  description={soloLectura ? undefined : "Lista Tipo de documento XL (adultos)."}
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
                  placeholder={numerico ? "Solo dígitos" : "Letras y dígitos"}
                  transform={(v) => (numerico ? toDigitsOnly(v, 20) : v.replace(/[^A-Za-z0-9]/g, "").toUpperCase())}
                  description={consulta.isFetching ? "Buscando a la persona en la plataforma…" : undefined}
                />
              )}
            </form.AppField>

            {/* Persona existente: sus nombres no se editan aquí. */}
            <FormDisabledProvider disabled={persona != null}>
              {(
                [
                  ["primerNombre", "Primer nombre", true],
                  ["segundoNombre", "Segundo nombre", false],
                  ["primerApellido", "Primer apellido", true],
                  ["segundoApellido", "Segundo apellido", false],
                ] as const
              ).map(([name, label, required]) => (
                <form.AppField key={name} name={name}>
                  {(f) => (
                    <f.TextField
                      label={label}
                      required={required}
                      // En Ver detalle, un dato vacío se ve «—», no el «Agregar» de los campos editables.
                      placeholder={soloLectura ? "—" : undefined}
                      maxLength={40}
                      transform={(v) => limpiarNombre(v).slice(0, 40)}
                    />
                  )}
                </form.AppField>
              ))}
            </FormDisabledProvider>

            {/* Persona existente: su correo de ingreso no se cambia aquí; sin correo, se pide uno. */}
            <FormDisabledProvider disabled={Boolean(persona?.correo)}>
              <form.AppField name="correo">
                {(f) => (
                  <f.TextField
                    label="Correo electrónico"
                    required
                    type="email"
                    maxLength={120}
                    autoComplete="off"
                    placeholder="Con este correo inicia sesión"
                    transform={toEmailInput}
                    className="sm:col-span-2"
                    description={
                      modo === "modificar"
                        ? "Si lo cambia, la cuenta vuelve a pendiente y se envía el enlace al correo nuevo."
                        : undefined
                    }
                  />
                )}
              </form.AppField>
            </FormDisabledProvider>

            <form.AppField name="dependencia">
              {(f) => (
                <f.TextField
                  label="Dependencia"
                  maxLength={150}
                  className="sm:col-span-2"
                  // En Ver detalle, sin dato no se muestra el ejemplo como si fuera el valor.
                  placeholder={soloLectura ? "—" : "Ej. Secretaría de Educación — Dirección de Cobertura"}
                />
              )}
            </form.AppField>

            <form.Field name="activo">
              {(field) => (
                <Interruptor
                  id="administrador-estado"
                  label="Estado"
                  checked={field.state.value}
                  onChange={(v) => field.handleChange(v)}
                  disabled={soloLectura}
                  texto={field.state.value ? "Activo" : "Inactivo"}
                  ayuda={field.state.value ? "Si lo inactiva, pierde el acceso y se cierran sus sesiones." : "No puede ingresar a la plataforma."}
                  className="sm:col-span-2"
                />
              )}
            </form.Field>

          </FormDisabledProvider>
        </form>

        {/* Cancelar/Cerrar primero; el primario al final (CLAUDE.md §13). */}
        <DialogFooter className="sm:items-center">
          {!soloLectura && <p className="text-xs text-muted-foreground sm:mr-auto">Los campos marcados con * son obligatorios</p>}
          <Button size="sm" type="button" variant="outline" color="neutral" onClick={requestClose}>
            <XIcon data-icon="inline-start" />
            {soloLectura ? "Cerrar" : "Cancelar"}
          </Button>
          {soloLectura && actual != null && puedeEditar && (
            <Button size="sm" type="button" variant="outline" color="neutral" onClick={() => onModificar(actual.pkAdministrador)}>
              <PencilIcon data-icon="inline-start" />
              Modificar
            </Button>
          )}
          {!soloLectura && (
            <Button size="sm" type="submit" color="primary" form={FORM_ID} disabled={save.isPending} aria-busy={save.isPending}>
              {save.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <FloppyDiskIcon data-icon="inline-start" />
              )}
              Guardar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
      <ConfirmDiscardDialog {...discardDialogProps} />
    </Dialog>
  )
}

/** Interruptor dentro del recuadro de opciones con label flotante y * (reglas de UI); la ayuda debajo. */
function Interruptor({
  id,
  label,
  checked,
  onChange,
  disabled,
  texto,
  ayuda,
  className,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  texto: string
  ayuda: string
  className?: string
}) {
  return (
    <MarcoOpciones id={`${id}-marco`} label={label} required descripcion={ayuda} className={className}>
      <label htmlFor={id} className={disabled ? "flex cursor-not-allowed items-center gap-2" : "flex cursor-pointer items-center gap-2"}>
        <Switch id={id} size="sm" round checked={checked} disabled={disabled} onCheckedChange={onChange} />
        <span className={checked ? undefined : "text-muted-foreground"}>{texto}</span>
      </label>
    </MarcoOpciones>
  )
}
