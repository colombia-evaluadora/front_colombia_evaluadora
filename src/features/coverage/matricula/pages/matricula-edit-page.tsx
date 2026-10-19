import { useEffect, useRef, useState } from "react"
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
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMatriculaDetailQuery } from "@/features/coverage/matricula/api/query/use-matricula-detail-query"
import { useMatriculaFieldConfigQuery } from "@/features/coverage/matricula/api/query/use-matricula-field-config-query"
import { useEstablecimientoDeSede } from "@/features/coverage/matricula/api/query/use-establecimiento-de-sede"
import { useMatriculaCampusesQuery } from "@/features/coverage/matricula/api/query/use-matricula-campuses-query"
import { useMatriculaDependentCatalogsQuery } from "@/features/coverage/matricula/api/query/use-matricula-dependent-catalogs-query"
import { useUpdateMatricula } from "@/features/coverage/matricula/api/mutations/update-matricula"
import { findMatriculaUsuarioPorDocumento } from "@/features/coverage/matricula/api/query/use-matricula-usuario-por-documento"
import { useMoveMatricula } from "@/features/coverage/matricula/api/mutations/move-matricula"
import { useMunicipalitiesQuery } from "@/features/establishment/institution/api/query/use-municipalities"
import { MatriculaFormBody } from "@/features/coverage/matricula/components/forms/matricula-form-body"
import { MatriculaToolbar } from "@/features/coverage/matricula/components/matricula-toolbar"
import {
  CambioGradoMatriculaDialog,
  gradeChangeKindLabel,
  moveKindForGradeChange,
  type GradeChangeResult,
} from "@/features/coverage/matricula/components/dialogs/dialog-cambio-grado-matricula"
import {
  CambioMatriculaSummaryDialog,
  type GradeChangeSummary,
} from "@/features/coverage/matricula/components/dialogs/dialog-cambio-matricula-summary"
import {
  CambioSedeMatriculaDialog,
  type CambioSedeConfirmResult,
} from "@/features/coverage/matricula/components/dialogs/dialog-cambio-sede-matricula"
import {
  CambioGrupoMatriculaDialog,
  type GroupChangeResult,
} from "@/features/coverage/matricula/components/dialogs/dialog-cambio-grupo-matricula"
import type { DepartmentOption } from "@/features/coverage/matricula/components/forms/form-create-matricula"
import type {
  BulkGroupChangeClassification,
  CreateMatriculaInput,
  MatriculaStatus,
} from "@/features/coverage/matricula/api/types/matricula"
import {
  getMatriculaFieldErrorMessage,
  pickMatriculaErrorField,
  resolveMatriculaMunicipioDepartments,
  validateMatricula,
} from "@/features/coverage/matricula/utils/matricula-form-defaults"
import { applyGradeFieldRules, buildMatriculaFieldSettings } from "@/features/coverage/matricula/utils/matricula-field-settings"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"

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
  const { puedeEditar, isLoading: permisoCargando } = useMenuPermission("MATRICULA")
  // Sin Guardar, entrar por URL lleva al detalle.
  useEffect(() => {
    if (!permisoCargando && !puedeEditar) {
      navigate({
        to: paths.app.coberturaMatriculaDetalle.getHref(matriculaId),
        search: (prev) => prev,
        replace: true,
      })
    }
  }, [permisoCargando, puedeEditar, navigate, matriculaId])
  const { notify, dismiss } = useNotify()
  const { user } = useAuth()
  const { data, isPending, isError, error } = useMatriculaDetailQuery(matriculaId)
  // La configuración de campos es la del colegio de la sede de la matrícula.
  const colegio = useEstablecimientoDeSede({
    sedeId: data?.details?.sedeId,
    sedeNombre: data?.details?.academic.campus,
  })
  const { data: catalogs } = useMatriculaCampusesQuery()
  const { data: municipalities = [] } = useMunicipalitiesQuery()
  const { data: fieldConfig, isError: isFieldConfigError, error: fieldConfigError } =
    useMatriculaFieldConfigQuery({ establecimientoId: colegio.establecimientoId, enabled: colegio.resuelto })
  const configuredFieldSettings = (fieldConfig ? buildMatriculaFieldSettings(fieldConfig) : undefined)

  useEffect(() => {
    if (isError) notify(getErrorMessage(error), { variant: "error" })
  }, [isError, error, notify])
  useEffect(() => {
    if (isFieldConfigError) notify(getErrorMessage(fieldConfigError), { variant: "error" })
  }, [isFieldConfigError, fieldConfigError, notify])

  const [values, setValues] = useState<CreateMatriculaInput | null>(null)
  const grade = values?.academic.grade
  const fieldSettings = applyGradeFieldRules(configuredFieldSettings, grade)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  // Valores tal como llegaron: base para detectar cambios de grado, sede, grupo y acudiente.
  const [inicial, setInicial] = useState<CreateMatriculaInput | null>(null)
  const initialGrade = inicial?.academic.grade || null
  const initialSede = inicial?.academic.campus || null
  // Por id: dos colegios pueden tener sedes con el mismo nombre.
  const initialSedeId = inicial?.academic.campusId || null
  const initialGroup = inicial?.academic.group || null
  // Si el documento cambia, se sustituye al acudiente (ver `performSave`).
  const initialGuardianDocument = inicial?.guardian ?? null
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

  // Estado ajustado durante el render (sin efecto): se siembra una vez y el estado sigue al backend.
  if (data?.status === "ok" && data.details && values === null && municipalities.length > 0) {
    const resolved = resolveMatriculaMunicipioDepartments(data.details, municipalities)
    setValues(resolved)
    setInicial(resolved)
  }
  const nextStatus = data?.status === "ok" ? data.details?.academic.status : undefined
  if (nextStatus && values && nextStatus !== values.academic.status) {
    setValues({ ...values, academic: { ...values.academic, status: nextStatus } })
  }

  const guardianDocumentType = values?.guardian.documentType ?? ""
  const guardianDocumentNumber = values?.guardian.documentNumber ?? ""
  useEffect(() => {
    const original = initialGuardianDocument
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
                    // Sin esto quedaba el género del acudiente que sale.
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
        })
    }, 600)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [guardianDocumentType, guardianDocumentNumber, initialGuardianDocument])

  const { data: dependentCatalogs } = useMatriculaDependentCatalogsQuery({
    campusId: values?.academic.campusId || undefined,
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
  const saving = updateMatricula.isPending

  function performSave(onSaved?: () => void) {
    if (!values || !data?.details || saving) return

    const { pkUsuarioEstudiante, pkUsuarioAcudiente } = data.details
    const originalGuardianDocument = initialGuardianDocument
    const guardianReplaced =
      originalGuardianDocument != null &&
      (values.guardian.documentType !== originalGuardianDocument.documentType ||
        values.guardian.documentNumber !== originalGuardianDocument.documentNumber)

    updateMatricula.mutate(
      {
        id: matriculaId,
        values,
        pkTpadre: data.details.pkTpadre,
        pkUsuarioEstudiante,
        pkUsuarioAcudiente,
        guardianReplaced,
      },
      {
        onSuccess: () => {
          if (onSaved) {
            onSaved()
            return
          }
          notify(SUCCESS_MESSAGES.matricula.updated)
          navigate({ to: paths.app.coberturaMatriculaDetalle.getHref(matriculaId), search: (prev) => prev })
        },
      },
    )
  }

  function handleGradeChangeCancel() {
    if (gradeChange && values && initialGrade) {
      setValues({ ...values, academic: { ...values.academic, grade: initialGrade } })
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
    navigate({ to: paths.app.coberturaMatriculaDetalle.getHref(summaryNavigateIdRef.current), search: (prev) => prev })
  }

  function handleSedeChangeCancel() {
    if (sedeChange && values && initialSede) {
      setValues({
        ...values,
        academic: {
          ...values.academic,
          campus: initialSede,
          campusId: initialSedeId ?? values.academic.campusId,
        },
      })
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
    if (groupChange && values && initialGroup) {
      setValues({ ...values, academic: { ...values.academic, group: initialGroup } })
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

    const originalSede = initialSede
    const currentSede = values.academic.campus
    const originalSedeId = initialSedeId
    const currentSedeId = values.academic.campusId
    const cambioDeSede =
      originalSedeId && currentSedeId
        ? originalSedeId !== currentSedeId
        : Boolean(originalSede && currentSede && originalSede !== currentSede)
    if (originalSede && currentSede && cambioDeSede) {
      const originalGrade = Number(initialGrade)
      const currentGrade = Number(values.academic.grade)
      const etiqueta = (id: string | null | undefined, nombre: string) =>
        catalogs?.sedes.find((sede) => sede.id === id)?.label ?? nombre
      setSedeChange({
        fromSede: etiqueta(originalSedeId, originalSede),
        toSede: etiqueta(currentSedeId, currentSede),
        fromGrade: originalGrade,
        toGrade: currentGrade,
        fromGroup: data?.matricula?.group ?? "",
        toGroup: values.academic.group,
      })
      return
    }

    const original = initialGrade
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


    const originalGroup = initialGroup
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
              render={<Link to={paths.app.coberturaMatricula.getHref()} search={(prev) => prev} />}
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
          {getErrorMessage(error)}
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
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? (
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
        <CambioGradoMatriculaDialog
          modo="individual"
          open
          fromGrade={gradeChange.from}
          toGrade={gradeChange.to}
          onConfirm={handleGradeChangeConfirm}
          onClose={handleGradeChangeCancel}
        />
      )}

      <CambioMatriculaSummaryDialog
        modo="individual"
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
        <CambioGrupoMatriculaDialog
          modo="individual"
          open
          fromGroup={data?.matricula?.group ?? groupChange.from}
          toGroup={toGroupCodigo ?? groupChange.to}
          hasGrades={data?.matricula?.hasGrades ?? false}
          onConfirm={handleGroupChangeConfirm}
          onClose={handleGroupChangeCancel}
        />
      )}
    </TableScreen>
  )
}
