import { useEffect, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { format, parseISO } from "date-fns"

import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider, queueNotice, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { PersonAddIcon, SpinnerIcon, WarningIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { useMunicipalitiesQuery } from "@/features/establishment/institution/api/query/use-municipalities"
import { findMatriculaUsuarioPorDocumento } from "@/features/coverage/matricula/api/query/use-matricula-usuario-por-documento"
import { useMatriculaFieldConfigQuery } from "@/features/coverage/matricula/api/query/use-matricula-field-config-query"
import {
  useMatriculaAsignaturasPlanQuery,
  useMatriculaAsignaturasQuery,
} from "@/features/coverage/matricula/api/query/use-matricula-asignaturas"
import type { CreateMatriculaInput } from "@/features/coverage/matricula/api/types/matricula"
import type { DepartmentOption } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import { MatriculaAsignaturasSection } from "@/features/coverage/matricula/components/forms/form-create-matricula/asignaturas-section"
import { MatriculaSectionDefaultOpenContext } from "@/features/coverage/matricula/components/forms/form-create-matricula/fields"
import { MatriculaSoportesSection } from "@/features/coverage/matricula/components/forms/form-create-matricula/soportes-section"
import { MatriculaFormBody } from "@/features/coverage/matricula/components/forms/matricula-form-body"
import { useMatriculaValidacionOpciones } from "@/features/coverage/matricula/hooks/use-matricula-validacion-opciones"
import { buildMatriculaFieldSettings } from "@/features/coverage/matricula/utils/matricula-field-settings"
import {
  getMatriculaFieldErrorMessage,
  pickMatriculaErrorField,
  resolveMatriculaMunicipioDepartments,
  validateMatricula,
} from "@/features/coverage/matricula/utils/matricula-form-defaults"

import {
  useAsignarGrupoReserva,
  type SoportePendiente,
} from "@/features/coverage/inscripcion-reservas/api/mutations/asignar-grupo-reserva"
import {
  useGruposDisponiblesQuery,
  useReservaFichaQuery,
  type ReservaFicha as Ficha,
} from "@/features/coverage/inscripcion-reservas/api/query/use-reserva-ficha-query"
import { Aviso, EstadoReservaBadge } from "@/features/coverage/inscripcion-reservas/components/reserva-ui"
import { ReservaEntranteDetalle } from "@/features/coverage/inscripcion-reservas/components/ficha/reserva-entrante-detalle"
import { SeccionMatriculaReserva } from "@/features/coverage/inscripcion-reservas/components/ficha/seccion-matricula-reserva"
import { SoportesReservaSection } from "@/features/coverage/inscripcion-reservas/components/ficha/soportes-reserva-section"

export type ModoFicha = "detalle" | "asignar"

// Secciones 2 a 9: sin autorización de datos (Regla 81) no se editan y sus faltantes no frenan.
const BLOQUES_ESTUDIANTE = /^(student|benefits|complementary|conflict|origin|previous|welfare)-/

/** Lo que cuenta como «editado»: las secciones 2 a 13 (la 1, los soportes y las asignaturas van aparte). */
const datosEditables = (v: CreateMatriculaInput) => JSON.stringify({ ...v, academic: undefined, asignaturas: undefined })

const VOLVER = { to: paths.app.coberturaInscritos.getHref(), search: { tab: "reservas" as const } }

/**
 * Ver detalle y Asignar grupo de una reserva (Cobertura 3.6): el formulario de matrícula precargado
 * con la matrícula anterior (o la generada, si ya está Matriculada). En Ver detalle todo es de solo
 * lectura; Asignar grupo deja elegir grupo y especialidad y revisar las secciones 3 a 15.
 */
export function ReservaFichaScreen({ reservaId, modo }: { reservaId: string; modo: ModoFicha }) {
  return (
    <NoticeProvider>
      <ReservaFichaContent reservaId={reservaId} modo={modo} />
    </NoticeProvider>
  )
}

function ReservaFichaContent({ reservaId, modo }: { reservaId: string; modo: ModoFicha }) {
  const { data, isPending, isError, error } = useReservaFichaQuery(reservaId)

  if (isPending) {
    return (
      <TableScreen>
        <TableScreenBody>
          <Skeleton className="h-96 w-full" />
        </TableScreenBody>
      </TableScreen>
    )
  }
  if (isError) {
    return (
      <TableScreen>
        <TableScreenBody>
          <p className="p-10 text-center text-sm text-red">{getErrorMessage(error)}</p>
        </TableScreenBody>
      </TableScreen>
    )
  }
  if (data.entrante) return <ReservaEntranteDetalle reserva={data.reserva} />
  return <FichaFormulario key={`${reservaId}-${modo}`} ficha={data} modo={modo} />
}

function FichaFormulario({ ficha, modo }: { ficha: Ficha; modo: ModoFicha }) {
  const { reserva, details, sinAutorizacion } = ficha
  const navigate = useNavigate()
  const { notify } = useNotify()
  const { puedeEditar, isLoading: permisoCargando } = useMenuPermission("INSCRIPCIONES")
  const asignable = reserva.estado === "RESERVADA"
  const asignar = modo === "asignar" && asignable
  const generada = reserva.fkTmatriculaGenerada != null ? String(reserva.fkTmatriculaGenerada) : undefined

  // Asignar grupo sin permiso o sobre una reserva que ya no está Reservada: al detalle.
  useEffect(() => {
    if (modo === "asignar" && ((!permisoCargando && !puedeEditar) || !asignable)) {
      navigate({ to: paths.app.coberturaReservaDetalle.getHref(reserva.id), replace: true })
    }
  }, [modo, permisoCargando, puedeEditar, asignable, navigate, reserva.id])

  const { data: municipalities = [] } = useMunicipalitiesQuery()
  const departments: DepartmentOption[] = (() => {
    const porDepto = new Map<string, DepartmentOption["municipalities"]>()
    for (const m of municipalities) {
      const lista = porDepto.get(m.department.name) ?? []
      lista.push({ id: m.id, name: m.name })
      porDepto.set(m.department.name, lista)
    }
    return Array.from(porDepto, ([name, municipalities]) => ({ name, municipalities }))
  })()

  const { data: fieldConfig } = useMatriculaFieldConfigQuery({ establecimientoId: reserva.establecimientoId })
  const fieldSettings = fieldConfig ? buildMatriculaFieldSettings(fieldConfig) : undefined
  const validacion = useMatriculaValidacionOpciones()

  // Se siembra una vez, con los municipios ya cargados (resuelven el departamento de cada campo).
  const [values, setValues] = useState<CreateMatriculaInput | null>(null)
  const [inicial, setInicial] = useState<CreateMatriculaInput | null>(null)
  if (values === null && municipalities.length > 0) {
    const base = resolveMatriculaMunicipioDepartments(details, municipalities)
    const sembrado = { ...base, academic: { ...base.academic, mediaTecnicaExterna: false, institucionExterna: "" } }
    setValues(sembrado)
    setInicial(sembrado)
  }

  const [grupoId, setGrupoId] = useState("")
  const [especialidadId, setEspecialidadId] = useState(details.academic.specialty ?? "")
  const [pendientes, setPendientes] = useState<SoportePendiente[]>([])
  const [faltantes, setFaltantes] = useState<string[]>([])
  const [intento, setIntento] = useState(false)
  const [descartando, setDescartando] = useState(false)

  const grupos = useGruposDisponiblesQuery(reserva.id, asignar)
  const plan = useMatriculaAsignaturasPlanQuery(asignar && grupoId ? Number(grupoId) : null)
  const asignadas = useMatriculaAsignaturasQuery(asignar ? undefined : generada)
  const listaAsignaturas = asignar ? (plan.data ?? []) : (asignadas.data?.asignaturas ?? [])
  const cargandoAsignaturas = asignar ? plan.isFetching : asignadas.isFetching
  const mutacion = useAsignarGrupoReserva()

  // Mientras sea el mismo acudiente, su identidad queda protegida; otro documento lo reemplaza (2.10).
  const acudienteInicial = inicial?.guardian
  const acudienteReemplazado =
    Boolean(acudienteInicial?.documentNumber) &&
    (values?.guardian.documentType !== acudienteInicial?.documentType ||
      values?.guardian.documentNumber !== acudienteInicial?.documentNumber)
  const tipoDocAcudiente = values?.guardian.documentType ?? ""
  const docAcudiente = values?.guardian.documentNumber ?? ""
  useEffect(() => {
    if (!asignar || !acudienteReemplazado) return
    const tipo = Number(tipoDocAcudiente)
    const numero = docAcudiente.trim()
    if (!tipo || numero.length < 6) return
    let cancelado = false
    const espera = setTimeout(() => {
      findMatriculaUsuarioPorDocumento(tipo, numero)
        .then((encontrado) => {
          if (cancelado || !encontrado) return
          setValues((prev) =>
            prev
              ? {
                  ...prev,
                  guardian: {
                    ...prev.guardian,
                    firstName: encontrado.firstName,
                    secondName: encontrado.secondName,
                    lastName: encontrado.lastName,
                    secondLastName: encontrado.secondLastName,
                    gender: encontrado.gender,
                  },
                  guardianContact: { ...prev.guardianContact, phone: encontrado.phone, email: encontrado.email },
                }
              : prev,
          )
        })
        .catch(() => {})
    }, 600)
    return () => {
      cancelado = true
      clearTimeout(espera)
    }
  }, [asignar, acudienteReemplazado, tipoDocAcudiente, docAcudiente])

  const editado = values != null && inicial != null && datosEditables(values) !== datosEditables(inicial)
  const sucio =
    editado ||
    Boolean(grupoId) ||
    especialidadId !== (details.academic.specialty ?? "") ||
    pendientes.length > 0 ||
    Object.keys(values?.asignaturas ?? {}).length > 0

  /** Faltantes del formulario: solo si se editó (lo precargado se asigna tal como viene). */
  function calcularFaltantes(v: CreateMatriculaInput) {
    if (!editado) return []
    return validateMatricula(v, undefined, fieldSettings, undefined, validacion).filter(
      (id) =>
        !id.startsWith("matricula-") &&
        !id.startsWith("student-") &&
        !(sinAutorizacion && BLOQUES_ESTUDIANTE.test(id)),
    )
  }

  function cambiar(v: CreateMatriculaInput) {
    setValues(v)
    if (intento) setFaltantes(calcularFaltantes(v))
  }

  function guardar() {
    if (!values || mutacion.isPending) return
    setIntento(true)
    const f = calcularFaltantes(values)
    setFaltantes(f)
    if (!grupoId) {
      return notify("Elija el grupo al que se asigna la reserva.", { variant: "error" })
    }
    if (f.length > 0) {
      return notify(getMatriculaFieldErrorMessage(pickMatriculaErrorField(f, values), values), {
        variant: "error",
        autoCloseMs: 0,
      })
    }
    mutacion.mutate(
      {
        reservaId: reserva.id,
        grupoId: Number(grupoId),
        especialidadId: especialidadId ? Number(especialidadId) : null,
        values: { ...values, academic: { ...values.academic, specialty: especialidadId } },
        editado,
        contexto: {
          pkTpadre: details.pkTpadre,
          pkUsuarioEstudiante: details.pkUsuarioEstudiante,
          pkUsuarioAcudiente: details.pkUsuarioAcudiente,
          guardianReplaced: acudienteReemplazado,
          sinAutorizacion,
        },
        soportes: pendientes,
      },
      {
        onSuccess: ({ matriculaId, pendientes: noGuardado }) => {
          if (noGuardado.length > 0) {
            queueNotice(
              `Se asignó el grupo y se creó la matrícula de ${reserva.estudiante}, pero no se guardó: ` +
                `${noGuardado.join("; ")}. Complételo aquí.`,
              { variant: "error", autoCloseMs: 0 },
            )
            return navigate({ to: paths.app.coberturaMatriculaEditar.getHref(matriculaId) })
          }
          queueNotice(`Se asignó el grupo y se creó la matrícula de ${reserva.estudiante}.`, { variant: "success" })
          navigate(VOLVER)
        },
        onError: (e) => notify(getErrorMessage(e), { variant: "error" }),
      },
    )
  }

  const cancelar = () => (asignar && sucio ? setDescartando(true) : navigate(VOLVER))
  const limite = reserva.fechaLimiteMatricula ? format(parseISO(reserva.fechaLimiteMatricula), "dd/MM/yyyy") : null

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                color="neutral"
                size="sm"
                disabled={mutacion.isPending}
                onClick={cancelar}
              >
                {asignar ? "Cancelar" : "Cerrar"}
              </Button>
              {asignar ? (
                <Button type="button" size="sm" disabled={mutacion.isPending || !values} onClick={guardar}>
                  {mutacion.isPending ? (
                    <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <PersonAddIcon data-icon="inline-start" />
                  )}
                  Asignar grupo
                </Button>
              ) : asignable && puedeEditar ? (
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link to={paths.app.coberturaReservaAsignarGrupo.getHref(reserva.id)} />}
                >
                  <PersonAddIcon data-icon="inline-start" />
                  Asignar grupo
                </Button>
              ) : generada ? (
                <Button
                  size="sm"
                  variant="outline"
                  color="primary"
                  nativeButton={false}
                  render={<Link to={paths.app.coberturaMatriculaDetalle.getHref(generada)} />}
                >
                  Ver matrícula
                </Button>
              ) : null}
            </div>
          }
        >
          <span className="inline-flex flex-wrap items-center gap-2">
            Inscripción y reservas › {asignar ? "Asignar grupo" : "Ver detalle"} — {reserva.estudiante}
            <EstadoReservaBadge estado={reserva.estado} />
          </span>
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        {values == null ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="flex flex-col gap-4 [counter-reset:seccion]">
            <Aviso tono="info">
              Período {reserva.ciclo} {reserva.estadoPeriodo}
              {limite ? ` · Fecha límite de matrícula: ${limite}` : ""}.
            </Aviso>
            {ficha.fuente === "INSCRIPCION" ? (
              <Aviso tono="info">
                Estudiante nuevo: no tiene matrícula anterior. Se precargan el estudiante y el acudiente de la
                inscripción; el resto se diligencia aquí.
              </Aviso>
            ) : null}
            {sinAutorizacion ? (
              <div
                role="status"
                className="flex items-start gap-3 rounded-md border border-yellow-stroke bg-yellow-22 px-4 py-3 text-sm"
              >
                <WarningIcon className="size-5 shrink-0 text-yellow" aria-hidden />
                <p>
                  Falta la autorización de tratamiento de datos del acudiente en este establecimiento. Los datos
                  del estudiante (secciones 2 a 9) se ven protegidos y no se editan; se copian tal como están.
                </p>
              </div>
            ) : null}

            <MatriculaSectionDefaultOpenContext.Provider value={false}>
              <MatriculaFormBody
                values={values}
                onChange={cambiar}
                departments={departments}
                invalidFields={faltantes}
                fieldSettings={fieldSettings}
                disabled={!asignar}
                datosProtegidos={sinAutorizacion}
                precargado={asignar}
                studentDisabled
                studentIdentityDisabled
                guardianIdentityDisabled={!acudienteReemplazado}
                academicSection={
                  <SeccionMatriculaReserva
                    reserva={reserva}
                    soloLectura={!asignar}
                    grupos={grupos.data ?? []}
                    grupoId={grupoId}
                    onGrupo={(id) => {
                      setGrupoId(id)
                      // Otro grupo, otro plan: los cambios de asignaturas eran del anterior.
                      setValues((prev) => (prev ? { ...prev, asignaturas: undefined } : prev))
                    }}
                    especialidadId={especialidadId}
                    onEspecialidad={setEspecialidadId}
                    grupoInvalido={intento && !grupoId}
                  />
                }
              />
              {!asignar && generada ? (
                <MatriculaSoportesSection matriculaId={generada} editable={false} />
              ) : (
                <SoportesReservaSection
                  soportes={ficha.soportes}
                  pendientes={pendientes}
                  onPendientes={setPendientes}
                  editable={asignar}
                  onRechazo={(m) => notify(m, { variant: "error" })}
                />
              )}
              <MatriculaAsignaturasSection
                asignaturas={listaAsignaturas}
                cambios={values.asignaturas ?? {}}
                onChange={(cambios) => setValues((prev) => (prev ? { ...prev, asignaturas: cambios } : prev))}
                mediaTecnicaExterna={false}
                institucionExterna=""
                sinGrupo={asignar ? !grupoId : !generada}
                isLoading={cargandoAsignaturas}
                estudiante={reserva.estudiante}
                disabled={!asignar}
              />
            </MatriculaSectionDefaultOpenContext.Provider>
          </div>
        )}
      </TableScreenBody>

      <ConfirmDiscardDialog open={descartando} onOpenChange={setDescartando} onConfirm={() => navigate(VOLVER)} />
    </TableScreen>
  )
}
