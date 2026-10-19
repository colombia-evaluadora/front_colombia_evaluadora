import { useMatriculaCatalogQuery } from "@/features/coverage/matricula/api/query/use-matricula-catalog-select"
import { useDisabilityTypesQuery } from "@/features/establishment/institution/api/query/use-disability-types"
import { isFieldRequired, isFieldVisible, type MatriculaFieldSettingsMap } from "@/features/coverage/matricula/utils/matricula-field-settings"
import { YES_NO_OPTIONS } from "@/features/coverage/matricula/api/ui-mappings"
import type { MatriculaBenefitsInfo, MatriculaComplementaryInfo } from "@/features/coverage/matricula/api/types/matricula"
import { anySettingVisible, catalogLabelFor, catalogOptions } from "./catalog-utils"
import { MatriculaFormSection, MatriculaSelectField, MatriculaTextField } from "./fields"

interface ComplementarySectionProps {
  value: MatriculaComplementaryInfo
  onChange: (value: MatriculaComplementaryInfo) => void
  invalidFields?: string[]
  fieldSettings?: MatriculaFieldSettingsMap
}

export function MatriculaComplementarySection({
  value,
  onChange,
  invalidFields = [],
  fieldSettings,
}: ComplementarySectionProps) {
  const { data: estrato } = useMatriculaCatalogQuery("estrato")
  const { data: sisben } = useMatriculaCatalogQuery("sisben")
  const { data: talento } = useMatriculaCatalogQuery("talento")
  const { data: discapacidades } = useDisabilityTypesQuery()
  const discapacidadNombreById = new Map(
    (discapacidades ?? []).map((item) => [String(item.id), item.name]),
  )
  if (
    !anySettingVisible(fieldSettings, [
      "complementary-stratum",
      "complementary-sisben",
      "complementary-eps",
      "complementary-ars",
      "complementary-special-conditions",
      "complementary-talent",
    ])
  ) {
    return null
  }

  return (
    <MatriculaFormSection title="Información complementaria">
      {isFieldVisible(fieldSettings, "complementary-stratum") && (
        <MatriculaSelectField
          id="complementary-stratum"
          label="Estrato socio económico del estudiante"
          required={isFieldRequired(fieldSettings, "complementary-stratum")}
          invalid={invalidFields.includes("complementary-stratum")}
          value={value.socioeconomicStratum}
          options={catalogOptions(estrato)}
          labelFor={catalogLabelFor(estrato)}
          onChange={(socioeconomicStratum) => onChange({ ...value, socioeconomicStratum })}
        />
      )}
      {isFieldVisible(fieldSettings, "complementary-sisben") && (
        <MatriculaSelectField
          id="complementary-sisben"
          label="Sisbén"
          required={isFieldRequired(fieldSettings, "complementary-sisben")}
          invalid={invalidFields.includes("complementary-sisben")}
          value={value.sisben}
          options={catalogOptions(sisben)}
          labelFor={catalogLabelFor(sisben)}
          onChange={(sisben) => onChange({ ...value, sisben })}
        />
      )}
      {isFieldVisible(fieldSettings, "complementary-eps") && (
        <MatriculaTextField
          id="complementary-eps"
          label="EPS"
          required={isFieldRequired(fieldSettings, "complementary-eps")}
          invalid={invalidFields.includes("complementary-eps")}
          value={value.eps}
          maxLength={150}
          onChange={(eps) => onChange({ ...value, eps })}
        />
      )}
      {isFieldVisible(fieldSettings, "complementary-ars") && (
        <MatriculaTextField
          id="complementary-ars"
          label="ARS"
          required={isFieldRequired(fieldSettings, "complementary-ars")}
          invalid={invalidFields.includes("complementary-ars")}
          value={value.ars}
          maxLength={150}
          onChange={(ars) => onChange({ ...value, ars })}
        />
      )}
      {isFieldVisible(fieldSettings, "complementary-special-conditions") && (
        <MatriculaSelectField
          id="complementary-special-conditions"
          label="Condiciones especiales del estudiante"
          required={isFieldRequired(fieldSettings, "complementary-special-conditions")}
          invalid={invalidFields.includes("complementary-special-conditions")}
          value={value.specialConditions}
          options={(discapacidades ?? []).map((item) => String(item.id))}
          labelFor={(option) => discapacidadNombreById.get(option) ?? option}
          onChange={(specialConditions) => onChange({ ...value, specialConditions })}
        />
      )}
      {isFieldVisible(fieldSettings, "complementary-talent") && (
        <MatriculaSelectField
          id="complementary-talent"
          label="Talento del estudiante"
          required={isFieldRequired(fieldSettings, "complementary-talent")}
          invalid={invalidFields.includes("complementary-talent")}
          value={value.talent}
          options={catalogOptions(talento)}
          labelFor={catalogLabelFor(talento)}
          onChange={(talent) => onChange({ ...value, talent })}
        />
      )}
    </MatriculaFormSection>
  )
}

