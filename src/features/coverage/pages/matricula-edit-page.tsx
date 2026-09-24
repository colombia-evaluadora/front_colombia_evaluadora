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
import { coberturaMatriculaEditarRoute } from "@/router"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMatriculaDetailQuery } from "@/features/coverage/api/query/use-matricula-detail-query"
import { useMatriculaFieldConfigQuery } from "@/features/coverage/api/query/use-matricula-field-config-query"
import { useMatriculaCampusesQuery } from "@/features/coverage/api/query/use-matricula-campuses-query"
import { useMatriculaDependentCatalogsQuery } from "@/features/coverage/api/query/use-matricula-dependent-catalogs-query"
import { useUpdateMatricula } from "@/features/coverage/api/mutations/update-matricula"
import { updatePersona } from "@/features/coverage/api/mutations/update-persona"
import { registerMatriculaPersona } from "@/features/coverage/api/mutations/register-matricula-persona"
import { findMatriculaUsuarioPorDocumento } from "@/features/coverage/api/query/use-matricula-usuario-por-documento"
import { useMoveMatricula } from "@/features/coverage/api/mutations/move-matricula"
import { useMunicipalitiesQuery } from "@/features/establishment/institution/api/query/use-municipalities"
import { MatriculaFormBody } from "@/features/coverage/components/forms/matricula-form-body"
import { MatriculaToolbar } from "@/features/coverage/components/matricula-toolbar"
import {
  GradeChangeDialog,
  gradeChangeKindLabel,
  moveKindForGradeChange,
  type GradeChangeResult,
} from "@/features/coverage/components/dialogs/dialog-grade-change"
import {
  GradeChangeSummaryDialog,
  type GradeChangeSummary,
} from "@/features/coverage/components/dialogs/dialog-grade-change-summary"
import {
  CambioSedeMatriculaDialog,
  type CambioSedeConfirmResult,
} from "@/features/coverage/components/dialogs/dialog-cambio-sede-matricula"
import {
  GroupChangeDialog,
  type GroupChangeResult,
} from "@/features/coverage/components/dialogs/dialog-group-change"
import type { DepartmentOption } from "@/features/coverage/components/forms/form-create-matricula"
import type {
  BulkGroupChangeClassification,
  CreateMatriculaInput,
  MatriculaStatus,
} from "@/features/coverage/api/types/matricula"
import {
  getMatriculaFieldErrorMessage,
  pickMatriculaErrorField,
  resolveMatriculaMunicipioDepartments,
  validateMatricula,
} from "@/features/coverage/utils/matricula-form-defaults"
import { buildMatriculaFieldSettings } from "@/features/coverage/utils/matricula-field-settings"

const EDIT_MATRICULA_FORM_ID = "edit-matricula-form"

const NOT_EDITABLE_STATUSES: MatriculaStatus[] = ["Reubicado", "Promovido"]

const SEDE_CLASSIFICATION_LABELS: Record<BulkGroupChangeClassification, string> = {
  cambioGrado: "Reubicación de sede",
  correccion: "Corrección de matrícula",
}

export function MatriculaEditPage() {
  return (
    <NoticeProvider>
      <MatriculaEditPageContent />
    </NoticeProvider>
  )
}

