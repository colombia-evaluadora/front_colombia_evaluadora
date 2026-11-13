import { useMatriculaPeriodosAbiertosQuery } from "@/features/coverage/matricula/api/query/use-matricula-periodos-abiertos"
import { useMatriculaCatalogQuery } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import { catalogLabelFor, catalogOptions } from "./catalog-utils"
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
import { Switch } from "@/components/ui/switch"
import { MatriculaFormSection, MatriculaSelectField, MatriculaTextField } from "./fields"

interface AcademicSectionProps {
  value: MatriculaAcademicInfo
  onChange: (value: MatriculaAcademicInfo) => void
  catalogs?: MatriculaCampusCatalog
  invalidFields?: string[]
  showStatus?: boolean
  fieldSettings?: MatriculaFieldSettingsMap
  academicDisabled?: boolean
  /** «Principal» o «Complementaria»: siempre de solo lectura (bloque 2.1). */
  tipoMatricula?: string
  /** Si viene, la especialidad queda en solo lectura con esta ayuda. */
  especialidadBloqueo?: string
}

export function MatriculaAcademicSection({
  value,
  onChange,
  catalogs,
  invalidFields = [],
  showStatus = true,
  fieldSettings,
  academicDisabled,
  tipoMatricula = "Principal",
  especialidadBloqueo,
}: AcademicSectionProps) {
  // Sede → Jornada → Grado → Grupo — mismo criterio que "Modificar" (ver
  // `dialog-modificar-matricula.tsx` y `use-matricula-dependent-catalogs-query.ts`).
  const { data: dependentCatalogs, isPeriodoError, periodoError } = useMatriculaDependentCatalogsQuery({
    campusId: value.campusId || undefined,
    campus: value.campus || undefined,
    shift: value.shift || undefined,
    grade: value.grade ? Number(value.grade) : undefined,
    periodoId: value.periodoId ? Number(value.periodoId) : null,
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
  const { data: periodoResuelto } = usePeriodoResolverMatriculaQuery(sedeId ?? null, jornadaId ?? null)
  // Periodo (modalidad y ciclo): los Abiertos de la sede y jornada (Regla 54). Con uno solo queda elegido.
  const { data: periodos = [] } = useMatriculaPeriodosAbiertosQuery(sedeId ?? null, jornadaId ?? null)
  const periodoElegido = value.periodoId || (periodos.length === 1 ? periodos[0].value : "")
  const periodoId = periodoElegido ? Number(periodoElegido) : periodoResuelto
  const etiquetaPeriodo = new Map(periodos.map((p) => [p.value, p.label]))
  const anio = etiquetaPeriodo.get(periodoElegido)?.split(" · ")[0] ?? ""
  const { data: internado } = useMatriculaCatalogQuery("internado")
  const internadoNo = internado?.find((i) => /^no$/i.test(i.nombre.trim()))?.id
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
        onChange={(shift) => onChange({ ...value, shift, periodoId: "", grade: "", group: "" })}
      />
      <MatriculaTextField id="matricula-anio" label="Año" value={anio} disabled onChange={() => {}} />
      <MatriculaSelectField
        id="matricula-periodo"
        label="Periodo (modalidad y ciclo)"
        required
        value={periodoElegido}
        options={periodos.map((p) => p.value)}
        labelFor={(id) => etiquetaPeriodo.get(id) ?? id}
        placeholder={!value.shift ? "Elegí jornada primero" : "Seleccionar"}
        disabled={academicDisabled || !value.shift}
        invalid={invalidFields.includes("matricula-periodo")}
        onChange={(periodo) => onChange({ ...value, periodoId: periodo, grade: "", group: "" })}
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
          disabled={academicDisabled || Boolean(especialidadBloqueo)}
          description={especialidadBloqueo}
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
      <MatriculaSelectField
        id="matricula-internado"
        label="Internado"
        value={value.internado || (internadoNo != null ? String(internadoNo) : "")}
        options={catalogOptions(internado)}
        labelFor={catalogLabelFor(internado)}
        onChange={(v) => onChange({ ...value, internado: v })}
      />
      <MatriculaTextField
        id="matricula-tipo"
        label="Tipo de matrícula"
        value={tipoMatricula}
        disabled
        onChange={() => {}}
      />
      {/* Regla 41: con Sí, el bloque 15 deja marcar qué asignaturas se cursan afuera. */}
      <div className="flex flex-col gap-2 md:col-span-3">
        <span id="matricula-media-tecnica-label" className="text-sm font-medium">
          ¿Media técnica en institución externa?
        </span>
        <label className="flex w-fit items-center gap-2 text-sm">
          <Switch
            round
            id="matricula-media-tecnica"
            aria-labelledby="matricula-media-tecnica-label"
            checked={Boolean(value.mediaTecnicaExterna)}
            onCheckedChange={(checked) =>
              onChange({
                ...value,
                mediaTecnicaExterna: checked,
                institucionExterna: checked ? value.institucionExterna : "",
              })
            }
          />
          {value.mediaTecnicaExterna ? "Sí" : "No"}
        </label>
      </div>
      {value.mediaTecnicaExterna ? (
        <MatriculaTextField
          id="matricula-institucion-externa"
          label="Nombre de la institución"
          required
          invalid={invalidFields.includes("matricula-institucion-externa")}
          value={value.institucionExterna ?? ""}
          maxLength={150}
          onChange={(institucionExterna) => onChange({ ...value, institucionExterna })}
        />
      ) : null}
    </MatriculaFormSection>
  )
}
