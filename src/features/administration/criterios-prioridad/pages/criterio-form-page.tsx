import { useState } from "react"
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
import { FloppyDiskIcon, PencilIcon, SpinnerIcon, WarningIcon, XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { toSafeTextInput } from "@/lib/text-input"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

import { useEstadoCriterioPrioridad } from "@/features/administration/criterios-prioridad/api/mutations/estado-criterio-prioridad"
import { useSaveCriterioPrioridad } from "@/features/administration/criterios-prioridad/api/mutations/save-criterio-prioridad"
import {
  useCriterioCamposQuery,
  useCriteriosPrioridadQuery,
} from "@/features/administration/criterios-prioridad/api/query/use-criterios-prioridad-query"
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
  BloqueSelect,
  CampoBloqueado,
  EstadoCriterio,
  LabelAyuda,
  ReglaRadios,
  ValoresSelect,
} from "@/features/administration/criterios-prioridad/components/criterio-campos"

const FORM_ID = "criterio-prioridad-form"
const LISTADO = paths.app.criteriosPrioridad.getHref()

export type ModoCriterio = "nuevo" | "modificar" | "ver"

/**
 * S.4.EDI.1–2 y S.4.USO.1: pantalla propia "Criterios de prioridad › [Nuevo
 * criterio o nombre]". Un criterio en uso abre con todo protegido salvo el Estado.
 */