function MatriculaEditPageContent() {
  const { matriculaId } = coberturaMatriculaEditarRoute.useParams()
  const navigate = useNavigate()
  const { notify, dismiss } = useNotify()
  const { user } = useAuth()
  const { data, isPending, isError, error } = useMatriculaDetailQuery(matriculaId)
  const { data: catalogs } = useMatriculaCampusesQuery()
  const { data: municipalities = [] } = useMunicipalitiesQuery()
  const { data: fieldConfig, isError: isFieldConfigError, error: fieldConfigError } =
    useMatriculaFieldConfigQuery()
  const fieldSettings = useMemo(
    () => (fieldConfig ? buildMatriculaFieldSettings(fieldConfig) : undefined),
    [fieldConfig],
  )

  useEffect(() => {
    if (isError) notify(getErrorMessage(error), { variant: "error" })
  }, [isError, error, notify])
  useEffect(() => {
    if (isFieldConfigError) notify(getErrorMessage(fieldConfigError), { variant: "error" })
  }, [isFieldConfigError, fieldConfigError, notify])

  const [values, setValues] = useState<CreateMatriculaInput | null>(null)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const initialGradeRef = useRef<string | null>(null)
  const initialSedeRef = useRef<string | null>(null)
  const initialGroupRef = useRef<string | null>(null)
  // Documento con el que se cargó el acudiente -- si el usuario lo cambia
  // en el formulario, ya no es "editar en sitio" sino sustituir por otra
  // persona (ver `performSave`).
  const initialGuardianDocumentRef = useRef<{ documentType: string; documentNumber: string } | null>(null)
  const [gradeChange, setGradeChange] = useState<{ from: number; to: number } | null>(null)
  const [gradeChangeSummary, setGradeChangeSummary] = useState<GradeChangeSummary | null>(null)
  const summaryNavigateIdRef = useRef(matriculaId)
  const [sedeChange, setSedeChange] = useState<{
    fromSede: string
    toSede: string
    fromGrade: number
    toGrade: number
    fromGroup: string
    toGroup: string
  } | null>(null)
  const [groupChange, setGroupChange] = useState<{ from: string; to: string } | null>(null)

  useEffect(() => {
    if (data?.status === "ok" && data.details && values === null && municipalities.length > 0) {
      const resolved = resolveMatriculaMunicipioDepartments(data.details, municipalities)
      setValues(resolved)
      initialGradeRef.current = resolved.academic.grade
      initialSedeRef.current = resolved.academic.campus
      initialGroupRef.current = resolved.academic.group
      initialGuardianDocumentRef.current = {
        documentType: resolved.guardian.documentType,
        documentNumber: resolved.guardian.documentNumber,
      }
    }
  }, [data, values, municipalities])

  useEffect(() => {
    const nextStatus = data?.status === "ok" ? data.details?.academic.status : undefined
    if (nextStatus && values && nextStatus !== values.academic.status) {
      setValues({ ...values, academic: { ...values.academic, status: nextStatus } })
    }
  }, [data, values])

  const guardianDocumentType = values?.guardian.documentType ?? ""
  const guardianDocumentNumber = values?.guardian.documentNumber ?? ""
  useEffect(() => {
    const original = initialGuardianDocumentRef.current
    const changed =
      original != null &&
      (guardianDocumentType !== original.documentType || guardianDocumentNumber !== original.documentNumber)
    if (!changed) return

    const documentTypeId = Number(guardianDocumentType)
    const trimmed = guardianDocumentNumber.trim()
    if (!documentTypeId || trimmed.length < 6) return

    let cancelled = false
    const timeout = setTimeout(() => {
      findMatriculaUsuarioPorDocumento(documentTypeId, trimmed)
        .then((found) => {
          if (cancelled || !found) return
          setValues((prev) =>
            prev
              ? {
                  ...prev,
                  guardian: {
                    ...prev.guardian,
                    firstName: found.firstName,
                    secondName: found.secondName,
                    lastName: found.lastName,
                    secondLastName: found.secondLastName,
                    // Sin esto el género se quedaba con el del acudiente que
                    // SALE, que es peor que dejarlo vacío: si la persona nueva
                    // no tiene cuenta, `performSave` llama a
                    // `registerMatriculaPersona` con `values.guardian.gender`
                    // y la registraría con el género del anterior.
                    gender: found.gender,
                  },
                  guardianContact: {
                    ...prev.guardianContact,
                    phone: found.phone,
                    email: found.email,
                  },
                }
              : prev,
          )
        })
        .catch(() => {
          // Sin cuenta encontrada no se bloquea nada acá -- el guardado
          // real (`performSave`) decide si crea una persona nueva.
        })
    }, 600)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [guardianDocumentType, guardianDocumentNumber])

  const { data: dependentCatalogs } = useMatriculaDependentCatalogsQuery({
    campus: values?.academic.campus || undefined,
    shift: values?.academic.shift || undefined,
    grade: values?.academic.grade ? Number(values.academic.grade) : undefined,
  })
  const toGroupCodigo = dependentCatalogs.groups.find(
    (g) => String(g.id) === values?.academic.group,
  )?.codigo

  const departments: DepartmentOption[] = (() => {
    const byName = new Map<string, DepartmentOption["municipalities"]>()
    for (const municipality of municipalities) {
      const list = byName.get(municipality.department.name) ?? []
      list.push({ id: municipality.id, name: municipality.name })
      byName.set(municipality.department.name, list)
    }
    return Array.from(byName.entries()).map(([name, municipalities]) => ({ name, municipalities }))
  })()

  const updateMatricula = useUpdateMatricula({
    mutationConfig: {
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  const moveMatricula = useMoveMatricula({
    mutationConfig: {
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  useEffect(() => {
    if (!hasSubmitted || !values) return
    setMissingFields(validateMatricula(values, undefined, fieldSettings))
  }, [values, hasSubmitted, fieldSettings])

  useEffect(() => {
    if (missingFields.length === 0) {
      dismiss()
      return
    }
    if (!values) return
    notify(getMatriculaFieldErrorMessage(pickMatriculaErrorField(missingFields, values), values), {
      variant: "error",
      autoCloseMs: 0,
    })
  }, [missingFields, values, notify, dismiss])
  async function performSave(onSaved?: () => void) {
    if (!values || !data?.details) return

    const { pkUsuarioEstudiante, pkUsuarioAcudiente } = data.details
    const originalGuardianDocument = initialGuardianDocumentRef.current
    // Documento distinto al que traía la matrícula = sustituir al
    // acudiente por otra persona (caso 3), no editar al actual.
    const guardianReplaced =
      originalGuardianDocument != null &&
      (values.guardian.documentType !== originalGuardianDocument.documentType ||
        values.guardian.documentNumber !== originalGuardianDocument.documentNumber)

    let resolvedPkUsuarioAcudiente = pkUsuarioAcudiente
    let actualizarAcudiente = false
    try {
      if (pkUsuarioEstudiante != null) {
        await updatePersona(pkUsuarioEstudiante, {
          documentTypeId: values.student.documentType,
          documentNumber: values.student.documentNumber,
          firstName: values.student.firstName,
          secondName: values.student.secondName,
          lastName: values.student.lastName,
          secondLastName: values.student.secondLastName,
          birthDate: values.student.birthDate,
          genderId: values.student.gender,
          phone: values.studentContact.phone,
          email: values.studentContact.email,
        })
      }
      if (guardianReplaced) {
        // Mismo patrón que el alta: primero se busca si la persona ya
        // tiene cuenta (autocompletar por documento); solo si no existe se
        // crea por /register/usuario. Estos campos alimentan el alta del
        // nuevo, no editan los datos del que sale.
        const documentTypeId = Number(values.guardian.documentType)
        const found = await findMatriculaUsuarioPorDocumento(documentTypeId, values.guardian.documentNumber)
        if (found) {
          resolvedPkUsuarioAcudiente = found.pkTusuario
        } else {
          const result = await registerMatriculaPersona({
            documentTypeId,
            documentNumber: values.guardian.documentNumber,
            firstName: values.guardian.firstName,
            secondName: values.guardian.secondName,
            lastName: values.guardian.lastName,
            secondLastName: values.guardian.secondLastName,
            genderId: values.guardian.gender ? Number(values.guardian.gender) : undefined,
            phone: values.guardianContact.phone,
            email: values.guardianContact.email,
          })
          resolvedPkUsuarioAcudiente = result.pkTusuario
        }
      } else if (pkUsuarioAcudiente != null) {
        await updatePersona(pkUsuarioAcudiente, {
          documentTypeId: values.guardian.documentType,
          documentNumber: values.guardian.documentNumber,
          firstName: values.guardian.firstName,
          secondName: values.guardian.secondName,
          lastName: values.guardian.lastName,
          secondLastName: values.guardian.secondLastName,
          genderId: values.guardian.gender,
          phone: values.guardianContact.phone,
          email: values.guardianContact.email,
        })
        actualizarAcudiente = true
      }
    } catch (error) {
      notify(getErrorMessage(error), { variant: "error" })
      return
    }

    updateMatricula.mutate(
      {
        id: matriculaId,
        values,
        pkTpadre: data.details.pkTpadre,
        pkUsuarioAcudiente: resolvedPkUsuarioAcudiente,
        actualizarAcudiente,
      },
      {
        onSuccess: (result) => {
          if (result.status === "error") {
            notify(result.message, { variant: "error" })
            return
          }
          if (onSaved) {
            onSaved()
            return
          }
          notify("Matrícula actualizada correctamente.")
          navigate({ to: paths.app.coberturaMatriculaDetalle.getHref(matriculaId) })
        },
      },
    )
  }

  function handleGradeChangeCancel() {
    if (gradeChange && values && initialGradeRef.current) {
      setValues({ ...values, academic: { ...values.academic, grade: initialGradeRef.current } })
    }
    setGradeChange(null)
  }

  function handleGradeChangeConfirm(result: GradeChangeResult) {
    if (!gradeChange || !values || !data?.matricula) {
      setGradeChange(null)
      return
    }
    const currentGradeChange = gradeChange
    const isSuperior = currentGradeChange.to > currentGradeChange.from
    const moveKind = moveKindForGradeChange(result.kind, isSuperior)
    const toGroup = values.academic.group
    const studentName = `${data.matricula.firstName} ${data.matricula.lastName}`
    setGradeChange(null)
    performSave(() => {
      moveMatricula.mutate(
        {
          kind: moveKind,
          ids: [Number(matriculaId)],
          grupoDestino: Number(toGroup),
          motivo: moveKind !== "corregir" ? result.reason : undefined,
          soporte: moveKind !== "corregir" ? result.supportFile : undefined,
        },
        {
          onSuccess: (moveResult) => {
            const moved = moveResult?.matriculas?.[0]
            summaryNavigateIdRef.current = String(moved?.pkTmatriculaNueva ?? matriculaId)
            setGradeChangeSummary({
              studentName,
              movementKind: "grado",
              movementLabel: gradeChangeKindLabel(result.kind, isSuperior),
              fromCampus: values.academic.campus,
              toCampus: values.academic.campus,
              fromGrade: currentGradeChange.from,
              toGrade: currentGradeChange.to,
              fromGroup: moved?.anterior.grupo ?? data?.matricula?.group ?? "",
              toGroup: moved?.nuevo.grupo ?? toGroupCodigo ?? "",
              gradesAction: result.gradesAction,
              date: new Date(),
              userName: user?.name ?? "",
            })
          },
        },
      )
    })
  }

  function handleGradeChangeSummaryClose() {
    setGradeChangeSummary(null)
    navigate({ to: paths.app.coberturaMatriculaDetalle.getHref(summaryNavigateIdRef.current) })
  }

  function handleSedeChangeCancel() {
    if (sedeChange && values && initialSedeRef.current) {
      setValues({ ...values, academic: { ...values.academic, campus: initialSedeRef.current } })
    }
    setSedeChange(null)
  }

  function handleSedeChangeConfirm(result: CambioSedeConfirmResult) {
    if (!sedeChange || !values || !data?.matricula) {
      setSedeChange(null)
      return
    }
    const currentSedeChange = sedeChange
    const moveKind = result.classification === "cambioGrado" ? "reubicar" : "corregir"
    const studentName = `${data.matricula.firstName} ${data.matricula.lastName}`
    setSedeChange(null)
    performSave(() => {
      moveMatricula.mutate(
        {
          kind: moveKind,
          ids: [Number(matriculaId)],
          grupoDestino: Number(currentSedeChange.toGroup),
          motivo: moveKind !== "corregir" ? result.reason : undefined,
          soporte: moveKind !== "corregir" ? result.supportFile : undefined,
        },
        {
          onSuccess: (moveResult) => {
            const moved = moveResult?.matriculas?.[0]
            summaryNavigateIdRef.current = String(moved?.pkTmatriculaNueva ?? matriculaId)
            setGradeChangeSummary({
              studentName,
              movementKind: "sede",
              movementLabel: SEDE_CLASSIFICATION_LABELS[result.classification],
              fromCampus: currentSedeChange.fromSede,
              toCampus: currentSedeChange.toSede,
              fromGrade: currentSedeChange.fromGrade,
              toGrade: currentSedeChange.toGrade,
              fromGroup: moved?.anterior.grupo ?? data?.matricula?.group ?? "",
              toGroup: moved?.nuevo.grupo ?? toGroupCodigo ?? "",
              // El cambio de sede no pregunta por calificaciones (ver
              // `dialog-cambio-sede-matricula.tsx`).
              gradesAction: null,
              date: new Date(),
              userName: user?.name ?? "",
            })
          },
        },
      )
    })
  }

  function handleGroupChangeCancel() {
    if (groupChange && values && initialGroupRef.current) {
      setValues({ ...values, academic: { ...values.academic, group: initialGroupRef.current } })
    }
    setGroupChange(null)
  }

  function handleGroupChangeConfirm(result: GroupChangeResult) {
    if (!groupChange || !values || !data?.matricula) {
      setGroupChange(null)
      return
    }
    const currentGroupChange = groupChange
    const studentName = `${data.matricula.firstName} ${data.matricula.lastName}`
    setGroupChange(null)
    performSave(() => {
      moveMatricula.mutate(
        {
          kind: "corregir",
          ids: [Number(matriculaId)],
          grupoDestino: Number(currentGroupChange.to),
        },
        {
          onSuccess: (moveResult) => {
            const moved = moveResult?.matriculas?.[0]
            summaryNavigateIdRef.current = matriculaId
            setGradeChangeSummary({
              studentName,
              movementKind: "grupo",
              movementLabel: "Corrección de matrícula (Cambio de grupo)",
              fromCampus: values.academic.campus,
              toCampus: values.academic.campus,
              fromGrade: Number(values.academic.grade),
              toGrade: Number(values.academic.grade),
              fromGroup: moved?.anterior.grupo ?? data?.matricula?.group ?? "",
              toGroup: moved?.nuevo.grupo ?? toGroupCodigo ?? "",
              gradesAction: result.gradesAction,
              date: new Date(),
              userName: user?.name ?? "",
            })
          },
        },
      )
    })
  }

  function handleSave() {
    if (!values) return
    setHasSubmitted(true)
    const missing = validateMatricula(values, undefined, fieldSettings)
    setMissingFields(missing)
    if (missing.length > 0) return

    const originalSede = initialSedeRef.current
    const currentSede = values.academic.campus
    if (originalSede && currentSede && originalSede !== currentSede) {
      const originalGrade = Number(initialGradeRef.current)
      const currentGrade = Number(values.academic.grade)
      setSedeChange({
        fromSede: originalSede,
        toSede: currentSede,
        fromGrade: originalGrade,
        toGrade: currentGrade,
        fromGroup: data?.matricula?.group ?? "",
        toGroup: values.academic.group,
      })
      return
    }

    const original = initialGradeRef.current
    const current = values.academic.grade
    if (
      original &&
      current &&
      original !== current &&
      !Number.isNaN(Number(original)) &&
      !Number.isNaN(Number(current))
    ) {
      setGradeChange({ from: Number(original), to: Number(current) })
      return
    }


    const originalGroup = initialGroupRef.current
    const currentGroup = values.academic.group
    if (originalGroup && currentGroup && originalGroup !== currentGroup) {
      setGroupChange({ from: originalGroup, to: currentGroup })
      return
    }

    performSave()
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
          Editar Matrícula
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      {isPending && (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <SpinnerIcon className="animate-spin" />
          Cargando…
        </div>
      )}

      {isError && (
        <div className="p-10 text-center text-sm text-destructive">
          No se pudo cargar la matrícula.
        </div>
      )}

      {data?.status === "ok" &&
        data.matricula &&
        NOT_EDITABLE_STATUSES.includes(data.matricula.status) && (
          <div className="p-10 text-center text-sm text-destructive">
            Esta matrícula está {data.matricula.status.toLowerCase()} y no se puede editar.
          </div>
        )}

      {data?.status === "ok" &&
        data.matricula &&
        values &&
        !NOT_EDITABLE_STATUSES.includes(data.matricula.status) && (
        <>
          <TableScreenBody className="rounded-b-none border-b-0">
            <div id={EDIT_MATRICULA_FORM_ID} className="flex flex-col gap-6">
              <MatriculaToolbar matricula={data.matricula} showModificar={false} filesEditable />
              <MatriculaFormBody
                values={values}
                onChange={setValues}
                catalogs={catalogs}
                departments={departments}
                invalidFields={missingFields}
                fieldSettings={fieldSettings}
                academicDisabled={data.matricula.status !== "Cursando"}
              />
            </div>
          </TableScreenBody>

          <TableScreenFooter>
            <p className="text-sm text-muted-foreground">Completa la información antes de guardar.</p>
            <Button
              type="button"
              variant="fill"
              color="primary"
              size="sm"
              disabled={updateMatricula.isPending}
              onClick={handleSave}
            >
              {updateMatricula.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              Guardar
            </Button>
          </TableScreenFooter>
        </>
      )}

      {data?.status === "error" && (
        <div className="p-10 text-center text-sm text-destructive">{data.message}</div>
      )}

      {gradeChange && (
        <GradeChangeDialog
          open
          currentGrade={gradeChange.from}
          newGrade={gradeChange.to}
          onConfirm={handleGradeChangeConfirm}
          onCancel={handleGradeChangeCancel}
        />
      )}

      <GradeChangeSummaryDialog
        open={gradeChangeSummary != null}
        summary={gradeChangeSummary}
        onClose={handleGradeChangeSummaryClose}
      />

      {sedeChange && (
        <CambioSedeMatriculaDialog
          open
          fromSede={sedeChange.fromSede}
          toSede={sedeChange.toSede}
          fromGrade={sedeChange.fromGrade}
          toGrade={sedeChange.toGrade}
          fromGroup={sedeChange.fromGroup}
          toGroup={toGroupCodigo ?? sedeChange.toGroup}
          gradeWillChange={sedeChange.fromGrade !== sedeChange.toGrade}
          sameOrigin
          onConfirm={handleSedeChangeConfirm}
          onClose={handleSedeChangeCancel}
        />
      )}

      {groupChange && (
        <GroupChangeDialog
          open
          currentGroup={data?.matricula?.group ?? groupChange.from}
          newGroup={toGroupCodigo ?? groupChange.to}
          hasGrades={data?.matricula?.hasGrades ?? false}
          onConfirm={handleGroupChangeConfirm}
          onCancel={handleGroupChangeCancel}
        />
      )}
    </TableScreen>
  )
}
