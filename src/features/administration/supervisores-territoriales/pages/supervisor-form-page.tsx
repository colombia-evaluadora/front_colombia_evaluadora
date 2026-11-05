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
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, InfoIcon, PencilIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { FormDisabledProvider, isFieldInvalid, useAppForm } from "@/lib/forms"
import { supervisorSaveNotice } from "@/lib/success-messages"
import { toDigitsOnly, toEmailInput } from "@/lib/text-input"
import { cn } from "@/lib/utils"
import { SelectorChips } from "@/features/comunicaciones/chat/components/selector-chips"
import { limpiarNombre } from "@/features/establishment/shared/person-field-rules"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { usePersonaPorDocumentoQuery } from "@/features/administration/superadministradores/api/query/use-persona-por-documento"

import { useSaveSupervisor } from "@/features/administration/supervisores-territoriales/api/mutations/supervisor-mutations"
import {
  useCatalogosSupervisorQuery,
  useSupervisorQuery,
} from "@/features/administration/supervisores-territoriales/api/query/use-supervisores-query"
import {
  supervisorFormSchema,
  type SupervisorFormValues,
} from "@/features/administration/supervisores-territoriales/api/schema"
import type {
  CatalogosSupervisor,
  EstablecimientoOpcion,
  SupervisorTerritorial,
} from "@/features/administration/supervisores-territoriales/api/types/supervisor"

const FORM_ID = "supervisor-territorial-form"
const LISTADO = paths.app.supervisoresTerritoriales.getHref()

export type ModoSupervisor = "nuevo" | "modificar" | "ver"

/**
 * S.7.EDI.1 (nuevo), S.7.EDI.2 (modificar) y Ver detalle: pantalla propia
 * "Supervisores territoriales › [Nuevo Supervisor territorial o nombre]" (Sección 7.2).
 */
export function SupervisorFormPage({ modo }: { modo: ModoSupervisor }) {
  const { supervisorId } = useParams({ strict: false }) as { supervisorId?: string }
  const id = modo === "nuevo" || !supervisorId ? null : Number(supervisorId)
  const supervisor = useSupervisorQuery(id)
  const catalogos = useCatalogosSupervisorQuery()

  const error = supervisor.error ?? catalogos.error
  const cargando = (id != null && supervisor.isPending) || catalogos.isPending

  return (
    <NoticeProvider>
      {error ? (
        <ErrorNoticeBanner error={error} />
      ) : cargando ? (
        <Skeleton className="h-96" />
      ) : (
        <SupervisorForm
          key={`${modo}-${id ?? "nuevo"}`}
          modo={modo}
          actual={id != null ? (supervisor.data ?? null) : null}
          catalogos={catalogos.data ?? { tiposDocumento: [], establecimientos: [] }}
        />
      )}
    </NoticeProvider>
  )
}

function toValues(s: SupervisorTerritorial | null): SupervisorFormValues {
  return {
    tipoDocumento: s?.tipoDocumento?.pk ?? 0,
    numeroDocumento: s?.numeroDocumento ?? "",
    primerNombre: s?.primerNombre ?? "",
    segundoNombre: s?.segundoNombre ?? "",
    primerApellido: s?.primerApellido ?? "",
    segundoApellido: s?.segundoApellido ?? "",
    correo: s?.correo ?? "",
    dependencia: s?.dependencia ?? "",
    todosEstablecimientos: s?.todosEstablecimientos ?? false,
    establecimientos: s?.establecimientos.map((e) => e.pk) ?? [],
    activo: s?.activo ?? true,
  }
}

