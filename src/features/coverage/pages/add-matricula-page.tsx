import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"

import {
  TableScreen,
  TableScreenBody,
  TableScreenFooter,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { CheckIcon, SpinnerIcon } from "@/components/ui/icons"
import { NoticeOutlet, NoticeProvider, useNotify } from "@/components/notice/notice-context"

import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import { useCreateMatricula } from "@/features/coverage/api/mutations/create-matricula"
import { checkMatriculaByDocument } from "@/features/coverage/api/query/use-matricula-document-check"
import { useMatriculaFieldConfigQuery } from "@/features/coverage/api/query/use-matricula-field-config-query"
import { findMatriculaUsuarioPorDocumento } from "@/features/coverage/api/query/use-matricula-usuario-por-documento"
import { useMatriculaCampusesQuery } from "@/features/coverage/api/query/use-matricula-campuses-query"
import { buildMatriculaFieldSettings } from "@/features/coverage/utils/matricula-field-settings"
import { useMunicipalitiesQuery } from "@/features/establishment/institution/api/query/use-municipalities"
import type {
  CreateMatriculaInput,
  Matricula,
  MatriculaHomologationInfo,
} from "@/features/coverage/api/types/matricula"
import { HomologationMatriculaDialog } from "@/features/coverage/components/dialogs/dialog-homologation-matricula"
import { TransferGradesDialog } from "@/features/coverage/components/dialogs/dialog-transfer-grades-matricula"
import { StudentAlreadyMatriculatedDialog } from "@/features/coverage/components/dialogs/dialog-student-already-matriculated"
import {
  MatriculaSupportFilesSection,
  type DepartmentOption,
  type MatriculaSupportFiles,
} from "@/features/coverage/components/forms/form-create-matricula"
import { MatriculaFormBody } from "@/features/coverage/components/forms/matricula-form-body"
import {
  createEmptySupportFiles,
  createInitialMatriculaValues,
  getMatriculaFieldErrorMessage,
  pickMatriculaErrorField,
  validateMatricula,
  type MatriculaAccountsFound,
} from "@/features/coverage/utils/matricula-form-defaults"

const ADD_MATRICULA_FORM_ID = "create-matricula-form"

// Mock — el backend real va a devolver los periodos del colegio de origen y
// los de la institución actual junto con `MatriculaHomologationInfo`; acá se
// simulan con listas de largo variable a propósito, para no asumir que
// siempre son 4 y 2 respectivamente.
const MOCK_ORIGIN_PERIODS = [
  { id: "origin-1", label: "1° periodo", startDate: "01/02/2024", endDate: "30/04/2024" },
  { id: "origin-2", label: "2° periodo", startDate: "02/05/2024", endDate: "12/07/2024" },
  { id: "origin-3", label: "3° periodo", startDate: "05/08/2024", endDate: "11/10/2024" },
  { id: "origin-4", label: "4° periodo", startDate: "21/10/2024", endDate: "20/12/2024" },
]

const MOCK_INSTITUTION_PERIODS = [
  { id: 1, abbreviation: "P1", name: "Primer periodo" },
  { id: 2, abbreviation: "P2", name: "Segundo periodo" },
]

// Mock del paso 2 (Asignaturas) — el backend real todavía no expone el cruce
// automático entre asignaturas del colegio de origen y las de la institución.
const MOCK_GRADE_PERIOD_LABELS = ["P1", "P2", "P3", "P4"]

const MOCK_SUBJECT_MATCHES = [
  { id: "s1", originSubject: "Matemáticas", institutionSubject: "Matemáticas", grades: ["4.2", "4.0", null, null] },
  { id: "s2", originSubject: "Lengua Castellana", institutionSubject: "Español", grades: ["4.5", "4.3", null, null] },
  { id: "s3", originSubject: "Ciencias Naturales", institutionSubject: "Educación Ambiental", grades: ["4.1", "4.2", null, null] },
  { id: "s4", originSubject: "Ciencias Sociales", institutionSubject: "Ciencias Sociales", grades: ["3.9", "4.1", null, null] },
  { id: "s5", originSubject: "Inglés", institutionSubject: "Lengua Extranjera", grades: ["4.6", "4.4", null, null] },
  { id: "s6", originSubject: "Educación Física", institutionSubject: "Recreación y Deportes", grades: ["4.3", "4.5", null, null] },
  { id: "s7", originSubject: "Educación Artística", institutionSubject: "Artística", grades: ["4.7", "4.6", null, null] },
  { id: "s8", originSubject: "Informática", institutionSubject: "Tecnología y Sistemas", grades: ["4.4", "4.3", null, null] },
  { id: "s9", originSubject: "Emprendimiento", institutionSubject: null, grades: ["4.4", "4.3", null, null] },
  { id: "s10", originSubject: null, institutionSubject: "Educación Financiera", grades: [null, null, null, null] },
  { id: "s11", originSubject: null, institutionSubject: "Innovación y Creatividad", grades: [null, null, null, null] },
]

export function AddMatriculaPage() {
  return (
    <NoticeProvider>
      <AddMatriculaPageContent />
    </NoticeProvider>
  )
}

function AddMatriculaPageContent() {
  const navigate = useNavigate()
  const { notify, dismiss } = useNotify()
  const { data: catalogs } = useMatriculaCampusesQuery()
  const { data: municipalities = [] } = useMunicipalitiesQuery()
  const { data: fieldConfig, isError: isFieldConfigError, error: fieldConfigError } =
    useMatriculaFieldConfigQuery()
  const fieldSettings = useMemo(
    () => (fieldConfig ? buildMatriculaFieldSettings(fieldConfig) : undefined),
    [fieldConfig],
  )

  useEffect(() => {
    if (isFieldConfigError) notify(getErrorMessage(fieldConfigError), { variant: "error" })
  }, [isFieldConfigError, fieldConfigError, notify])

  const [values, setValues] = useState<CreateMatriculaInput>(createInitialMatriculaValues)
  const [files, setFiles] = useState<MatriculaSupportFiles>(createEmptySupportFiles)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const [pendingHomologation, setPendingHomologation] = useState<{
    matricula: Matricula
    info: MatriculaHomologationInfo
    mode: "again" | "close"
    failedOtherDocumentsCount: number
  } | null>(null)
  const [showTransferGrades, setShowTransferGrades] = useState(false)

  const [existingMatricula, setExistingMatricula] = useState<Matricula | null>(null)
  const [duplicateDialogDismissed, setDuplicateDialogDismissed] = useState(false)

  // `pkTusuario` resuelto por el autocompletado de abajo — matrícula asume
  // que estudiante/acudiente YA tienen cuenta (creada acá o en otra alta),
  // así que esto es lo que se manda en el create
  // (`PK_USUARIO_ESTUDIANTE`/`PK_USUARIO_ACUDIENTE`), no un registro nuevo.
  // Va en un ref (no `useState`): todavía no hay nada que lo lea (el
  // guardado real no está armado, ver Fase 4 pendiente) y no debe disparar
  // un re-render — cuando esa parte se conecte, se lee desde acá.
  const pkUsuarioEstudianteRef = useRef<number | null>(null)
  const pkUsuarioAcudienteRef = useRef<number | null>(null)

  // Refleja lo que encontró (o no) el autocompletado por documento —
  // `false` es lo que hace que el correo pase a ser obligatorio más abajo
  // (cuenta nueva, ver `MatriculaAccountsFound`). `null` = todavía sin
  // resolver, no bloquea nada.
  const [studentAccountFound, setStudentAccountFound] = useState<boolean | null>(null)
  const [guardianAccountFound, setGuardianAccountFound] = useState<boolean | null>(null)
  const accountsFound: MatriculaAccountsFound = {
    student: studentAccountFound ?? undefined,
    guardian: guardianAccountFound ?? undefined,
  }

  const initialValuesRef = useRef(createInitialMatriculaValues())

  const isDirty =
    JSON.stringify(values) !== JSON.stringify(initialValuesRef.current) ||
    Object.values(files).some((fileList) => fileList.length > 0)

  const departments = useMemo<DepartmentOption[]>(() => {
    const byName = new Map<string, DepartmentOption["municipalities"]>()
    for (const municipality of municipalities) {
      const list = byName.get(municipality.department.name) ?? []
      list.push({ id: municipality.id, name: municipality.name })
      byName.set(municipality.department.name, list)
    }
    return Array.from(byName.entries()).map(([name, municipalities]) => ({ name, municipalities }))
  }, [municipalities])

  const createMatricula = useCreateMatricula({
    mutationConfig: {
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  useEffect(() => {
    if (!hasSubmitted) return
    setMissingFields(validateMatricula(values, files, fieldSettings, accountsFound))
  }, [values, files, hasSubmitted, fieldSettings, studentAccountFound, guardianAccountFound])

  // Detección de matrícula activa duplicada — mismo criterio que el
  // autocompletado por documento de establecimiento: se dispara por
  // documentType + documentNumber, pero acá recién 600ms después de la
  // última tecla, no en cada cambio — el objetivo es esperar a que el
  // usuario termine de escribir, no consultar en cada dígito.
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
          // Si la consulta falla no se bloquea el alta por eso — el
          // backend real igual va a rechazar el duplicado al guardar.
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
          setValues((prev) => ({
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
          }))
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
          setValues((prev) => ({
            ...prev,
            guardian: {
              ...prev.guardian,
              firstName: found.firstName,
              secondName: found.secondName,
              lastName: found.lastName,
              secondLastName: found.secondLastName,
              // El género tiene que ir en el parche aunque venga vacío. Es el
              // único campo de catálogo que trae el autocompletado, y omitirlo
              // no lo deja "sin tocar": deja el del acudiente ANTERIOR pegado a
              // una persona distinta. Un `""` limpia el select y obliga a
              // elegirlo, que es lo correcto — el 44% de los TUSUARIO no tienen
              // género guardado.
              gender: found.gender,
            },
            guardianContact: {
              ...prev.guardianContact,
              phone: found.phone,
              email: found.email,
            },
          }))
        })
        .catch(() => {
          // Sin cuenta encontrada no se bloquea nada acá — el guardado
          // real decide qué hacer (ver Fase 3, todavía pendiente).
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
    const blank = createInitialMatriculaValues()
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
      navigate({ to: paths.app.coberturaMatricula.getHref() })
    } else {
      resetForm()
    }
  }

  function handleSave(mode: "again" | "close") {
    if (existingMatricula) return
    setHasSubmitted(true)
    const missing = validateMatricula(values, files, fieldSettings, accountsFound)
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
        onSuccess: ({ matricula, homologation, failedOtherDocuments }) => {
          if (homologation) {
            setPendingHomologation({
              matricula,
              info: homologation,
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
      setShowTransferGrades(true)
      return
    }
    const { matricula, mode, failedOtherDocumentsCount } = pendingHomologation
    setPendingHomologation(null)
    finishSave(matricula, mode, "No se homologaron las calificaciones previas.", failedOtherDocumentsCount)
  }

  function handleTransferGradesCancel() {
    if (!pendingHomologation) return
    const { matricula, mode, failedOtherDocumentsCount } = pendingHomologation
    setShowTransferGrades(false)
    setPendingHomologation(null)
    finishSave(
      matricula,
      mode,
      "Las calificaciones previas se homologaron correctamente.",
      failedOtherDocumentsCount,
    )
  }

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button
              render={<Link to={paths.app.coberturaMatricula.getHref()} />}
              variant="fill"
              color="neutral"
              size="sm"
              nativeButton={false}
            >
              Cerrar
            </Button>
          }
        >
          Agregar estudiante
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      <TableScreenBody className="rounded-b-none border-b-0">
        <div id={ADD_MATRICULA_FORM_ID} className="flex flex-col gap-6">
          <MatriculaFormBody
            values={values}
            onChange={setValues}
            catalogs={catalogs}
            departments={departments}
            invalidFields={missingFields}
            showStatus={false}
            fieldSettings={fieldSettings}
          />

          <MatriculaSupportFilesSection
            value={files}
            onChange={setFiles}
            invalidFields={missingFields}
            fieldSettings={fieldSettings}
          />
        </div>
      </TableScreenBody>

      {isDirty && (
        <TableScreenFooter>
          <p className="text-sm text-muted-foreground">
            Se detectaron cambios. Guarda para conservar la información.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              color="primary"
              size="sm"
              disabled={createMatricula.isPending || Boolean(existingMatricula)}
              onClick={() => handleSave("again")}
            >
              {createMatricula.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              Guardar y agregar otro
            </Button>
            <Button
              type="button"
              variant="fill"
              color="primary"
              size="sm"
              disabled={createMatricula.isPending || Boolean(existingMatricula)}
              onClick={() => handleSave("close")}
            >
              {createMatricula.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              Guardar y cerrar
            </Button>
          </div>
        </TableScreenFooter>
      )}

      {pendingHomologation && !showTransferGrades && (
        <HomologationMatriculaDialog
          matricula={pendingHomologation.matricula}
          homologation={pendingHomologation.info}
          onChoice={handleHomologationChoice}
        />
      )}

      {pendingHomologation && showTransferGrades && (
        <TransferGradesDialog
          lastUpdated="15/04/2024"
          originPeriods={MOCK_ORIGIN_PERIODS}
          institutionPeriods={MOCK_INSTITUTION_PERIODS}
          subjectMatches={MOCK_SUBJECT_MATCHES}
          gradePeriodLabels={MOCK_GRADE_PERIOD_LABELS}
          onCancel={handleTransferGradesCancel}
        />
      )}

      {existingMatricula && !duplicateDialogDismissed && (
        <StudentAlreadyMatriculatedDialog
          matricula={existingMatricula}
          onClose={() => {
            setDuplicateDialogDismissed(true)
            // Se limpia el documento para que el usuario tenga que escribirlo
            // de nuevo — no queda el del estudiante que ya está matriculado.
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
