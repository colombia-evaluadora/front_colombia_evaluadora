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
import { useCreateMatricula } from "@/features/coverage/api/mutations/create-matricula"
import { checkMatriculaByDocument } from "@/features/coverage/api/query/use-matricula-document-check"
import { useReservationCatalogsQuery } from "@/features/coverage/api/query/use-reservation-catalogs-query"
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
  REQUIRED_MATRICULA_FIELD_LABELS,
  createEmptySupportFiles,
  createInitialMatriculaValues,
  validateMatricula,
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
  const { data: catalogs } = useReservationCatalogsQuery()
  const { data: municipalities = [] } = useMunicipalitiesQuery()

  const [values, setValues] = useState<CreateMatriculaInput>(createInitialMatriculaValues)
  const [files, setFiles] = useState<MatriculaSupportFiles>(createEmptySupportFiles)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const [pendingHomologation, setPendingHomologation] = useState<{
    matricula: Matricula
    info: MatriculaHomologationInfo
    mode: "again" | "close"
  } | null>(null)
  // Se activa cuando el usuario elige "Sí, homologar" — reemplaza el diálogo
  // de confirmación por el wizard de traslado de calificaciones (mismo
  // `pendingHomologation` de fondo, todavía sin cerrar el alta).
  const [showTransferGrades, setShowTransferGrades] = useState(false)

  // Se llena cuando `checkMatriculaByDocument` encuentra una matrícula
  // "activo" con el mismo documento — bloquea el guardado hasta que el
  // usuario corrija el documento (ver el `useEffect` con debounce, abajo).
  const [existingMatricula, setExistingMatricula] = useState<Matricula | null>(null)
  // Cerrar el modal ("Entendido") solo lo saca de pantalla — el guardado
  // sigue bloqueado (`existingMatricula` no se limpia) hasta que el usuario
  // de verdad cambie el documento, que es lo que reabre el chequeo abajo.
  const [duplicateDialogDismissed, setDuplicateDialogDismissed] = useState(false)

  const initialValuesRef = useRef(createInitialMatriculaValues())

  const isDirty =
    JSON.stringify(values) !== JSON.stringify(initialValuesRef.current) ||
    Object.values(files).some((fileList) => fileList.length > 0)

  const departments = useMemo<DepartmentOption[]>(() => {
    const byName = new Map<string, Set<string>>()
    for (const municipality of municipalities) {
      const set = byName.get(municipality.department.name) ?? new Set<string>()
      set.add(municipality.name)
      byName.set(municipality.department.name, set)
    }
    return Array.from(byName.entries()).map(([name, set]) => ({
      name,
      municipalities: Array.from(set),
    }))
  }, [municipalities])

  const createMatricula = useCreateMatricula({
    mutationConfig: {
      onError: () => {
        notify("No se pudo matricular al estudiante.", { variant: "error" })
      },
    },
  })

  useEffect(() => {
    if (!hasSubmitted) return
    setMissingFields(validateMatricula(values, files))
  }, [values, files, hasSubmitted])

  // Detección de matrícula activa duplicada — mismo criterio que el
  // autocompletado por documento de establecimiento: se dispara por
  // documentType + documentNumber, pero acá recién 600ms después de la
  // última tecla, no en cada cambio — el objetivo es esperar a que el
  // usuario termine de escribir, no consultar en cada dígito.
  const { documentType, documentNumber } = values.student
  useEffect(() => {
    // Cualquier cambio en el documento reabre la posibilidad de bloquear de
    // nuevo — si el usuario ya había cerrado el aviso para un documento y lo
    // vuelve a escribir igual, tiene que volver a verlo.
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

  useEffect(() => {
    if (missingFields.length === 0) {
      dismiss()
      return
    }
    const labels = missingFields.map((id) => REQUIRED_MATRICULA_FIELD_LABELS[id] ?? id)
    notify(`Faltan campos obligatorios: ${labels.join(", ")}.`, {
      variant: "error",
      autoCloseMs: 0,
    })
  }, [missingFields, notify, dismiss])

  function resetForm() {
    const blank = createInitialMatriculaValues()
    setValues(blank)
    setFiles(createEmptySupportFiles())
    initialValuesRef.current = blank
    setMissingFields([])
    setHasSubmitted(false)
    dismiss()
  }

  function finishSave(matricula: Matricula, mode: "again" | "close", extraMessage?: string) {
    const base = `Estudiante ${matricula.firstName} ${matricula.lastName} matriculado correctamente.`
    notify(extraMessage ? `${base} ${extraMessage}` : base)
    if (mode === "close") {
      navigate({ to: paths.app.coberturaMatricula.getHref() })
    } else {
      resetForm()
    }
  }

  function handleSave(mode: "again" | "close") {
    if (existingMatricula) return
    setHasSubmitted(true)
    const missing = validateMatricula(values, files)
    setMissingFields(missing)
    if (missing.length > 0) return

    createMatricula.mutate(values, {
      onSuccess: ({ matricula, homologation }) => {
        if (homologation) {
          setPendingHomologation({ matricula, info: homologation, mode })
          return
        }
        finishSave(matricula, mode)
      },
    })
  }

  function handleHomologationChoice(homologate: boolean) {
    if (!pendingHomologation) return
    if (homologate) {
      setShowTransferGrades(true)
      return
    }
    const { matricula, mode } = pendingHomologation
    setPendingHomologation(null)
    finishSave(matricula, mode, "No se homologaron las calificaciones previas.")
  }

  function handleTransferGradesCancel() {
    if (!pendingHomologation) return
    const { matricula, mode } = pendingHomologation
    setShowTransferGrades(false)
    setPendingHomologation(null)
    finishSave(matricula, mode, "Las calificaciones previas se homologaron correctamente.")
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
          />

          <MatriculaSupportFilesSection value={files} onChange={setFiles} invalidFields={missingFields} />
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