function SupervisorForm({
  modo,
  actual,
  catalogos,
}: {
  modo: ModoSupervisor
  actual: SupervisorTerritorial | null
  catalogos: CatalogosSupervisor
}) {
  const navigate = useNavigate()
  const permisos = useMenuPermission("SUPERVISORES_TERRITORIALES")
  const [notice, setNotice] = useState<Notice | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const save = useSaveSupervisor()

  const soloLectura = modo === "ver"
  const { tiposDocumento: tipos } = catalogos
  const esNumerico = (pk: number) => tipos.find((t) => t.pk === pk)?.numerico ?? false
  const defaultValues = toValues(actual)

  // Un establecimiento a cargo que ya no está activo sigue visible hasta que se quite.
  const opciones: EstablecimientoOpcion[] = [
    ...catalogos.establecimientos,
    ...(actual?.establecimientos ?? [])
      .filter((e) => !catalogos.establecimientos.some((o) => o.pk === e.pk))
      .map((e) => ({ pk: e.pk, nombre: `${e.nombre} (inactivo)`, codigoDane: null })),
  ]

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: supervisorFormSchema(esNumerico) },
    onSubmit: async ({ value }) => {
      try {
        const result = await save.mutateAsync({
          id: actual?.pkSupervisor,
          tipoDocumento: value.tipoDocumento,
          numeroDocumento: value.numeroDocumento.trim().toUpperCase(),
          primerNombre: value.primerNombre.trim(),
          segundoNombre: value.segundoNombre.trim() || null,
          primerApellido: value.primerApellido.trim(),
          segundoApellido: value.segundoApellido.trim() || null,
          correo: toEmailInput(value.correo).toLowerCase(),
          dependencia: value.dependencia.trim() || null,
          todosEstablecimientos: value.todosEstablecimientos,
          establecimientos: value.establecimientos,
          activo: value.activo,
        })
        const aviso = supervisorSaveNotice(result, actual == null)
        queueNotice(aviso.message, { variant: aviso.variant })
        navigate({ to: LISTADO })
      } catch (err) {
        // Documento o correo repetidos (409) llegan con el texto de la Sección 7.2.
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
  const consulta = usePersonaPorDocumentoQuery(tipo, numeroBuscado, modo === "nuevo")
  const persona = consulta.data && numeroBuscado === numeroDoc ? consulta.data : null
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
                    onClick={() => navigate({ to: paths.app.supervisorTerritorialModificar.getHref(actual.pkSupervisor) })}
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
              Supervisores territoriales <span className="text-muted-foreground">›</span>{" "}
              {actual ? actual.nombre : "Nuevo Supervisor territorial"}
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
        <div className="flex max-w-6xl flex-col gap-3">
          {modo === "nuevo" && (
            <p className="flex items-start gap-2 rounded-md bg-blue-22 px-3 py-2 text-sm text-blue">
              <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              Se enviará un enlace de un solo uso, válido por 48 horas, para que establezca su contraseña.
            </p>
          )}
          {persona && (
            <p className="flex items-start gap-2 rounded-md bg-blue-22 px-3 py-2 text-sm text-blue">
              <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              Esta persona ya tiene cuenta en la plataforma: se le agregará el rol de Supervisor territorial
              {persona.correo ? ` con su cuenta actual (${persona.correo})` : ""}, sin crear otra.
            </p>
          )}
          <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant="error" />
        </div>

        <form
          id={FORM_ID}
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid max-w-6xl gap-x-6 gap-y-5 py-4 md:grid-cols-4"
        >
          <FormDisabledProvider disabled={soloLectura}>
            <div className="md:col-span-2">
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
            <div className="md:col-span-2">
              <form.AppField name="numeroDocumento">
                {(f) => (
                  <f.TextField
                    label="Número de documento"
                    required
                    maxLength={20}
                    inputMode={numerico ? "numeric" : "text"}
                    transform={(v) => (numerico ? toDigitsOnly(v, 20) : v.replace(/[^A-Za-z0-9]/g, "").toUpperCase())}
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
            </div>

            {/* Persona existente: nombres y correo son los suyos, no se editan aquí. */}
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
                      maxLength={40}
                      transform={(v) => limpiarNombre(v).slice(0, 40)}
                    />
                  )}
                </form.AppField>
              ))}
              <div className="md:col-span-2">
                <form.AppField name="correo">
                  {(f) => (
                    <f.TextField
                      label="Correo electrónico"
                      required
                      type="email"
                      maxLength={120}
                      autoComplete="off"
                      transform={toEmailInput}
                      description={
                        modo === "modificar"
                          ? "Si lo cambia, la cuenta vuelve a pendiente y se envía el enlace al correo nuevo."
                          : "Con este correo inicia sesión."
                      }
                    />
                  )}
                </form.AppField>
              </div>
            </FormDisabledProvider>

            <form.Field name="activo">
              {(field) => (
                <Interruptor
                  id="supervisor-estado"
                  label="Estado"
                  checked={field.state.value}
                  onChange={(v) => field.handleChange(v)}
                  disabled={soloLectura}
                  texto={field.state.value ? "Activo" : "Inactivo"}
                  ayuda={
                    field.state.value
                      ? "Si lo inactiva, pierde el acceso y se cierran sus sesiones."
                      : "No puede ingresar a la plataforma."
                  }
                  className="md:col-span-2"
                />
              )}
            </form.Field>

            <div className="md:col-span-4">
              <form.AppField name="dependencia">
                {(f) => (
                  <f.TextField
                    label="Dependencia"
                    maxLength={150}
                    placeholder="Ej. Secretaría de Educación — Núcleo 3"
                    description="Dato informativo: no concede permisos."
                  />
                )}
              </form.AppField>
            </div>

            <form.Field name="todosEstablecimientos">
              {(field) => (
                <Interruptor
                  id="supervisor-todos"
                  label="Todos los establecimientos"
                  checked={field.state.value}
                  onChange={(v) => field.handleChange(v)}
                  disabled={soloLectura}
                  texto={field.state.value ? "Sí" : "No"}
                  ayuda="Encendido da acceso también a los establecimientos que se creen después."
                  className="md:col-span-4"
                />
              )}
            </form.Field>

            <form.Subscribe selector={(st) => st.values.todosEstablecimientos}>
              {(todos) =>
                !todos && (
                  <form.Field name="establecimientos">
                    {(field) => {
                      const invalido = isFieldInvalid(field, form.state.submissionAttempts)
                      const seleccion = opciones.filter((o) => field.state.value.includes(o.pk))
                      return (
                        <div className="flex flex-col gap-1.5 md:col-span-4">
                          <span className="text-sm">
                            Establecimientos a cargo<span className="text-red"> *</span>
                          </span>
                          {soloLectura ? (
                            <p className="text-sm">{seleccion.map((e) => e.nombre).join(", ") || "—"}</p>
                          ) : (
                            <SelectorChips
                              items={opciones}
                              value={seleccion}
                              onChange={(v) => field.handleChange(v.map((e) => e.pk))}
                              getId={(e) => e.pk}
                              getLabel={(e) => e.nombre}
                              filtrar={(e, q) =>
                                e.nombre.toLowerCase().includes(q) || (e.codigoDane ?? "").includes(q)
                              }
                              visibles={6}
                              placeholder="Buscar por nombre o código DANE"
                              ariaLabel="Establecimientos a cargo"
                              invalido={invalido}
                              conFlecha
                            />
                          )}
                          {invalido ? (
                            <span className="text-xs text-red">{String(field.state.meta.errors[0]?.message ?? field.state.meta.errors[0])}</span>
                          ) : (
                            !soloLectura && (
                              <span className="text-xs text-muted-foreground">
                                Solo establecimientos activos. Al quitar uno, pierde el acceso a él de inmediato.
                              </span>
                            )
                          )}
                        </div>
                      )
                    }}
                  </form.Field>
                )
              }
            </form.Subscribe>
          </FormDisabledProvider>
        </form>
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
export const SupervisorNuevoPage = () => <SupervisorFormPage modo="nuevo" />
export const SupervisorModificarPage = () => <SupervisorFormPage modo="modificar" />
export const SupervisorDetallePage = () => <SupervisorFormPage modo="ver" />

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
    <div className={cn("flex flex-col gap-2 text-sm", className)}>
      <label htmlFor={id}>
        {label}
        <span className="text-red"> *</span>
      </label>
      <span className="flex items-center gap-2">
        <Switch id={id} size="sm" round checked={checked} disabled={disabled} onCheckedChange={onChange} />
        <span className="text-muted-foreground">{texto}</span>
      </span>
      <span className="text-xs text-muted-foreground">{ayuda}</span>
    </div>
  )
}
