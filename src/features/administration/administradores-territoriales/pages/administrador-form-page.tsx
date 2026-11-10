import { useEffect, useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import { useStore } from "@tanstack/react-form"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { ErrorNoticeBanner } from "@/components/notice/error-notice-banner"
import { NoticeBanner, type Notice } from "@/components/notice/notice-banner"
import { NoticeProvider, queueNotice } from "@/components/notice/notice-context"
import { Badge } from "@/components/ui/badge"
import { Field, FieldLabel } from "@/components/ui/field"
import { FormSectionHeading } from "@/components/form-section-heading"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FloppyDiskIcon, InfoIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { FormDisabledProvider, useAppForm } from "@/lib/forms"
import { administradorSaveNotice } from "@/lib/success-messages"
import { toDigitsOnly, toEmailInput } from "@/lib/text-input"
import { limpiarNombre } from "@/features/establishment/shared/person-field-rules"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { usePersonaPorDocumentoQuery } from "@/features/administration/superadministradores/api/query/use-persona-por-documento"

import { useSaveAdministrador } from "@/features/administration/administradores-territoriales/api/mutations/administrador-mutations"
import {
  useCatalogosAdministradorQuery,
  useAdministradorQuery,
  useAdministradoresQuery,
} from "@/features/administration/administradores-territoriales/api/query/use-administradores-query"
import {
  administradorFormSchema,
  type AdministradorFormValues,
} from "@/features/administration/administradores-territoriales/api/schema"
import type {
  CatalogosAdministrador,
  AdministradorTerritorial,
} from "@/features/administration/administradores-territoriales/api/types/administrador"

const FORM_ID = "administrador-territorial-form"
const LISTADO = paths.app.administradoresTerritoriales.getHref()

export type ModoAdministrador = "nuevo" | "modificar" | "ver"

/**
 * S.11.EDI.1 (nuevo), S.11.EDI.2 (modificar) y Ver detalle: pantalla propia
 * "Administradores territoriales › [Nuevo Administrador territorial o nombre]" (Sección 7.3).
 */
export function AdministradorFormPage({ modo }: { modo: ModoAdministrador }) {
  const { administradorId } = useParams({ strict: false }) as { administradorId?: string }
  const id = modo === "nuevo" || !administradorId ? null : Number(administradorId)
  const administrador = useAdministradorQuery(id)
  const catalogos = useCatalogosAdministradorQuery()

  const error = administrador.error ?? catalogos.error
  const cargando = (id != null && administrador.isPending) || catalogos.isPending

  return (
    <NoticeProvider>
      {error ? (
        <ErrorNoticeBanner error={error} />
      ) : cargando ? (
        <Skeleton className="h-96" />
      ) : (
        <AdministradorForm
          key={`${modo}-${id ?? "nuevo"}`}
          modo={modo}
          actual={id != null ? (administrador.data ?? null) : null}
          catalogos={catalogos.data ?? { tiposDocumento: [] }}
        />
      )}
    </NoticeProvider>
  )
}

function toValues(s: AdministradorTerritorial | null): AdministradorFormValues {
  return {
    tipoDocumento: s?.tipoDocumento?.pk ?? 0,
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
}: {
  modo: ModoAdministrador
  actual: AdministradorTerritorial | null
  catalogos: CatalogosAdministrador
}) {
  const navigate = useNavigate()
  const permisos = useMenuPermission("ADMINISTRADORES_TERRITORIALES")
  const [notice, setNotice] = useState<Notice | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const save = useSaveAdministrador()

  const soloLectura = modo === "ver"
  const { tiposDocumento: tipos } = catalogos
  const esNumerico = (pk: number) => tipos.find((t) => t.pk === pk)?.numerico ?? false
  const defaultValues = toValues(actual)

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
        queueNotice(aviso.message, { variant: aviso.variant })
        navigate({ to: LISTADO })
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

  function cancelar() {
    if (save.isPending) return
    if (!soloLectura && JSON.stringify(form.state.values) !== JSON.stringify(defaultValues)) setConfirmDiscard(true)
    else navigate({ to: LISTADO })
  }

  const tipoOptions = tipos.map((t) => ({ value: t.pk, label: `${t.sigla} · ${t.nombre}` }))
  const numerico = esNumerico(tipo)

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" color="neutral" onClick={cancelar}>
                <XIcon data-icon="inline-start" />
                {soloLectura ? "Volver" : "Cancelar"}
              </Button>
              {soloLectura ? (
                permisos.puedeEditar &&
                actual && (
                  <Button
                    size="sm"
                    color="primary"
                    onClick={() => navigate({ to: paths.app.administradorTerritorialModificar.getHref(actual.pkAdministrador) })}
                  >
                    <PencilIcon data-icon="inline-start" />
                    Modificar
                  </Button>
                )
              ) : (
                <Button size="sm" color="primary" type="submit" form={FORM_ID} disabled={save.isPending} aria-busy={save.isPending}>
                  {save.isPending ? (
                    <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <FloppyDiskIcon data-icon="inline-start" />
                  )}
                  Guardar
                </Button>
              )}
            </div>
          }
        >
          <span className="flex flex-wrap items-center gap-2">
            <span>
              Administradores territoriales <span className="text-muted-foreground">›</span>{" "}
              {actual ? actual.nombre : "Nuevo Administrador territorial"}
            </span>
            {actual?.activo && actual.pendienteActivacion && (
              <Badge variant="soft" color="warning">
                Pendiente de activación
              </Badge>
            )}
          </span>
        </TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody>
        <div className="flex flex-col gap-3">
          {modo === "nuevo" && (
            <p className="flex items-start gap-2 rounded-md bg-blue-22 px-3 py-2 text-sm text-blue">
              <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              Se enviará un enlace de un solo uso, válido por 48 horas, para que establezca su contraseña.
            </p>
          )}
          {yaEs && (
            <p className="flex items-start gap-2 rounded-md bg-yellow-22 px-3 py-2 text-sm text-yellow">
              <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              {yaEs.nombre} ya es Administrador territorial{yaEs.activo ? "" : " (inactivo): actívelo desde el listado"}.
            </p>
          )}
          {persona && (
            <p className="flex items-start gap-2 rounded-md bg-blue-22 px-3 py-2 text-sm text-blue">
              <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              Esta persona ya tiene cuenta en la plataforma: se le agregará el rol de Administrador territorial
              {persona.correo ? ` con su cuenta actual (${persona.correo})` : ""}, sin crear otra.
            </p>
          )}
          <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        </div>

        <Card className="rounded-md border border-border py-5">
          <CardContent className="grid gap-5">
            <FormSectionHeading>Datos del administrador</FormSectionHeading>
        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid gap-x-4 gap-y-5 md:grid-cols-12"
        >
          <FormDisabledProvider disabled={soloLectura}>
            {/* Identidad: documento y correo en una fila, nombres en la siguiente. */}
            <div className="md:col-span-3">
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
                {(f) => <f.SelectField label="Tipo de documento" required options={tipoOptions} emptyValue={0} />}
              </form.AppField>
            </div>
            <div className="md:col-span-3">
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
            </div>

            {/* Persona existente: su correo de ingreso no se cambia aquí; sin correo, se pide uno. */}
            <FormDisabledProvider disabled={Boolean(persona?.correo)}>
              <div className="md:col-span-6">
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
                      description={
                        modo === "modificar"
                          ? "Si lo cambia, la cuenta vuelve a pendiente y se envía el enlace al correo nuevo."
                          : undefined
                      }
                    />
                  )}
                </form.AppField>
              </div>
            </FormDisabledProvider>
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
                <div key={name} className="md:col-span-3">
                  <form.AppField name={name}>
                    {(f) => (
                      <f.TextField
                        label={label}
                        required={required}
                        maxLength={40}
                        transform={(v) => limpiarNombre(v).slice(0, 40)}
                      />
                    )}
                  </form.AppField>
                </div>
              ))}
            </FormDisabledProvider>

            {/* Sin establecimientos a cargo: su alcance es toda la instalación (Sección 7.3). */}
            <div className="md:col-span-9">
              <form.AppField name="dependencia">
                {(f) => (
                  <f.TextField
                    label="Dependencia"
                    maxLength={150}
                    placeholder="Ej. Secretaría de Educación — Cobertura (informativo)"
                  />
                )}
              </form.AppField>
            </div>
            <form.Field name="activo">
              {(field) => (
                <Interruptor
                  id="administrador-estado"
                  label="Estado"
                  checked={field.state.value}
                  onChange={(v) => field.handleChange(v)}
                  disabled={soloLectura}
                  texto={field.state.value ? "Activo" : "Inactivo: sin acceso"}
                  ayuda="Inactivo pierde el acceso y se cierran sus sesiones."
                  className="md:col-span-3"
                />
              )}
            </form.Field>
          </FormDisabledProvider>
        </form>
          </CardContent>
        </Card>
      </TableScreenBody>
      <ConfirmDiscardDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        onConfirm={() => {
          setConfirmDiscard(false)
          navigate({ to: LISTADO })
        }}
      />
    </TableScreen>
  )
}

// El router carga los componentes por nombre: uno por modo.
export const AdministradorNuevoPage = () => <AdministradorFormPage modo="nuevo" />
export const AdministradorModificarPage = () => <AdministradorFormPage modo="modificar" />
export const AdministradorDetallePage = () => <AdministradorFormPage modo="ver" />

/**
 * Interruptor con la misma caja y etiqueta flotante que los demás campos, para
 * que quepa en la fila; la explicación larga va en el `title` del control.
 */
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
    <Field variant="outlined" data-disabled={disabled || undefined} className={className}>
      <FieldLabel htmlFor={id}>{label}*</FieldLabel>
      <span className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm" title={ayuda}>
        <Switch id={id} size="sm" round checked={checked} disabled={disabled} onCheckedChange={onChange} />
        <span className="truncate text-muted-foreground">{texto}</span>
      </span>
    </Field>
  )
}
