import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-routes"
import { env } from "@/config/env"

import type {
  CurricularReference,
  CurricularReferenceDraft,
} from "@/features/academic-management/curricular-references/api/types/curricular-reference"

export interface CurricularReferenceMutationResult {
  status?: "ok" | "error"
  message?: string
  curricularReference?: CurricularReference
}


function toRealCreatePayload(values: CurricularReferenceDraft) {
  return {
    NOMBRE: values.name,
    DESCRIPCION: values.description,
    NIVEL_EDUCATIVO: values.educationLevel?.id ?? null,
    ENFOQUE_PEDAGOGICO: values.pedagogicalApproach?.id ?? null,
    TIPO_EVALUACION: values.evaluationType?.id ?? null,
    INSTRUMENTO: values.instrument,
    INSTRUMENTO_INFO: values.instrumentDescription || null,
    NORMATIVIDAD: values.regulation,
    ANIO_DESDE: new Date().getFullYear(),
    ANIO_HASTA: null,
    NIVEL_1_ETIQUETA: values.level1,
    NIVEL_2_ETIQUETA: values.level2,
    ESTADO: values.active ? "A" : "I",
    AREAS_IDS: values.areas.map((area) => area.id),
  }
}

function toRealUpdatePayload(values: CurricularReferenceDraft, previousActive?: boolean) {
  const activeChanged = previousActive != null && previousActive !== values.active
  return {
    NOMBRE: values.name,
    DESCRIPCION: values.description,
    NIVEL_EDUCATIVO: values.educationLevel?.id ?? null,
    ENFOQUE_PEDAGOGICO: values.pedagogicalApproach?.id ?? null,
    TIPO_EVALUACION: values.evaluationType?.id ?? null,
    INSTRUMENTO: values.instrument,
    INSTRUMENTO_INFO: values.instrumentDescription || null,
    NORMATIVIDAD: values.regulation,
    NIVEL_1_ETIQUETA: values.level1,
    NIVEL_2_ETIQUETA: values.level2,
    ESTADO: values.active ? "A" : "I",
    AREAS_IDS: values.areas.map((area) => area.id),
    ...(activeChanged ? { ANIO_HASTA: values.active ? null : new Date().getFullYear() } : {}),
  }
}

export function create(values: CurricularReferenceDraft): Promise<CurricularReferenceMutationResult> {
  const url = apiPath("/academic-management/curricular-references", "/referentes-curriculares")
  return api.post(url, env.ENABLE_API_MOCKING ? values : toRealCreatePayload(values))
}

export function update(
  id: number,
  values: CurricularReferenceDraft,
  previousActive?: boolean,
): Promise<CurricularReferenceMutationResult> {
  const url = apiPath(`/academic-management/curricular-references/${id}`, `/referentes-curriculares/${id}`)
  if (env.ENABLE_API_MOCKING) {
    return api.put(url, values)
  }
  return api.patch(url, toRealUpdatePayload(values, previousActive))
}
