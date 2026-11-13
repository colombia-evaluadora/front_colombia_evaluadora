import { useAsistenteMatricula } from "@/features/coverage/matricula/hooks/use-asistente-matricula"
import { useEstudianteExistenteQuery } from "@/features/coverage/matricula/api/query/use-estudiante-existente"
import { VerificacionEstudianteExistente } from "@/features/coverage/matricula/components/verificacion-estudiante-existente"
import { useMatriculaValidacionOpciones } from "@/features/coverage/matricula/hooks/use-matricula-validacion-opciones"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { CaretRightIcon, FloppyDiskIcon, InfoIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { NoticeOutlet, NoticeProvider, queueNotice, useNotify } from "@/components/notice/notice-context"

import { paths } from "@/config/paths"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { getErrorMessage } from "@/lib/api-client"
import { useCreateMatricula } from "@/features/coverage/matricula/api/mutations/create-matricula"
import { checkMatriculaByDocument } from "@/features/coverage/matricula/api/query/use-matricula-document-check"
import { useMatriculaFieldConfigQuery } from "@/features/coverage/matricula/api/query/use-matricula-field-config-query"
import { useEstablecimientoDeSede } from "@/features/coverage/matricula/api/query/use-establecimiento-de-sede"
import { findMatriculaUsuarioPorDocumento } from "@/features/coverage/matricula/api/query/use-matricula-usuario-por-documento"
import { useMatriculaCampusesQuery } from "@/features/coverage/matricula/api/query/use-matricula-campuses-query"
import { applyGradeFieldRules, buildMatriculaFieldSettings } from "@/features/coverage/matricula/utils/matricula-field-settings"
import { useMunicipalitiesQuery } from "@/features/establishment/institution/api/query/use-municipalities"
import type { CreateMatriculaInput, Matricula } from "@/features/coverage/matricula/api/types/matricula"
import type { SnapshotPendiente } from "@/features/coverage/matricula/api/types/notas-homologadas"
import { fetchSnapshotPendiente } from "@/features/coverage/matricula/api/query/use-snapshot-pendiente"
import { HomologationMatriculaDialog } from "@/features/coverage/matricula/components/dialogs/dialog-homologation-matricula"
import { DialogHomologarSnapshot } from "@/features/coverage/matricula/components/notas-homologadas/dialog-homologar-snapshot"
import { useMatriculaGradeLabel } from "@/features/coverage/matricula/hooks/use-matricula-grade-label"
import { StudentAlreadyMatriculatedDialog } from "@/features/coverage/matricula/components/dialogs/dialog-student-already-matriculated"
import {
  MatriculaPendingContext,
  OPEN_SECTION_EVENT,
  type DepartmentOption,
  type MatriculaSupportFiles,
} from "@/features/coverage/matricula/components/forms/form-create-matricula"
import { useMatriculaPredeterminados } from "@/features/coverage/matricula/hooks/use-matricula-predeterminados"
import { MatriculaFormBody } from "@/features/coverage/matricula/components/forms/matricula-form-body"
import {
  createEmptySupportFiles,
  createInitialMatriculaValues,
  getMatriculaFieldErrorMessage,
  pickMatriculaErrorField,
  validateMatricula,
  type MatriculaAccountsFound,
} from "@/features/coverage/matricula/utils/matricula-form-defaults"

const ADD_MATRICULA_FORM_ID = "create-matricula-form"

const SIN_HOMOLOGAR =
  "Las notas del traslado no se homologaron: los períodos transcurridos quedan pendientes por nivelación. " +
  "Puede homologarlas después desde Ver detalle, pestaña Notas homologadas."


export function AddMatriculaPage() {
  return (
    <NoticeProvider>
      <AddMatriculaPageContent />
    </NoticeProvider>
  )
}

function AddMatriculaPageContent() {
  const navigate = useNavigate()
  const { puedeCrear, isLoading: permisoCargando } = useMenuPermission("MATRICULA")
  // Sin Guardar, entrar por URL vuelve a la lista.
  // Catálogos que la validación necesita (documento de extranjero, población víctima).
  const validacion = useMatriculaValidacionOpciones()
  useEffect(() => {
    if (!permisoCargando && !puedeCrear) {
      navigate({ to: paths.app.coberturaMatricula.getHref(), replace: true })
    }
  }, [permisoCargando, puedeCrear, navigate])
  const { notify, dismiss } = useNotify()
  const { data: catalogs } = useMatriculaCampusesQuery()
  const { data: municipalities = [] } = useMunicipalitiesQuery()
  const [values, setValues] = useState<CreateMatriculaInput>(createInitialMatriculaValues)

  // La configuración es del colegio de la sede elegida (si no, 22023).
  const colegio = useEstablecimientoDeSede({
    sedeId: values.academic.campusId ? Number(values.academic.campusId) : null,
    sedeNombre: values.academic.campus,
  })
  const { data: fieldConfig, isError: isFieldConfigError, error: fieldConfigError } =
    useMatriculaFieldConfigQuery({
      establecimientoId: colegio.establecimientoId,
      enabled: colegio.resuelto,
    })
  // Estable a propósito: es dep del efecto de validación y el compiler no la memoiza aquí (si cambia en cada render, bucle).
  const fieldSettings = useMemo(
    () =>
      applyGradeFieldRules(
        fieldConfig ? buildMatriculaFieldSettings(fieldConfig) : undefined,
        values.academic.grade,
      ),
    [fieldConfig, values.academic.grade],
  )

  useEffect(() => {
    if (isFieldConfigError) notify(getErrorMessage(fieldConfigError), { variant: "error" })
  }, [isFieldConfigError, fieldConfigError, notify])

  useEffect(() => {
    if (colegio.ambigua) {
      notify(
        `Hay una sede llamada "${values.academic.campus}" en más de uno de tus establecimientos: no se puede saber cuál configuración de campos aplicar.`,
        { variant: "error" },
      )
    }
  }, [colegio.ambigua, values.academic.campus, notify])
  const [files, setFiles] = useState<MatriculaSupportFiles>(createEmptySupportFiles)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  // UI asistida: el agente lee y rellena datos del estudiante y acudiente (nunca guarda).
  useAsistenteMatricula({ values, setValues, invalidFields: missingFields })

  const [pendingHomologation, setPendingHomologation] = useState<{
    matricula: Matricula
    snapshot: SnapshotPendiente
    mode: "again" | "close"
    failedOtherDocumentsCount: number
  } | null>(null)
  const [showHomologar, setShowHomologar] = useState(false)
  const gradeLabel = useMatriculaGradeLabel()

  const [existingMatricula, setExistingMatricula] = useState<Matricula | null>(null)
  const [duplicateDialogDismissed, setDuplicateDialogDismissed] = useState(false)

  // Cuenta ya existente de estudiante/acudiente que va en el create.
  const pkUsuarioEstudianteRef = useRef<number | null>(null)
  const pkUsuarioAcudienteRef = useRef<number | null>(null)
  // Valores previos al autocompletado: si el documento cambia, se restauran
  // para no dejar datos de otra persona en el form.
  const preMatchEstudianteRef = useRef<{
    student: Partial<typeof values.student>
    studentContact: Partial<typeof values.studentContact>
  } | null>(null)
  const preMatchAcudienteRef = useRef<{
    guardian: Partial<typeof values.guardian>
    guardianContact: Partial<typeof values.guardianContact>
  } | null>(null)

  // `false` hace obligatorio el correo (cuenta nueva); `null` = sin resolver.
  const [studentAccountFound, setStudentAccountFound] = useState<boolean | null>(null)
  const [guardianAccountFound, setGuardianAccountFound] = useState<boolean | null>(null)
  const accountsFound: MatriculaAccountsFound = {
    student: studentAccountFound ?? undefined,
    guardian: guardianAccountFound ?? undefined,
  }

  const initialValuesRef = useRef(createInitialMatriculaValues())
  const { conPredeterminados } = useMatriculaPredeterminados(values, setValues, fieldSettings, initialValuesRef)

  const departments: DepartmentOption[] = (() => {
    const byName = new Map<string, DepartmentOption["municipalities"]>()
    for (const municipality of municipalities) {
      const list = byName.get(municipality.department.name) ?? []
      list.push({ id: municipality.id, name: municipality.name })
      byName.set(municipality.department.name, list)
    }
    return Array.from(byName.entries()).map(([name, municipalities]) => ({ name, municipalities }))
  })()

  const createMatricula = useCreateMatricula({
    mutationConfig: {
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  useEffect(() => {
    if (!hasSubmitted) return
    setMissingFields(validateMatricula(values, undefined, fieldSettings, accountsFound, validacion))
  }, [values, files, hasSubmitted, fieldSettings, studentAccountFound, guardianAccountFound])

  // Reglas 3 y 8: el documento identifica al estudiante; si ya existe, se cargan sus
  // datos de identidad (en solo lectura) y se muestra la verificación.
  const { data: estudianteExistente } = useEstudianteExistenteQuery(values.student.documentNumber)
  const docPrecargado = useRef("")
  useEffect(() => {
    if (!estudianteExistente) return
    const doc = values.student.documentNumber.trim()
    if (docPrecargado.current === doc) return
    docPrecargado.current = doc
    const { firstName, secondName, lastName, secondLastName, birthDate } = estudianteExistente
    setValues((prev) => ({
      ...prev,
      student: { ...prev.student, firstName, secondName, lastName, secondLastName, birthDate },
    }))
  }, [estudianteExistente, values.student.documentNumber])

  // Matrícula activa duplicada: se consulta 600 ms después de la última tecla.
  const { documentType, documentNumber } = values.student
  useEffect(() => {
    setExistingMatricula(null)
    setDuplicateDialogDismissed(false)

    const trimmed = documentNumber.trim()
    if (!documentType || trimmed.length < 6) return

    let cancelled = false
    const timeout = setTimeout(() => {
      checkMatriculaByDocument(trimmed)
        .then((result) => {
          if (!cancelled) setExistingMatricula(result.matricula)
        })
        .catch(() => {
          // Si falla no se bloquea: el backend rechaza el duplicado al guardar.
        })
    }, 600)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [documentType, documentNumber])

  const { documentType: guardianDocumentType, documentNumber: guardianDocumentNumber } =
    values.guardian

  useEffect(() => {
    pkUsuarioEstudianteRef.current = null
    setStudentAccountFound(null)
    const preMatchEstudiante = preMatchEstudianteRef.current
    if (preMatchEstudiante) {
      preMatchEstudianteRef.current = null
      setValues((prev) => ({
        ...prev,
        student: { ...prev.student, ...preMatchEstudiante.student },
        studentContact: { ...prev.studentContact, ...preMatchEstudiante.studentContact },
      }))
    }
    const trimmed = documentNumber.trim()
    const documentTypeId = Number(documentType)
    if (!documentTypeId || trimmed.length < 6) return

    let cancelled = false
    const timeout = setTimeout(() => {
      findMatriculaUsuarioPorDocumento(documentTypeId, trimmed)
        .then((found) => {
          if (cancelled) return
          if (!found) {
            setStudentAccountFound(false)
            return
          }
          setStudentAccountFound(true)
          pkUsuarioEstudianteRef.current = found.pkTusuario
          setValues((prev) => {
            const { firstName, secondName, lastName, secondLastName, birthDate, gender } = prev.student
            preMatchEstudianteRef.current = {
              student: { firstName, secondName, lastName, secondLastName, birthDate, gender },
              studentContact: { phone: prev.studentContact.phone, email: prev.studentContact.email },
            }
            return {
            ...prev,
            student: {
              ...prev.student,
              firstName: found.firstName,
              secondName: found.secondName,
              lastName: found.lastName,
              secondLastName: found.secondLastName,
              birthDate: found.birthDate,
              gender: found.gender,
            },
            studentContact: {
              ...prev.studentContact,
              phone: found.phone,
              email: found.email,
            },
            }
          })
        })
        .catch(() => {
        })
    }, 600)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [documentType, documentNumber])

  useEffect(() => {
    pkUsuarioAcudienteRef.current = null
    setGuardianAccountFound(null)
    const preMatchAcudiente = preMatchAcudienteRef.current
    if (preMatchAcudiente) {
      preMatchAcudienteRef.current = null
      setValues((prev) => ({
        ...prev,
        guardian: { ...prev.guardian, ...preMatchAcudiente.guardian },
        guardianContact: { ...prev.guardianContact, ...preMatchAcudiente.guardianContact },
      }))
    }
    const trimmed = guardianDocumentNumber.trim()
    const documentTypeId = Number(guardianDocumentType)
    if (!documentTypeId || trimmed.length < 6) return

    let cancelled = false
    const timeout = setTimeout(() => {
      findMatriculaUsuarioPorDocumento(documentTypeId, trimmed)
        .then((found) => {
          if (cancelled) return
          if (!found) {
            setGuardianAccountFound(false)
            return
          }
          setGuardianAccountFound(true)
          pkUsuarioAcudienteRef.current = found.pkTusuario
          setValues((prev) => {
            const { firstName, secondName, lastName, secondLastName, gender } = prev.guardian
            preMatchAcudienteRef.current = {
              guardian: { firstName, secondName, lastName, secondLastName, gender },
              guardianContact: { phone: prev.guardianContact.phone, email: prev.guardianContact.email },
            }
            return {
            ...prev,
            guardian: {
              ...prev.guardian,
              firstName: found.firstName,
              secondName: found.secondName,
              lastName: found.lastName,
              secondLastName: found.secondLastName,
              // El género va aunque venga vacío: si no, queda el del acudiente anterior.
              gender: found.gender,
            },
            guardianContact: {
              ...prev.guardianContact,
              phone: found.phone,
              email: found.email,
            },
            }
          })
        })
        .catch(() => {
        })
    }, 600)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [guardianDocumentType, guardianDocumentNumber])

  useEffect(() => {
    if (missingFields.length === 0) {
      dismiss()
      return
    }
    notify(getMatriculaFieldErrorMessage(pickMatriculaErrorField(missingFields, values), values), {
      variant: "error",
      autoCloseMs: 0,
    })
  }, [missingFields, values, notify, dismiss])

  function resetForm() {
    const blank = conPredeterminados(createInitialMatriculaValues())
    setValues(blank)
    setFiles(createEmptySupportFiles())
    initialValuesRef.current = blank
    setMissingFields([])
    setHasSubmitted(false)
    dismiss()
  }

  function finishSave(
    matricula: Matricula,
    mode: "again" | "close",
    extraMessage?: string,
    failedOtherDocumentsCount = 0,
  ) {
    const base = `Estudiante ${matricula.firstName} ${matricula.lastName} matriculado correctamente.`
    const message = extraMessage ? `${base} ${extraMessage}` : base
    if (failedOtherDocumentsCount > 0) {
      notify(
        `${message} ${failedOtherDocumentsCount} archivo(s) de "otros documentos" no se pudieron subir; ` +
          `podés reintentarlos desde "Archivos" en el detalle del estudiante.`,
        { variant: "error" },
      )
    } else {
      notify(message)
    }
    if (mode === "close") {
      // Al guardar quedan habilitados 2.14 y 2.15: se sigue en Editar (Regla 23).
      queueNotice(failedOtherDocumentsCount > 0 ? message : `${message} Ya puede cargar los archivos de soporte.`)
      navigate({ to: paths.app.coberturaMatriculaEditar.getHref(matricula.id) })
    } else {
      resetForm()
    }
  }

  function handleSave(mode: "again" | "close") {
    if (existingMatricula) return
    setHasSubmitted(true)
    const missing = validateMatricula(values, undefined, fieldSettings, accountsFound, validacion)
    setMissingFields(missing)
    if (missing.length > 0) return

    createMatricula.mutate(
      {
        values,
        files,
        pkUsuarioEstudiante: pkUsuarioEstudianteRef.current,
        pkUsuarioAcudiente: pkUsuarioAcudienteRef.current,
      },
      {
        onSuccess: async ({ matricula, failedOtherDocuments, asignaturasError }) => {
          if (asignaturasError) {
            // La matrícula ya existe: el resto se corrige desde Editar matrícula.
            notify(
              `Estudiante matriculado, pero no se guardaron las asignaturas ni la media técnica: ${asignaturasError} ` +
                "Corríjalo desde Editar matrícula.",
              { variant: "error" },
            )
            navigate({ to: paths.app.coberturaMatricula.getHref() })
            return
          }
          // Sección 4.5: si el estudiante llega por traslado con notas, se pregunta si se homologan.
          const snapshot = await fetchSnapshotPendiente(matricula.id).catch(() => null)
          if (snapshot) {
            setPendingHomologation({
              matricula,
              snapshot,
              mode,
              failedOtherDocumentsCount: failedOtherDocuments.length,
            })
            return
          }
          finishSave(matricula, mode, undefined, failedOtherDocuments.length)
        },
      },
    )
  }

  function handleHomologationChoice(homologate: boolean) {
    if (!pendingHomologation) return
    if (homologate) {
      setShowHomologar(true)
      return
    }
    cerrarHomologacion(SIN_HOMOLOGAR)
  }

  function cerrarHomologacion(mensaje: string) {
    if (!pendingHomologation) return
    const { matricula, mode, failedOtherDocumentsCount } = pendingHomologation
    setShowHomologar(false)
    setPendingHomologation(null)
    finishSave(matricula, mode, mensaje, failedOtherDocumentsCount)
  }

  // Bloque 15: se habilita al guardar (Regla 23); si cambia el grupo se descartan los cambios.
  const grupoId = values.academic.group ? Number(values.academic.group) : null
  const grupoDeLosCambios = useRef(grupoId)
  useEffect(() => {
    if (grupoDeLosCambios.current === grupoId) return
    grupoDeLosCambios.current = grupoId
    setValues((prev) => (prev.asignaturas ? { ...prev, asignaturas: undefined } : prev))
  }, [grupoId])

  // Conteo en vivo (prototipo C.1.AGR): lo mismo que bloquearía el Guardar.
  const pendingFields = validateMatricula(values, undefined, fieldSettings, accountsFound, validacion)

  function showFirstPending() {
    const id = pendingFields.find((fieldId) => document.getElementById(fieldId))
    if (!id) return
    window.dispatchEvent(new CustomEvent(OPEN_SECTION_EVENT, { detail: id }))
    // La sección se abre en el próximo render; recién ahí el campo es enfocable.
    requestAnimationFrame(() => {
      const field = document.getElementById(id)
      field?.scrollIntoView({ block: "center", behavior: "smooth" })
      field?.focus({ preventScroll: true })
    })
  }

  const saving = createMatricula.isPending

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {pendingFields.length > 0 ? (
                <Button type="button" variant="link" color="primary" size="sm" onClick={showFirstPending}>
                  {pendingFields.length === 1 ? "Ver 1 pendiente" : `Ver ${pendingFields.length} pendientes`}
                  <CaretRightIcon data-icon="inline-end" />
                </Button>
              ) : null}
              <Button
                render={<Link to={paths.app.coberturaMatricula.getHref()} />}
                variant="outline"
                color="neutral"
                size="sm"
                nativeButton={false}
              >
                <XIcon data-icon="inline-start" />
                Cancelar
              </Button>
              <Button
                type="button"
                variant="fill"
                color="primary"
                size="sm"
                disabled={saving || Boolean(existingMatricula)}
                aria-busy={saving}
                onClick={() => handleSave("close")}
              >
                {saving ? (
                  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <FloppyDiskIcon data-icon="inline-start" />
                )}
                Guardar
              </Button>
            </div>
          }
        >
          Agregar estudiante
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody>
        <MatriculaPendingContext value={pendingFields}>
        <div id={ADD_MATRICULA_FORM_ID} className="flex flex-col gap-4 [counter-reset:seccion]">
          {estudianteExistente ? <VerificacionEstudianteExistente estudiante={estudianteExistente} /> : null}
          <MatriculaFormBody
            values={values}
            onChange={setValues}
            // Una matrícula nueva solo va a sedes Activas (Regla 100).
            catalogs={catalogs && { ...catalogs, sedes: catalogs.sedes.filter((sede) => sede.activa) }}
            departments={departments}
            invalidFields={missingFields}
            showStatus={false}
            fieldSettings={fieldSettings}
            studentIdentidadExistente={Boolean(estudianteExistente)}
          />

          {/* Regla 23: los bloques 14 y 15 se habilitan al guardar; se completan en Editar. */}
          <div
            role="note"
            className="flex items-start gap-3 rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
          >
            <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              Los bloques 14. Archivos de soporte y 15. Asignaturas matriculadas se habilitan al guardar la matrícula.
              Las asignaturas obligatorias del plan quedan matriculadas solas.
            </p>
          </div>
        </div>
        </MatriculaPendingContext>
      </TableScreenBody>

      {pendingHomologation && !showHomologar && (
        <HomologationMatriculaDialog
          institucionOrigen={pendingHomologation.snapshot.institucionOrigen}
          onChoice={handleHomologationChoice}
        />
      )}

      {pendingHomologation && showHomologar && (
        <DialogHomologarSnapshot
          matriculaId={pendingHomologation.matricula.id}
          snapshot={pendingHomologation.snapshot}
          estudiante={`${pendingHomologation.matricula.firstName} ${pendingHomologation.matricula.lastName} (${[
            gradeLabel(pendingHomologation.matricula.grade),
            pendingHomologation.matricula.group,
            pendingHomologation.matricula.institution,
            pendingHomologation.matricula.shift,
          ]
            .filter(Boolean)
            .join(" · ")})`}
          onOpenChange={(open) => !open && cerrarHomologacion(SIN_HOMOLOGAR)}
          onHomologated={({ notasHomologadas, pendientes }) =>
            cerrarHomologacion(
              `Se homologaron ${notasHomologadas} notas del traslado` +
                (pendientes > 0 ? `; ${pendientes} quedan pendientes por nivelación.` : "."),
            )
          }
        />
      )}

      {existingMatricula && !duplicateDialogDismissed && (
        <StudentAlreadyMatriculatedDialog
          matricula={existingMatricula}
          onClose={() => {
            setDuplicateDialogDismissed(true)
            // Se limpia el documento del estudiante ya matriculado.
            setValues((prev) => ({
              ...prev,
              student: { ...prev.student, documentType: "", documentNumber: "" },
            }))
          }}
        />
      )}
    </TableScreen>
  )
}