interface BenefitsSectionProps {
  value: MatriculaBenefitsInfo
  onChange: (value: MatriculaBenefitsInfo) => void
  invalidFields?: string[]
  fieldSettings?: MatriculaFieldSettingsMap
}

export function MatriculaBenefitsSection({
  value,
  onChange,
  invalidFields = [],
  fieldSettings,
}: BenefitsSectionProps) {
  const { data: fuenteRecursos } = useMatriculaCatalogQuery("fuenteRecursos")
  if (
    !anySettingVisible(fieldSettings, [
      "benefits-subsidized",
      "benefits-funding-source",
      "benefits-head-household-student",
      "benefits-head-household-children",
      "benefits-public-force-veteran",
      "benefits-national-heroes",
    ])
  ) {
    return null
  }

  return (
    <MatriculaFormSection title="Subsidio o beneficios">
      {isFieldVisible(fieldSettings, "benefits-subsidized") && (
        <MatriculaSelectField
          id="benefits-subsidized"
          label="Subsidiado"
          required={isFieldRequired(fieldSettings, "benefits-subsidized")}
          invalid={invalidFields.includes("benefits-subsidized")}
          value={value.subsidized}
          options={YES_NO_OPTIONS}
          onChange={(subsidized) => onChange({ ...value, subsidized })}
        />
      )}
      {isFieldVisible(fieldSettings, "benefits-funding-source") && (
        <MatriculaSelectField
          id="benefits-funding-source"
          label="Fuente de recursos"
          required={isFieldRequired(fieldSettings, "benefits-funding-source")}
          invalid={invalidFields.includes("benefits-funding-source")}
          value={value.fundingSource}
          options={catalogOptions(fuenteRecursos)}
          labelFor={catalogLabelFor(fuenteRecursos)}
          onChange={(fundingSource) => onChange({ ...value, fundingSource })}
        />
      )}
      {isFieldVisible(fieldSettings, "benefits-head-household-student") && (
        <MatriculaSelectField
          id="benefits-head-household-student"
          label="Alumnos madre cabeza de familia"
          required={isFieldRequired(fieldSettings, "benefits-head-household-student")}
          invalid={invalidFields.includes("benefits-head-household-student")}
          value={value.headOfHouseholdStudent}
          options={YES_NO_OPTIONS}
          onChange={(headOfHouseholdStudent) => onChange({ ...value, headOfHouseholdStudent })}
        />
      )}
      {isFieldVisible(fieldSettings, "benefits-head-household-children") && (
        <MatriculaSelectField
          id="benefits-head-household-children"
          label="Hijos de madre cabeza de familia"
          required={isFieldRequired(fieldSettings, "benefits-head-household-children")}
          invalid={invalidFields.includes("benefits-head-household-children")}
          value={value.headOfHouseholdChildren}
          options={YES_NO_OPTIONS}
          onChange={(headOfHouseholdChildren) => onChange({ ...value, headOfHouseholdChildren })}
        />
      )}
      {isFieldVisible(fieldSettings, "benefits-public-force-veteran") && (
        <MatriculaSelectField
          id="benefits-public-force-veteran"
          label="Veteranos de la fuerza pública"
          required={isFieldRequired(fieldSettings, "benefits-public-force-veteran")}
          invalid={invalidFields.includes("benefits-public-force-veteran")}
          value={value.publicForceVeteran}
          options={YES_NO_OPTIONS}
          onChange={(publicForceVeteran) => onChange({ ...value, publicForceVeteran })}
        />
      )}
      {isFieldVisible(fieldSettings, "benefits-national-heroes") && (
        <MatriculaSelectField
          id="benefits-national-heroes"
          label="Héroes de la nación"
          required={isFieldRequired(fieldSettings, "benefits-national-heroes")}
          invalid={invalidFields.includes("benefits-national-heroes")}
          value={value.nationalHeroes}
          options={YES_NO_OPTIONS}
          onChange={(nationalHeroes) => onChange({ ...value, nationalHeroes })}
        />
      )}
    </MatriculaFormSection>
  )
}
