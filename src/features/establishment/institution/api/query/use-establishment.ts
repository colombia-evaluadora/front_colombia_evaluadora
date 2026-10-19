import { proveedorMeta } from "@/lib/offline/query-meta"
import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { unwrapRow } from "@/lib/response-envelope"
import { env } from "@/config/env"
import { fetchEmployee } from "@/features/establishment/employees/api/query/use-employee"

import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { Employee } from "@/features/establishment/employees/api/types/employee"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"
import { establishmentKeys } from "@/features/establishment/institution/api/query-keys"

interface EstablishmentQueryResult {
  status: "ok"
  establishment: EstablishmentDetails
  /** Funcionario completo: al guardar se reenvía tal cual para no pisar campos con `null`. */
  principalEmployee: Employee | null
  secretaryEmployee: Employee | null
}

/** Fila de `fn_est_buscar_por_pk`: sin catálogos resueltos. */
interface RealEstablishmentDetailRow {
  pk_establecimiento: number
  codigo: string
  nombre: string
  nit: string
  fk_tmunicipio: number | null
  fk_tlista_valor_zona: number | null
  localidad: string | null
  comuna: string | null
  barrio: string | null
  direccion: string | null
  correo_electronico: string | null
  telefono: string | null
  fax: string | null
  pagina_web: string | null
  fk_tpropiedad_juridica: number | null
  /** Única query que expone el escudo. */
  fk_tarchivo: number | null
  resolucion_aprobacion: string | null
  licencia_funcionamiento: string | null
  fecha_licencia: string | null
  fk_tlv_calendario: number | null
  fk_tlv_idioma: number | null
  fk_tlv_genero_est: number | null
  fk_tdiscapacidad: number | null
  fk_tlv_regimen_catcosto: number | null
  fk_tlv_rango_tarifa: number | null
  talento: "S" | "N" | null
  etnias: "S" | "N" | null
  fk_tfuncionario_rector: number | null
  fk_tfuncionario_secretaria: number | null
  subsidio: "S" | "N" | null
}

/** Solo `id`: los `<Select>` resuelven la etiqueta contra el catálogo. */
function toStub(id: number | null): CatalogItem | null {
  return id === null ? null : { id, code: "", name: "" }
}

function toFreeText(value: string | null): CatalogItem | null {
  const text = value?.trim()
  return text ? { id: 0, code: text, name: text } : null
}

function toEstablishmentDetails(
  row: RealEstablishmentDetailRow,
  principal: Employee | null,
  secretary: Employee | null,
): EstablishmentDetails {
  return {
    id: row.pk_establecimiento,
    basicInfo: {
      name: row.nombre,
      dane: row.codigo,
      nit: row.nit,
      ownershipType: toStub(row.fk_tpropiedad_juridica),
      logoArchivoId: row.fk_tarchivo ?? null,
    },
    address: {
      // Stub: el `<Select>` de municipio resuelve la etiqueta por `id`.
      municipality: row.fk_tmunicipio === null
        ? null
        : { id: row.fk_tmunicipio, name: "", department: { id: 0, name: "" } },
      zone: toStub(row.fk_tlista_valor_zona),
      district: toFreeText(row.barrio),
      commune: toFreeText(row.comuna),
      locality: toFreeText(row.localidad),
      address: row.direccion ?? "",
    },
    contact: {
      email: row.correo_electronico ?? "",
      website: row.pagina_web ?? "",
      phone: row.telefono ?? "",
      fax: row.fax ?? "",
    },
    additionalInfo: {
      approvalResolution: row.resolucion_aprobacion ?? "",
      teachingLanguage: toStub(row.fk_tlv_idioma),
      calendar: toStub(row.fk_tlv_calendario),
      costRegime: toStub(row.fk_tlv_regimen_catcosto),
      populationGender: toStub(row.fk_tlv_genero_est),
      tuitionRange: toStub(row.fk_tlv_rango_tarifa),
      disabilityType: toStub(row.fk_tdiscapacidad),
      // Sin columna booleana: se infiere de `LICENCIA_FUNCIONAMIENTO`.
      operatingLicense: Boolean(row.licencia_funcionamiento?.trim()),
      licenseStatus: row.licencia_funcionamiento ?? "",
      licenseDate: row.fecha_licencia,
      ethnicAttention: row.etnias === "S",
      giftedAttention: row.talento === "S",
      subsidy: row.subsidio === "S",
    },
    // Rector/secretaria se resuelven aparte en `fetchEstablishment`.
    principal: principal?.person ?? null,
    secretary: secretary?.person ?? null,
  }
}

/** Rector/secretaria son TFUNCIONARIO: se reusa `fetchEmployee`. */
async function fetchLinkedFuncionario(pk: number | null): Promise<Employee | null> {
  if (pk === null) return null
  const result = await fetchEmployee(pk)
  return result.employee
}

async function fetchEstablishment(id: number): Promise<EstablishmentQueryResult> {
  if (env.ENABLE_API_MOCKING) {
    const result: EstablishmentQueryResult = await api.get(
      apiPath(`/establishments/${id}`, `/establecimientos/${id}`),
    )
    return { ...result, principalEmployee: null, secretaryEmployee: null }
  }

  const row = unwrapRow<RealEstablishmentDetailRow>(
    (await api.get(`/eval-col/establecimientos/${id}`)) as unknown as
      | { rows: RealEstablishmentDetailRow[] }
      | RealEstablishmentDetailRow,
  )

  const [principalEmployee, secretaryEmployee] = await Promise.all([
    fetchLinkedFuncionario(row.fk_tfuncionario_rector),
    fetchLinkedFuncionario(row.fk_tfuncionario_secretaria),
  ])

  return {
    status: "ok",
    establishment: toEstablishmentDetails(row, principalEmployee, secretaryEmployee),
    principalEmployee,
    secretaryEmployee,
  }
}

export function useEstablishmentQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: establishmentKeys.detalle(id),
    meta: proveedorMeta(),
    queryFn: () => fetchEstablishment(id as number),
    enabled: enabled && Boolean(id),
  })
}
