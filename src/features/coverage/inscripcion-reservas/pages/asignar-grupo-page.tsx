import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { z } from "zod"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { FloppyDiskIcon, XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { useAppForm } from "@/lib/forms"
import { required } from "@/lib/forms/messages"
import { coberturaReservaAsignarGrupoRoute } from "@/router"

import { useMunicipalitiesQuery } from "@/features/establishment/institution/api/query/use-municipalities"
import type { CreateMatriculaInput } from "@/features/coverage/matricula/api/types/matricula"
import {
  MatriculaBenefitsSection,
  MatriculaComplementarySection,
  MatriculaConflictVictimSection,
  MatriculaContactSection,
  MatriculaGuardianEmploymentSection,
  MatriculaGuardianSection,
  MatriculaOriginSectorSection,
  MatriculaPreviousYearSection,
  MatriculaResidenceSection,
  MatriculaStudentSection,
  type DepartmentOption,
} from "@/features/coverage/matricula/components/forms/form-create-matricula"
import { MatriculaSupportFilesSection } from "@/features/coverage/matricula/components/forms/form-create-matricula/support-files-sheet"
import {
  createEmptySupportFiles,
  createInitialMatriculaValues,
} from "@/features/coverage/matricula/utils/matricula-form-defaults"

import { useAsignarGrupo } from "@/features/coverage/inscripcion-reservas/api/mutations/acciones-reserva"
import {
  useCatalogosAccionesQuery,
  useGruposConCupoQuery,
  useReservaDetalleQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-reserva-detalle-query"
import type { ReservaCupoDetalle } from "@/features/coverage/inscripcion-reservas/api/types/reserva-cupo"
import {
  CampoLectura,
  Rejilla,
  Seccion,
  Secciones,
  SeccionMatricula,
} from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

const FORM_ID = "asignar-grupo-form"

const schema = z.object({
  grupoId: z.string().min(1, required("El grupo")),
  especialidad: z.string(),
  mediaTecnicaExterna: z.boolean(),
})

/**
 * Asignar grupo (Cobertura, Sección 3.6): crea la matrícula en Cursando desde
 * la reserva. Sede, jornada, período y grado salen de la reserva y no se
 * cambian aquí; el resto del formulario es el de la matrícula.
 */
export function AsignarGrupoPage() {
  const { reservaId } = coberturaReservaAsignarGrupoRoute.useParams()
  const { data, isPending, isError, error } = useReservaDetalleQuery(reservaId)

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
  return <AsignarGrupoForm reserva={data} />
}

function valoresIniciales(r: ReservaCupoDetalle): CreateMatriculaInput {
  const base = createInitialMatriculaValues()
  const [firstName = "", lastName = "", secondLastName = ""] = r.estudiante.split(" ")
  return {
    ...base,
    student: {
      ...base.student,
      documentType: r.tipoDocumento,
      documentNumber: r.documento,
      firstName,
      lastName,
      secondLastName,
    },
  }
}

function AsignarGrupoForm({ reserva }: { reserva: ReservaCupoDetalle }) {
  const navigate = useNavigate()
  const volver = () => navigate({ to: paths.app.coberturaInscritos.getHref() })

  const { data: grupos = [] } = useGruposConCupoQuery(reserva.id)
  const { data: catalogos } = useCatalogosAccionesQuery()
  const { data: municipalities = [] } = useMunicipalitiesQuery()
  const asignar = useAsignarGrupo()

  const [matricula, setMatricula] = useState(() => valoresIniciales(reserva))
  const [soportes, setSoportes] = useState(createEmptySupportFiles)

  const departments: DepartmentOption[] = (() => {
    const byName = new Map<string, DepartmentOption["municipalities"]>()
    for (const m of municipalities) {
      const list = byName.get(m.department.name) ?? []
      list.push({ id: m.id, name: m.name })
      byName.set(m.department.name, list)
    }
    return Array.from(byName, ([name, municipalities]) => ({ name, municipalities }))
  })()

  const form = useAppForm({
    defaultValues: { grupoId: "", especialidad: "", mediaTecnicaExterna: false },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) =>
      asignar.mutateAsync(
        {
          id: reserva.id,
          grupoId: value.grupoId,
          especialidad: value.especialidad || null,
          mediaTecnicaExterna: value.mediaTecnicaExterna,
        },
        {
          onSuccess: () => {
            toast.success(`Se asignó el grupo y se creó la matrícula de ${reserva.estudiante}.`)
            volver()
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      ),
  })

  const [anio, , modalidad] = reserva.periodoAcademico.split(" · ")
  const ciclo = reserva.periodo.split(" · ")[2] ?? "Ciclo 1"

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                color="neutral"
                disabled={asignar.isPending}
                onClick={volver}
              >
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
              <Button type="submit" form={FORM_ID} disabled={asignar.isPending}>
                {asignar.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <FloppyDiskIcon data-icon="inline-start" />
                )}
                Guardar
              </Button>
            </div>
          }
        >
          Asignar grupo — {reserva.estudiante}
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <form
          id={FORM_ID}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <Secciones abiertas={["matricula"]}>
            <Seccion value="matricula" titulo="Información de matrícula">
              <div className="grid gap-5">
                <Rejilla>
                  <CampoLectura id="sede" label="Sede" required value={reserva.sede} />
                  <CampoLectura
                    id="anio"
                    label="Año"
                    value={anio}
                    description="No se puede modificar."
                  />
                  <CampoLectura id="jornada" label="Jornada" required value={reserva.jornada} />
                  <CampoLectura
                    id="periodo"
                    label="Período (modalidad y ciclo)"
                    value={`${modalidad} · ${ciclo}`}
                    description="No se puede modificar."
                  />
                  <CampoLectura
                    id="grado"
                    label="Grado"
                    required
                    value={reserva.grado}
                    description="Grado de la reserva."
                  />
                  <form.AppField name="grupoId">
                    {(f) => (
                      <f.SelectField
                        label="Grupo"
                        required
                        placeholder="Seleccionar"
                        description={`Solo grupos de ${reserva.grado} con cupo.`}
                        options={grupos.map((g) => ({
                          value: g.id,
                          label: `${g.codigo} · ${g.cuposDisponibles} cupos`,
                        }))}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="especialidad">
                    {(f) => (
                      <f.SelectField
                        label="Carácter/Especialidad/Énfasis"
                        placeholder="Seleccionar"
                        clearable
                        options={(catalogos?.especialidades ?? []).map((e) => ({
                          value: e,
                          label: e,
                        }))}
                      />
                    )}
                  </form.AppField>
                  <CampoLectura
                    id="tipo"
                    label="Tipo de matrícula"
                    value="Principal"
                    description="No se puede modificar."
                  />
                </Rejilla>
                <form.Field name="mediaTecnicaExterna">
                  {(f) => (
                    <div className="grid gap-2">
                      <span className="text-sm font-medium">
                        ¿Media técnica en institución externa?
                      </span>
                      <label className="flex w-fit cursor-pointer items-center gap-2">
                        <Switch
                          checked={f.state.value}
                          onCheckedChange={f.handleChange}
                          className="rounded-full [&_[data-slot=switch-thumb]]:rounded-full"
                        />
                        <span className="text-sm">{f.state.value ? "Sí" : "No"}</span>
                      </label>
                    </div>
                  )}
                </form.Field>
              </div>
            </Seccion>

            <SeccionMatricula value="estudiante" titulo="Información del estudiante">
              <MatriculaStudentSection
                value={matricula.student}
                onChange={(student) => setMatricula({ ...matricula, student })}
                departments={departments}
              />
            </SeccionMatricula>
            <SeccionMatricula value="domicilio" titulo="Domicilio del estudiante">
              <MatriculaResidenceSection
                title="Domicilio del estudiante"
                addressLabel="Dirección del estudiante"
                departmentLabel="Lugar de residencia departamento estudiante"
                municipalityLabel="Lugar de residencia municipio estudiante"
                idPrefix="student-residence"
                value={matricula.studentAddress}
                onChange={(studentAddress) => setMatricula({ ...matricula, studentAddress })}
                departments={departments}
              />
            </SeccionMatricula>
            <SeccionMatricula value="contacto" titulo="Información de contacto del estudiante">
              <MatriculaContactSection
                title="Información de contacto del estudiante"
                idPrefix="student-contact"
                phoneLabel="Teléfono de estudiante"
                emailLabel="Email estudiante"
                value={matricula.studentContact}
                onChange={(studentContact) => setMatricula({ ...matricula, studentContact })}
              />
            </SeccionMatricula>
            <SeccionMatricula value="anio-anterior" titulo="Información académica del año anterior">
              <MatriculaPreviousYearSection
                value={matricula.previousYear}
                onChange={(previousYear) => setMatricula({ ...matricula, previousYear })}
              />
            </SeccionMatricula>
            <SeccionMatricula value="sector" titulo="Sector de origen">
              <MatriculaOriginSectorSection
                value={matricula.originSector}
                onChange={(originSector) => setMatricula({ ...matricula, originSector })}
              />
            </SeccionMatricula>
            <SeccionMatricula value="victima" titulo="Víctima conflicto armado">
              <MatriculaConflictVictimSection
                value={matricula.conflictVictim}
                departments={departments}
                onChange={(conflictVictim) => setMatricula({ ...matricula, conflictVictim })}
              />
            </SeccionMatricula>
            <SeccionMatricula value="complementaria" titulo="Información complementaria">
              <MatriculaComplementarySection
                value={matricula.complementary}
                onChange={(complementary) => setMatricula({ ...matricula, complementary })}
              />
            </SeccionMatricula>
            <SeccionMatricula value="subsidio" titulo="Subsidio o beneficios">
              <MatriculaBenefitsSection
                value={matricula.benefits}
                onChange={(benefits) => setMatricula({ ...matricula, benefits })}
              />
            </SeccionMatricula>
            <SeccionMatricula value="acudiente" titulo="Información del acudiente">
              <MatriculaGuardianSection
                value={matricula.guardian}
                onChange={(guardian) => setMatricula({ ...matricula, guardian })}
                departments={departments}
              />
            </SeccionMatricula>
            <SeccionMatricula value="domicilio-acudiente" titulo="Domicilio del acudiente">
              <MatriculaResidenceSection
                title="Domicilio del acudiente"
                addressLabel="Dirección de acudiente"
                departmentLabel="Lugar de residencia departamento acudiente"
                municipalityLabel="Lugar de residencia municipio acudiente"
                idPrefix="guardian-residence"
                value={matricula.guardianAddress}
                onChange={(guardianAddress) => setMatricula({ ...matricula, guardianAddress })}
                departments={departments}
              />
            </SeccionMatricula>
            <SeccionMatricula
              value="contacto-acudiente"
              titulo="Información de contacto del acudiente"
            >
              <MatriculaContactSection
                title="Información de contacto de acudiente"
                idPrefix="guardian-contact"
                phoneLabel="Teléfono de acudiente"
                emailLabel="Email acudiente"
                value={matricula.guardianContact}
                onChange={(guardianContact) => setMatricula({ ...matricula, guardianContact })}
              />
            </SeccionMatricula>
            <SeccionMatricula value="laboral" titulo="Información laboral del acudiente">
              <MatriculaGuardianEmploymentSection
                value={matricula.guardianEmployment}
                onChange={(guardianEmployment) =>
                  setMatricula({ ...matricula, guardianEmployment })
                }
              />
            </SeccionMatricula>
            <SeccionMatricula value="soporte" titulo="Archivo de soporte">
              <MatriculaSupportFilesSection value={soportes} onChange={setSoportes} />
            </SeccionMatricula>
            <Seccion value="areas" titulo="Áreas matriculadas">
              <p className="text-sm text-muted-foreground">
                Se matriculan las áreas del plan de estudios del grupo elegido.
              </p>
            </Seccion>
          </Secciones>
        </form>
      </TableScreenBody>
    </TableScreen>
  )
}