export function CriterioFormPage({ modo }: { modo: ModoCriterio }) {
  const { criterioId } = useParams({ strict: false }) as { criterioId?: string }
  const id = modo === "nuevo" || !criterioId ? null : Number(criterioId)
  // Son pocos: el criterio sale de la lista, que ya está en caché al venir del listado.
  const lista = useCriteriosPrioridadQuery()
  const campos = useCriterioCamposQuery()

  const error = lista.error ?? campos.error
  const criterio = id != null ? (lista.data?.find((c) => c.pkCriterio === id) ?? null) : null
  const cargando = (id != null && lista.isPending) || campos.isPending

  return (
    <NoticeProvider>
      {error ? (
        <ErrorNoticeBanner error={error} />
      ) : cargando ? (
        <Skeleton className="h-96" />
      ) : id != null && !criterio ? (
        <ErrorNoticeBanner error={new Error("El criterio no existe o fue eliminado.")} />
      ) : (
        <CriterioForm
          key={`${modo}-${id ?? "nuevo"}`}
          // En uso nunca se modifica: se abre protegido (S.4.USO.1).
          modo={modo === "modificar" && criterio?.enUso ? "ver" : modo}
          criterio={criterio}
          bloques={campos.data ?? []}
        />
      )}
    </NoticeProvider>
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

function CriterioForm({
  modo,
  criterio,
  bloques,
}: {
  modo: ModoCriterio
  criterio: CriterioPrioridad | null
  bloques: BloqueOpcion[]
}) {
  const navigate = useNavigate()
  const permisos = useMenuPermission("CRITERIOS_PRIORIDAD")
  const [notice, setNotice] = useState<Notice | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const soloLectura = modo === "ver"
  const enUso = Boolean(criterio?.enUso)
  // En uso: todo protegido salvo el Estado (Sección 5). Un "ver" libre no edita nada.
  const estadoEditable = !soloLectura || (enUso && permisos.puedeEditar)
  const conGuardar = !soloLectura || estadoEditable

  const reglaCodigo = new Map(
    bloques.flatMap((b) => b.campos.flatMap((c) => c.reglas.map((r) => [r.pkRegla, r.codigo] as const))),
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

  const bloque = bloques.find((b) => b.codigo === values.bloque)
  const campo = bloque?.campos.find((c) => c.pkCampo === values.campo)
  // Solo bloques con campos evaluables; el del criterio aunque ya no tenga otros.
  const conCampos = bloques.filter((b) => b.campos.length > 0 || b === bloque)

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
      modo === "nuevo" || (modo === "modificar" && JSON.stringify(actuales) !== JSON.stringify(iniciales))
    const cambiaEstado = criterio != null && value.habilitado !== criterio.habilitado
    try {
      if (criterio == null) await save.mutateAsync({ ...datos, habilitado: value.habilitado })
      else if (cambianDatos) await save.mutateAsync({ id: criterio.pkCriterio, ...datos })
      if (cambiaEstado && criterio != null)
        await estado.mutateAsync({ id: criterio.pkCriterio, habilitado: value.habilitado })
      if (cambianDatos || cambiaEstado)
        queueNotice(
          cambianDatos
            ? SUCCESS_MESSAGES.criterioPrioridad.created
            : value.habilitado
              ? SUCCESS_MESSAGES.criterioPrioridad.activated
              : SUCCESS_MESSAGES.criterioPrioridad.deactivated,
        )
      navigate({ to: LISTADO })
    } catch (err) {
      // Nombre repetido (409) llega con el texto del requerimiento desde el back.
      setNotice({ id: Date.now(), message: getErrorMessage(err) })
    }
  }

  function cancelar() {
    if (busy) return
    if (JSON.stringify(form.state.values) !== JSON.stringify(defaultValues)) setConfirmDiscard(true)
    else navigate({ to: LISTADO })
  }

  const conValores = esUnoDe(values.regla)

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" color="neutral" onClick={cancelar}>
                <XIcon data-icon="inline-start" />
                {conGuardar ? "Cancelar" : "Volver"}
              </Button>
              {conGuardar ? (
                <Button size="sm" color="primary" type="submit" form={FORM_ID} disabled={busy} aria-busy={busy}>
                  {busy ? (
                    <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <FloppyDiskIcon data-icon="inline-start" />
                  )}
                  Guardar
                </Button>
              ) : (
                permisos.puedeEditar &&
                criterio && (
                  <Button
                    size="sm"
                    color="primary"
                    onClick={() => navigate({ to: paths.app.criterioPrioridadModificar.getHref(criterio.pkCriterio) })}
                  >
                    <PencilIcon data-icon="inline-start" />
                    Modificar
                  </Button>
                )
              )}
            </div>
          }
        >
          <span className="flex flex-wrap items-center gap-2">
            <span>
              Criterios de prioridad <span className="text-muted-foreground">›</span>{" "}
              {criterio ? criterio.nombre : "Nuevo criterio"}
            </span>
            {enUso && (
              <Badge variant="soft" color="info">
                En uso
              </Badge>
            )}
          </span>
        </TableScreenTitle>
      </TableScreenHeader>
      <TableScreenBody>
        <div className="flex flex-col gap-3">
          {enUso && (
            <p className="flex items-start gap-2 rounded-md border border-yellow-stroke bg-yellow-22 px-3 py-2 text-sm text-yellow">
              <WarningIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              {CRITERIO_EN_USO_MENSAJE}
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
          className="grid gap-x-4 gap-y-5 py-4 md:grid-cols-12"
        >
          {soloLectura && criterio ? (
            <>
              <CampoBloqueado label="Nombre*" valor={criterio.nombre} className="md:col-span-5" />
              <CampoBloqueado label="Descripción" valor={criterio.descripcion ?? ""} className="md:col-span-7" />
              <CampoBloqueado label="Bloque*" valor={bloqueTexto(criterio.campo.bloque)} className="md:col-span-4" />
              <CampoBloqueado label="Campo*" valor={criterio.campo.nombre} className="md:col-span-4" />
              <CampoBloqueado label="Regla*" valor={criterio.regla.nombre} className="md:col-span-4" />
              {criterio.valores.length > 0 && (
                <CampoBloqueado
                  label="Valores*"
                  valor={criterio.valores.map((v) => v.nombre).join(", ")}
                  className="md:col-span-12"
                />
              )}
            </>
          ) : (
            <>
              <div className="md:col-span-5">
                <form.AppField name="nombre">
                  {(f) => (
                    <f.TextField
                      label="Nombre"
                      required
                      maxLength={80}
                      transform={(v) => toSafeTextInput(v, 80)}
                      placeholder="Ej. Talento excepcional"
                    />
                  )}
                </form.AppField>
              </div>
              <div className="md:col-span-7">
                <form.AppField name="descripcion">
                  {(f) => (
                    <f.TextareaField
                      label="Descripción"
                      maxLength={300}
                      transform={(v) => toSafeTextInput(v, 300)}
                      rows={1}
                      placeholder="Para qué sirve el criterio (de 10 a 300 caracteres)"
                    />
                  )}
                </form.AppField>
              </div>
              <div className="md:col-span-6">
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
                  {() => <BloqueSelect bloques={conCampos} />}
                </form.AppField>
              </div>
              <div className="md:col-span-6">
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
                  {(f) => (
                    <f.SelectField
                      label={
                        <LabelAyuda ayuda="Dato del bloque que se evalúa. Si el aspirante no lo tiene, no cumple el criterio.">
                          Campo
                        </LabelAyuda>
                      }
                      required
                      emptyValue={0}
                      disabled={!bloque}
                      placeholder={bloque ? "Seleccione" : "Elija primero el bloque"}
                      options={(bloque?.campos ?? []).map((c) => ({ value: c.pkCampo, label: c.nombre }))}
                    />
                  )}
                </form.AppField>
              </div>
              <div className="md:col-span-12">
                <form.AppField
                  name="regla"
                  listeners={{ onChange: ({ value }) => !esUnoDe(value) && form.setFieldValue("valores", []) }}
                >
                  {() => <ReglaRadios campo={campo} />}
                </form.AppField>
              </div>
              {conValores && (
                <div className="md:col-span-6">
                  <form.AppField name="valores">
                    {() => <ValoresSelect opciones={campo?.valores ?? []} />}
                  </form.AppField>
                </div>
              )}
            </>
          )}
          <div className={conValores && !soloLectura ? "md:col-span-6" : "md:col-span-12"}>
            <form.AppField name="habilitado">{() => <EstadoCriterio disabled={!estadoEditable} />}</form.AppField>
          </div>
          {conGuardar && (
            <p className="text-xs text-muted-foreground md:col-span-12">Los campos marcados con * son obligatorios</p>
          )}
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
export const CriterioNuevoPage = () => <CriterioFormPage modo="nuevo" />
export const CriterioModificarPage = () => <CriterioFormPage modo="modificar" />
export const CriterioDetallePage = () => <CriterioFormPage modo="ver" />
