import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { ImageUploadField } from "@/components/image-upload-field"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CaretRightIcon, FloppyDiskIcon, XIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { coberturaInscripcionEditarRoute } from "@/router"

import { useMunicipalitiesQuery } from "@/features/establishment/institution/api/query/use-municipalities"
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
  MatriculaSelectField,
  MatriculaStudentSection,
  MatriculaTextField,
  type DepartmentOption,
} from "@/features/coverage/matricula/components/forms/form-create-matricula"
import { createInitialMatriculaValues } from "@/features/coverage/matricula/utils/matricula-form-defaults"

import {
  useCrearInscripcion,
  useEditarInscripcion,
} from "@/features/coverage/inscripcion-reservas/api/mutations/editar-inscripcion"
import {
  conValor,
  useCascadaOpciones,
} from "@/features/coverage/inscripcion-reservas/hooks/use-cascada-opciones"
import {
  useGrupoAdmisionQuery,
  useInscripcionDetalleQuery,
} from "@/features/coverage/inscripcion-reservas/api/query/use-inscripciones-query"
import type {
  InscripcionDetalle,
  OpcionCupoInput,
} from "@/features/coverage/inscripcion-reservas/api/types/inscripcion"
import {
  MarcaPendientes,
  Rejilla,
  Seccion,
  SeccionMatricula,
  Secciones,
} from "@/features/coverage/inscripcion-reservas/components/reserva-ui"

const FORM_ID = "editar-inscripcion-form"

// Catálogos propios de la inscripción que la matrícula no trae.
const PAISES = ["Colombia", "Venezuela", "Ecuador", "Perú", "Otro"]
const LENGUAS = ["Español", "Wayuunaiki", "Nasa Yuwe", "Inglés", "Otra"]
const CONDICIONES_MIGRATORIAS = ["No aplica", "PPT", "PEP", "Visa", "Sin documento"]
const MAX_OPCIONES = 3
// Documento del hermano (Regla 27): dígitos o alfanumérico extranjero, sin puntos ni espacios.
const DOCUMENTO_HERMANO = /^[A-Za-z0-9]{5,20}$/

/** Editar inscripción (Cobertura, Sección 3.3): los datos de la persona y sus opciones. */
export function InscripcionEditarPage() {
  const { inscripcionId } = coberturaInscripcionEditarRoute.useParams()
  const { data, isPending, isError, error } = useInscripcionDetalleQuery(inscripcionId)

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
  return <InscripcionForm key={data.id} inscripcion={data} />
}

/** Nueva inscripción (Cobertura, Sección 3.3): el mismo formulario, vacío. */
export function NuevaInscripcionPage() {
  return <InscripcionForm inscripcion={null} />
}

function valoresIniciales(d: InscripcionDetalle | null) {
  const base = createInitialMatriculaValues()
  if (!d) return base
  const e = d.estudiante
  const a = d.acudiente
  return {
    ...base,
    student: {
      ...base.student,
      documentType: e.tipoDocumento,
      documentNumber: e.documento,
      firstName: e.primerNombre,
      secondName: e.segundoNombre ?? "",
      lastName: e.primerApellido,
      secondLastName: e.segundoApellido ?? "",
      birthDate: e.fechaNacimiento,
      gender: e.genero,
      ethnicity: e.etnia,
    },
    guardian: {
      ...base.guardian,
      relationship: a.parentesco,
      documentType: a.tipoDocumento,
      documentNumber: a.documento,
      firstName: a.nombre,
      lastName: a.primerApellido,
      secondLastName: a.segundoApellido ?? "",
    },
    guardianContact: { phone: a.telefono, email: a.email },
  }
}

const vacia = (): OpcionCupoInput => ({ establecimiento: "", sede: "", jornada: "" })
const cuenta = (...valores: unknown[]) => valores.filter((v) => !v).length

