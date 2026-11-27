import { useMatriculaPeriodosAbiertosQuery } from "@/features/coverage/matricula/api/query/use-matricula-periodos-abiertos"
import { useMatriculaCatalogQuery } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import { catalogLabelFor, catalogOptions } from "./catalog-utils"
import { useContext, useEffect, type ReactNode } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { MarcoOpciones } from "@/components/marco-opciones"
import { useFuncionariosQuery } from "@/features/establishment/employees/api/query/use-funcionarios"
import { MatriculaDateField, MatriculaFormSection, MatriculaSelectField, MatriculaTextField, MatriculaLecturaContext, ParFicha, CampoBuscable } from "./fields"

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
  /** Grado de origen del traslado (AGR.2): otro grado marca error. */
  gradoTraslado?: { valor: string; nombre: string } | null
  /** Aviso dentro del bloque, antes de los campos (grado por traslado, AGR.2). */
  aviso?: ReactNode
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
  gradoTraslado,
  aviso,
}: AcademicSectionProps) {
  const lectura = useContext(MatriculaLecturaContext)
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
  const { data: periodos = [] } = useMatriculaPeriodosAbiertosQuery(sedeId ?? null, jornadaId ?? null, value.periodoId || undefined)
  const periodoElegido = value.periodoId || (periodos.length === 1 && !periodos[0].vencido ? periodos[0].value : "")
  const periodoId = periodoElegido ? Number(periodoElegido) : periodoResuelto
  const etiquetaPeriodo = new Map(periodos.map((p) => [p.value, p.label]))
  const anio = etiquetaPeriodo.get(periodoElegido)?.split(" · ")[0] ?? ""
  const { data: internado } = useMatriculaCatalogQuery("internado")
  const internadoNo = internado?.find((i) => /^no$/i.test(i.nombre.trim()))?.id
  const { data: especialidades } = useEspecialidadesQuery(periodoId ?? undefined)
  const especialidadNombreById = new Map((especialidades ?? []).map((e) => [String(e.id), e.label]))
  // AGR.2: por traslado se matricula en el mismo grado de origen.
  const errorTraslado =
    gradoTraslado && value.grade && value.grade !== gradoTraslado.valor
      ? `Por traslado, debe ser ${gradoTraslado.nombre}.`
      : null
  // Funcionarios activos del establecimiento de la sede, para «Digitado en el SIMAT por».
  const establecimientoId = sedes?.find((s) => s.pk_sede === sedeId)?.fk_establecimiento ?? null
  const { data: funcionarios } = useFuncionariosQuery(
    establecimientoId != null
      ? { establishmentId: establecimientoId, filters: { statuses: ["A"] }, sorting: [], pageIndex: 0, pageSize: 500 }
      : null,
  )
  const funcionarioNombre = new Map((funcionarios?.rows ?? []).map((f) => [String(f.id), f.name]))

  return (
    <MatriculaFormSection title="Información de matrícula" aviso={aviso}>
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
      <MatriculaTextField id="matricula-anio" label="Año" value={anio} disabled onChange={() => {}} />
      <MatriculaSelectField
        id="matricula-shift"
        label="Jornada"
        required
        value={value.shift}
        options={dependentCatalogs?.shifts ?? []}
        placeholder={!value.campus ? "Elija la sede primero" : "Seleccionar"}
        disabled={academicDisabled || !value.campus}
        invalid={invalidFields.includes("matricula-shift")}
        onChange={(shift) => onChange({ ...value, shift, periodoId: "", grade: "", group: "" })}
      />
      <MatriculaSelectField
        id="matricula-periodo"
        label="Período (modalidad y ciclo)"
        required
        value={periodoElegido}
        options={periodos.map((p) => p.value)}
        labelFor={(id) => etiquetaPeriodo.get(id) ?? id}
        disabledOptions={Object.fromEntries(
          periodos.filter((p) => p.vencido).map((p) => [p.value, "Fecha límite de matrícula vencida"]),
        )}
        placeholder={!value.shift ? "Elija la jornada primero" : "Elija un período"}
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
        placeholder={!periodoElegido ? "Elija el período primero" : "Seleccionar"}
        disabled={academicDisabled || !value.shift}
        invalid={invalidFields.includes("matricula-grade") || errorTraslado != null}
        description={errorTraslado ?? undefined}
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
        placeholder={!value.grade ? "Elija el grado primero" : "Elija un grupo"}
        disabled={academicDisabled || !value.grade}
        invalid={invalidFields.includes("matricula-group")}
        description="Solo se listan los grupos con cupo disponible."
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
          placeholder={!value.shift ? "Elija la jornada primero" : "Seleccionar"}
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
      <MatriculaSelectField
        id="matricula-funcionario-digita-simat"
        label="Digitado en el SIMAT por"
        value={value.funcionarioDigitaSimat ?? ""}
        options={(funcionarios?.rows ?? []).map((f) => String(f.id))}
        labelFor={(id) => funcionarioNombre.get(id) ?? id}
        onChange={(funcionarioDigitaSimat) => onChange({ ...value, funcionarioDigitaSimat })}
      />
      <MatriculaDateField
        id="matricula-fecha-digitacion-simat"
        label="Fecha de digitación en el SIMAT"
        required={Boolean(value.funcionarioDigitaSimat)}
        invalid={invalidFields.includes("matricula-fecha-digitacion-simat")}
        value={value.fechaDigitacionSimat ?? ""}
        maxDate={new Date()}
        description="Obligatoria si indica quién digitó."
        onChange={(fechaDigitacionSimat) => onChange({ ...value, fechaDigitacionSimat })}
      />
      <MatriculaTextField
        id="matricula-tipo"
        label="Tipo de matrícula"
        value={tipoMatricula}
        disabled
        onChange={() => {}}
      />
      {/* Regla 81: opcional; sin ella se matricula igual, con los datos del estudiante enmascarados. */}
      {!showStatus ? (
        <label className="flex items-start gap-2 text-sm md:col-span-3">
          <Checkbox
            id="matricula-autorizacion-datos"
            checked={Boolean(value.autorizacionDatos)}
            onCheckedChange={(checked) => onChange({ ...value, autorizacionDatos: checked === true })}
            className="mt-0.5"
          />
          <span>
            El acudiente autoriza al establecimiento a tratar los datos del estudiante
            <span className="block text-xs text-muted-foreground">
              Opcional. Sin ella se matricula igual, pero los datos se ven enmascarados y no se pueden modificar.
            </span>
          </span>
        </label>
      ) : null}
      {/* Regla 41: con Sí, el bloque 15 deja marcar qué asignaturas se cursan afuera. */}
      {/* Interruptor dentro de su recuadro con label flotante (`MarcoOpciones`, CLAUDE.md §13). */}
      {lectura ? (
        <ParFicha label="¿Media técnica en institución externa?" valor={value.mediaTecnicaExterna ? "Sí" : "No"} />
      ) : (
      <CampoBuscable label="¿Media técnica en institución externa?" valor={value.mediaTecnicaExterna ? "Sí" : "No"}>
      <MarcoOpciones id="matricula-media-tecnica-marco" label="¿Media técnica en institución externa?" className="md:col-span-1">
        <label htmlFor="matricula-media-tecnica" className="flex w-fit cursor-pointer items-center gap-2 text-sm">
          <Switch
            round
            id="matricula-media-tecnica"
            aria-labelledby="matricula-media-tecnica-marco-label"
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
      </MarcoOpciones>
      </CampoBuscable>
      )}
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
