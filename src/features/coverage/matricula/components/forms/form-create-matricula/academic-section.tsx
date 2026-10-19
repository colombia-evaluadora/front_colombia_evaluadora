import { useEffect } from "react"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { useMatriculaDependentCatalogsQuery } from "@/features/coverage/matricula/api/query/use-matricula-dependent-catalogs-query"
import { usePeriodoResolverMatriculaQuery } from "@/features/coverage/matricula/api/query/use-periodo-resolver-matricula"
import { useSedeOptionsQuery } from "@/features/establishment/academic-period/api/query/use-sede-options"
import { resolverSede } from "@/features/coverage/matricula/utils/sede-matricula"
import { useSedeJornadasActivasQuery } from "@/features/establishment/employees/api/query/use-sede-jornadas"
import { useEspecialidadesQuery } from "@/features/establishment/academic-period/api/query/use-especialidades"
import { isFieldRequired, isFieldVisible, type MatriculaFieldSettingsMap } from "@/features/coverage/matricula/utils/matricula-field-settings"
import { MATRICULA_STATUSES } from "@/features/coverage/matricula/api/ui-mappings"
import type { MatriculaAcademicInfo, MatriculaCampusCatalog } from "@/features/coverage/matricula/api/types/matricula"
import { MatriculaFormSection, MatriculaSelectField } from "./fields"

interface AcademicSectionProps {
  value: MatriculaAcademicInfo
  onChange: (value: MatriculaAcademicInfo) => void
  catalogs?: MatriculaCampusCatalog
  invalidFields?: string[]
  showStatus?: boolean
  fieldSettings?: MatriculaFieldSettingsMap
  academicDisabled?: boolean
}

export function MatriculaAcademicSection({
  value,
  onChange,
  catalogs,
  invalidFields = [],
  showStatus = true,
  fieldSettings,
  academicDisabled,
}: AcademicSectionProps) {
  // Sede → Jornada → Grado → Grupo — mismo criterio que "Modificar" (ver
  // `dialog-modificar-matricula.tsx` y `use-matricula-dependent-catalogs-query.ts`).
  const { data: dependentCatalogs, isPeriodoError, periodoError } = useMatriculaDependentCatalogsQuery({
    campusId: value.campusId || undefined,
    campus: value.campus || undefined,
    shift: value.shift || undefined,
    grade: value.grade ? Number(value.grade) : undefined,
  })
  const gradoNombreByValor = new Map(
    (dependentCatalogs?.grades ?? []).map((grado) => [String(grado.valor), grado.nombre]),
  )

  const { notify } = useNotify()
  useEffect(() => {
    if (isPeriodoError) notify(getErrorMessage(periodoError), { variant: "error" })
  }, [isPeriodoError, periodoError, notify])


  const { data: sedes } = useSedeOptionsQuery()
  const sedeId = resolverSede(sedes, { campusId: value.campusId, campus: value.campus }).sede?.pk_sede
  // El select guarda el id; un valor viejo que solo trae el nombre se muestra
  // igual si ese nombre es único.
  const campusIdEfectivo = value.campusId || (sedeId != null ? String(sedeId) : "")
  const sedeOptions = catalogs?.sedes ?? []
  const etiquetaSede = new Map(sedeOptions.map((sede) => [sede.id, sede.label]))
  const { data: jornadasActivas } = useSedeJornadasActivasQuery(sedeId ?? null)
  const jornadaId = value.shift ? jornadasActivas?.find((j) => j.nombre === value.shift)?.id : undefined
  const { data: periodoId } = usePeriodoResolverMatriculaQuery(sedeId ?? null, jornadaId ?? null)
  const { data: especialidades } = useEspecialidadesQuery(periodoId ?? undefined)
  const especialidadNombreById = new Map((especialidades ?? []).map((e) => [String(e.id), e.label]))

  return (
    <MatriculaFormSection title="Información de matrícula">
      <MatriculaSelectField
        id="matricula-campus"
        label="Sede"
        required
        value={campusIdEfectivo}
        options={sedeOptions.map((sede) => sede.id)}
        labelFor={(id) => etiquetaSede.get(id) ?? id}
        disabled={academicDisabled}
        invalid={invalidFields.includes("matricula-campus")}
        onChange={(id) =>
          onChange({
            ...value,
            campusId: id,
            campus: sedeOptions.find((sede) => sede.id === id)?.nombre ?? "",
            shift: "",
            grade: "",
            group: "",
          })
        }
      />
      <MatriculaSelectField
        id="matricula-shift"
        label="Jornada"
        required
        value={value.shift}
        options={dependentCatalogs?.shifts ?? []}
        placeholder={!value.campus ? "Elegí sede primero" : "Seleccionar"}
        disabled={academicDisabled || !value.campus}
        invalid={invalidFields.includes("matricula-shift")}
        onChange={(shift) => onChange({ ...value, shift, grade: "", group: "" })}
      />
      <MatriculaSelectField
        id="matricula-grade"
        label="Grado"
        required
        value={value.grade}
        options={(dependentCatalogs?.grades ?? []).map((grado) => String(grado.valor))}
        labelFor={(option) => gradoNombreByValor.get(option) ?? option}
        placeholder={!value.shift ? "Elegí jornada primero" : "Seleccionar"}
        disabled={academicDisabled || !value.shift}
        invalid={invalidFields.includes("matricula-grade")}
        onChange={(grade) => onChange({ ...value, grade, group: "" })}
      />
      <MatriculaSelectField
        id="matricula-group"
        label="Grupo"
        required
        value={value.group}
        options={(dependentCatalogs?.groups ?? []).map((grupo) => String(grupo.id))}
        labelFor={(option) =>
          dependentCatalogs?.groups.find((grupo) => String(grupo.id) === option)?.codigo ?? option
        }
        placeholder={!value.grade ? "Elegí grado primero" : "Seleccionar"}
        disabled={academicDisabled || !value.grade}
        invalid={invalidFields.includes("matricula-group")}
        onChange={(group) => onChange({ ...value, group })}
      />
      {isFieldVisible(fieldSettings, "matricula-specialty") && (
        <MatriculaSelectField
          id="matricula-specialty"
          label="Carácter/Especialidad/Énfasis"
          required={isFieldRequired(fieldSettings, "matricula-specialty")}
          invalid={invalidFields.includes("matricula-specialty")}
          value={value.specialty}
          options={(especialidades ?? []).map((e) => String(e.id))}
          labelFor={(option) => especialidadNombreById.get(option) ?? option}
          placeholder={!value.shift ? "Elegí jornada primero" : "Seleccionar"}
          onChange={(specialty) => onChange({ ...value, specialty })}
        />
      )}
      {showStatus && (
        <MatriculaSelectField
          id="matricula-status"
          label="Estado de la matrícula"
          value={value.status}
          options={MATRICULA_STATUSES}
          onChange={(status) => {
            const entry = MATRICULA_STATUSES.find((option) => option === status)
            onChange({ ...value, status: entry ?? "" })
          }}
          disabled
        />
      )}
    </MatriculaFormSection>
  )
}