function InscripcionForm({ inscripcion }: { inscripcion: InscripcionDetalle | null }) {
  const navigate = useNavigate()
  const volver = () =>
    navigate({
      to: inscripcion
        ? paths.app.coberturaInscripcionDetalle.getHref(inscripcion.id)
        : `${paths.app.coberturaInscritos.getHref()}?tab=inscripciones`,
    })

  const { data: grupo } = useGrupoAdmisionQuery()
  const { data: municipalities = [] } = useMunicipalitiesQuery()
  const editarMut = useEditarInscripcion()
  const crearMut = useCrearInscripcion()
  const editar = inscripcion ? editarMut : crearMut
  // Al editar se abre la primera; al crear todas cerradas, guiadas por los pendientes.
  const [abiertas, setAbiertas] = useState<string[]>(inscripcion ? ["estudiante"] : [])

  const [datos, setDatos] = useState(() => valoresIniciales(inscripcion))
  const [foto, setFoto] = useState<File | null>(null)
  const [extra, setExtra] = useState({
    paisOrigen: inscripcion?.estudiante.paisOrigen ?? "Colombia",
    lenguaMaterna: inscripcion?.estudiante.lenguaMaterna ?? "",
    condicionMigratoria: inscripcion?.estudiante.condicionMigratoria ?? "",
  })
  const [grado, setGrado] = useState(inscripcion?.grado ?? "")
  // Cascada de las opciones con los períodos que ofrecen el grado elegido.
  const { establecimientos, sedesDe, jornadasDe } = useCascadaOpciones(grado)
  const [opciones, setOpciones] = useState<OpcionCupoInput[]>(() =>
    inscripcion
      ? inscripcion.opciones.map(({ establecimiento, sede, jornada }) => ({
          establecimiento,
          sede,
          jornada,
        }))
      : [vacia()],
  )
  const [hermano, setHermano] = useState({
    tiene: Boolean(inscripcion?.documentoHermano),
    documento: inscripcion?.documentoHermano ?? "",
  })
  // La autorización ya dada al crear cubre la edición (Sección 3.3); al crear es obligatoria.
  const [autoriza, setAutoriza] = useState(Boolean(inscripcion))
  const [intentado, setIntentado] = useState(false)
  const documentoHermanoValido = !hermano.tiene || DOCUMENTO_HERMANO.test(hermano.documento)

  const departments: DepartmentOption[] = (() => {
    const byName = new Map<string, DepartmentOption["municipalities"]>()
    for (const m of municipalities) {
      const list = byName.get(m.department.name) ?? []
      list.push({ id: m.id, name: m.name })
      byName.set(m.department.name, list)
    }
    return Array.from(byName, ([name, municipalities]) => ({ name, municipalities }))
  })()

  // Obligatorios sin llenar por sección: la marca "N pendientes" o "Completo".
  const s = datos.student
  const g = datos.guardian
  const pendientes: Record<string, number> = {
    estudiante: cuenta(
      s.documentType,
      s.documentNumber,
      s.gender,
      s.firstName,
      s.lastName,
      s.birthDate,
    ),
    acudiente: cuenta(g.relationship, g.documentType, g.documentNumber, g.firstName, g.lastName),
    "contacto-acudiente": cuenta(datos.guardianContact.phone),
    opciones:
      cuenta(grado, documentoHermanoValido, autoriza) +
      opciones.reduce((n, o) => n + cuenta(o.establecimiento, o.sede, o.jornada), 0),
  }
  const totalPendientes = Object.values(pendientes).reduce((a, b) => a + b, 0)
  const valido = totalPendientes === 0
  const marca = (seccion: string) => <MarcaPendientes pendientes={pendientes[seccion]} />

  // Abre la primera sección con pendientes y la lleva a la vista.
  function verPendientes() {
    const primera = Object.keys(pendientes).find((k) => pendientes[k] > 0)
    if (!primera) return
    if (!abiertas.includes(primera)) setAbiertas([...abiertas, primera])
    requestAnimationFrame(() =>
      document
        .getElementById(`seccion-${primera}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    )
  }

  const setOpcion = (i: number, patch: Partial<OpcionCupoInput>) =>
    setOpciones(opciones.map((o, j) => (j === i ? { ...o, ...patch } : o)))

  function guardar() {
    setIntentado(true)
    if (!valido) {
      toast.error("Complete los campos obligatorios de las secciones con pendientes.")
      verPendientes()
      return
    }
    editar.mutate(
      {
        id: inscripcion?.id ?? "",
        datos,
        ...extra,
        grado,
        opciones,
        foto,
        documentoHermano: hermano.tiene ? hermano.documento.trim() : null,
        autorizaDatos: autoriza,
      },
      {
        onSuccess: () => {
          toast.success(
            inscripcion
              ? `Se guardó la inscripción ${inscripcion.numeroInscripcion}.`
              : "Se creó la inscripción.",
          )
          volver()
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    )
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {totalPendientes > 0 && (
                <Button variant="link" size="sm" onClick={verPendientes}>
                  Ver {totalPendientes} pendientes
                  <CaretRightIcon data-icon="inline-end" />
                </Button>
              )}
              <Button
                variant="outline"
                color="neutral"
                disabled={editar.isPending}
                onClick={volver}
              >
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
              <Button type="submit" form={FORM_ID} disabled={editar.isPending}>
                {editar.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <FloppyDiskIcon data-icon="inline-start" />
                )}
                Guardar
              </Button>
            </div>
          }
        >
          {inscripcion
            ? `Editar inscripción ${inscripcion.numeroInscripcion}`
            : "Nueva inscripción"}
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <form
          id={FORM_ID}
          noValidate
          // El * de obligatorio con el color de la marca de pendientes.
          className="[&_[data-required-mark]]:text-orange"
          onSubmit={(e) => {
            e.preventDefault()
            guardar()
          }}
        >
          <Secciones abiertas={abiertas} onAbiertasChange={setAbiertas}>
            <SeccionMatricula
              value="estudiante"
              titulo="Información del estudiante"
              extra={marca("estudiante")}
            >
              <div className="grid gap-5">
                <ImageUploadField
                  value={foto}
                  onValueChange={setFoto}
                  title="Foto del estudiante"
                  description={null}
                  deleteLabel="Quitar foto"
                  className="size-40"
                />
                <MatriculaStudentSection
                  value={datos.student}
                  onChange={(student) => setDatos({ ...datos, student })}
                  departments={departments}
                />
                <Rejilla>
                  <MatriculaSelectField
                    id="pais-origen"
                    label="País de origen"
                    value={extra.paisOrigen}
                    options={PAISES}
                    onChange={(paisOrigen) => setExtra({ ...extra, paisOrigen })}
                  />
                  <MatriculaSelectField
                    id="lengua-materna"
                    label="Lengua materna"
                    value={extra.lenguaMaterna}
                    options={LENGUAS}
                    onChange={(lenguaMaterna) => setExtra({ ...extra, lenguaMaterna })}
                  />
                  <MatriculaSelectField
                    id="condicion-migratoria"
                    label="Condición migratoria"
                    value={extra.condicionMigratoria}
                    options={CONDICIONES_MIGRATORIAS}
                    onChange={(condicionMigratoria) => setExtra({ ...extra, condicionMigratoria })}
                  />
                </Rejilla>
              </div>
            </SeccionMatricula>
            <SeccionMatricula value="domicilio" titulo="Domicilio del estudiante">
              <MatriculaResidenceSection
                title="Domicilio del estudiante"
                addressLabel="Dirección del estudiante"
                departmentLabel="Lugar de residencia departamento estudiante"
                municipalityLabel="Lugar de residencia municipio estudiante"
                idPrefix="student-residence"
                value={datos.studentAddress}
                onChange={(studentAddress) => setDatos({ ...datos, studentAddress })}
                departments={departments}
              />
            </SeccionMatricula>
            <SeccionMatricula value="contacto" titulo="Información de contacto del estudiante">
              <MatriculaContactSection
                title="Información de contacto del estudiante"
                idPrefix="student-contact"
                phoneLabel="Teléfono de estudiante"
                emailLabel="Email estudiante"
                value={datos.studentContact}
                onChange={(studentContact) => setDatos({ ...datos, studentContact })}
              />
            </SeccionMatricula>
            <SeccionMatricula value="anio-anterior" titulo="Información académica del año anterior">
              <MatriculaPreviousYearSection
                value={datos.previousYear}
                onChange={(previousYear) => setDatos({ ...datos, previousYear })}
              />
            </SeccionMatricula>
            <SeccionMatricula value="sector" titulo="Sector de origen">
              <MatriculaOriginSectorSection
                value={datos.originSector}
                onChange={(originSector) => setDatos({ ...datos, originSector })}
              />
            </SeccionMatricula>
            <SeccionMatricula value="victima" titulo="Víctima conflicto armado">
              <MatriculaConflictVictimSection
                value={datos.conflictVictim}
                departments={departments}
                onChange={(conflictVictim) => setDatos({ ...datos, conflictVictim })}
              />
            </SeccionMatricula>
            <SeccionMatricula value="complementaria" titulo="Información complementaria">
              <MatriculaComplementarySection
                value={datos.complementary}
                onChange={(complementary) => setDatos({ ...datos, complementary })}
              />
            </SeccionMatricula>
            <SeccionMatricula value="subsidio" titulo="Subsidio o beneficios">
              <MatriculaBenefitsSection
                value={datos.benefits}
                onChange={(benefits) => setDatos({ ...datos, benefits })}
              />
            </SeccionMatricula>
            <SeccionMatricula
              value="acudiente"
              titulo="Información del acudiente"
              extra={marca("acudiente")}
            >
              <MatriculaGuardianSection
                value={datos.guardian}
                onChange={(guardian) => setDatos({ ...datos, guardian })}
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
                value={datos.guardianAddress}
                onChange={(guardianAddress) => setDatos({ ...datos, guardianAddress })}
                departments={departments}
              />
            </SeccionMatricula>
            <SeccionMatricula
              value="contacto-acudiente"
              titulo="Información de contacto del acudiente"
              extra={marca("contacto-acudiente")}
            >
              <MatriculaContactSection
                title="Información de contacto de acudiente"
                idPrefix="guardian-contact"
                phoneLabel="Teléfono de acudiente"
                emailLabel="Email acudiente"
                value={datos.guardianContact}
                onChange={(guardianContact) => setDatos({ ...datos, guardianContact })}
              />
            </SeccionMatricula>
            <SeccionMatricula value="laboral" titulo="Información laboral del acudiente">
              <MatriculaGuardianEmploymentSection
                value={datos.guardianEmployment}
                onChange={(guardianEmployment) => setDatos({ ...datos, guardianEmployment })}
              />
            </SeccionMatricula>

            <Seccion value="opciones" titulo="Grado y opciones de cupo" extra={marca("opciones")}>
              <div className="grid gap-5">
                <Rejilla>
                  <MatriculaSelectField
                    id="grado"
                    label="Grado"
                    required
                    value={grado}
                    options={grupo?.grados ?? [grado]}
                    onChange={setGrado}
                    invalid={intentado && !grado}
                  />
                </Rejilla>
                {opciones.map((o, i) => (
                  <fieldset key={i} className="grid gap-3">
                    <legend className="mb-3 flex w-full items-center justify-between text-sm font-medium">
                      Opción {i + 1}
                      {opciones.length > 1 && (
                        <Button
                          variant="ghost"
                          color="neutral"
                          size="sm"
                          onClick={() => setOpciones(opciones.filter((_, j) => j !== i))}
                        >
                          <XIcon data-icon="inline-start" />
                          Quitar
                        </Button>
                      )}
                    </legend>
                    <Rejilla>
                      <MatriculaSelectField
                        id={`opcion-${i}-establecimiento`}
                        label="Establecimiento"
                        required
                        value={o.establecimiento}
                        options={conValor(establecimientos, o.establecimiento)}
                        onChange={(establecimiento) =>
                          setOpcion(i, { establecimiento, sede: "", jornada: "" })
                        }
                        invalid={intentado && !o.establecimiento}
                      />
                      <MatriculaSelectField
                        id={`opcion-${i}-sede`}
                        label="Sede"
                        required
                        value={o.sede}
                        options={conValor(sedesDe(o.establecimiento), o.sede)}
                        onChange={(sede) => setOpcion(i, { sede, jornada: "" })}
                        invalid={intentado && !o.sede}
                      />
                      <MatriculaSelectField
                        id={`opcion-${i}-jornada`}
                        label="Jornada"
                        required
                        value={o.jornada}
                        options={conValor(jornadasDe(o), o.jornada)}
                        onChange={(jornada) => setOpcion(i, { jornada })}
                        invalid={intentado && !o.jornada}
                      />
                    </Rejilla>
                  </fieldset>
                ))}
                {opciones.length < MAX_OPCIONES && (
                  <Button
                    variant="outline"
                    color="neutral"
                    className="w-fit"
                    onClick={() => setOpciones([...opciones, vacia()])}
                  >
                    Agregar opción
                  </Button>
                )}

                <fieldset className="grid gap-3 border-t border-border pt-5">
                  <legend className="mb-3 text-sm font-medium">
                    ¿Tiene hermano en algún establecimiento de las opciones?{" "}
                    <span data-required-mark="">*</span>
                  </legend>
                  <RadioGroup
                    className="flex flex-wrap gap-6"
                    value={hermano.tiene ? "S" : "N"}
                    onValueChange={(v) =>
                      setHermano({
                        tiene: v === "S",
                        documento: v === "S" ? hermano.documento : "",
                      })
                    }
                  >
                    {[
                      ["S", "Sí"],
                      ["N", "No"],
                    ].map(([v, label]) => (
                      <label key={v} className="flex cursor-pointer items-center gap-2 text-sm">
                        <RadioGroupItem value={v} />
                        {label}
                      </label>
                    ))}
                  </RadioGroup>
                  {hermano.tiene && (
                    <Rejilla>
                      <div className="grid gap-1.5">
                        <MatriculaTextField
                          id="documento-hermano"
                          label="Documento del hermano"
                          required
                          maxLength={20}
                          value={hermano.documento}
                          onChange={(documento) =>
                            setHermano({
                              ...hermano,
                              documento: documento.replace(/[^A-Za-z0-9]/g, ""),
                            })
                          }
                          invalid={intentado && !documentoHermanoValido}
                        />
                        <p
                          className={
                            intentado && !documentoHermanoValido
                              ? "text-xs text-red"
                              : "text-xs text-muted-foreground"
                          }
                        >
                          Entre 5 y 20 letras o dígitos, sin puntos ni espacios. Se verifica en los
                          establecimientos de las opciones.
                        </p>
                      </div>
                    </Rejilla>
                  )}
                </fieldset>

                <div className="grid gap-1.5 border-t border-border pt-5">
                  <label className="flex w-fit cursor-pointer items-start gap-2 text-sm">
                    <Checkbox
                      checked={autoriza}
                      disabled={Boolean(inscripcion)}
                      onCheckedChange={(c) => setAutoriza(Boolean(c))}
                      aria-invalid={intentado && !autoriza}
                    />
                    <span>
                      Autorizo el tratamiento de los datos personales del aspirante y su acudiente
                      (Ley 1581 de 2012). <span data-required-mark="">*</span>
                    </span>
                  </label>
                  <p
                    className={
                      intentado && !autoriza ? "text-xs text-red" : "text-xs text-muted-foreground"
                    }
                  >
                    {inscripcion
                      ? "La autorización se dio al registrar la inscripción."
                      : "Con ella, los establecimientos de las opciones ven los datos para poder admitir."}
                  </p>
                </div>
              </div>
            </Seccion>
          </Secciones>
        </form>
      </TableScreenBody>
    </TableScreen>
  )
}
