import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

import type { AcademicPeriodFormValues } from "../../schema"
import type {
  AcademicPeriod,
  CreateAcademicPeriodRequest,
} from "../../types/academic-period"

export function toCreateAcademicPeriodRequest(
  values: AcademicPeriodFormValues
): CreateAcademicPeriodRequest {
  // Body PLANO con las llaves de `fn_periodo_crear`. `name`/`schoolYearId` los
  // deriva el backend y el usuario sale de `:CONTEXT.USER_ID` → no se mandan.
  const breaks = values.breaks ?? []
  return {
    // `sedeId` es string en el front (Campus.id "1"); el backend espera BIGINT
    // → se convierte a número. Por SSO llegaría string igual, pero lo mandamos
    // ya numérico para dejar explícito el PK.
    FK_SEDE: Number(values.sedeId), 
    FK_ESTADO: values.statusId,
    FECHA_INICIO: values.startDate,
    FECHA_FIN: values.endDate,
    FECHA_LIMITE_MATRICULA: values.enrollmentDeadline,
    FK_JORNADA: values.jornadaId,
    HORA_INICIO: values.scheduleStartTime || null,
    HORA_FIN: values.scheduleEndTime || null,
    // `p_reserva` es `bool_sn` → se manda "S"/"N", no boolean.
    RESERVA: values.reservationEnabled ? "S" : "N",
    BLOQUES_POR_DEFECTO: values.defaultBlocksCount,
    FK_PERIODO_ANTERIOR: values.previousPeriodId,
    // `TIME[]` paralelos (misma longitud/orden). Siempre se manda el arreglo (no
    // null): en update el front gestiona los descansos, así que `[]` = borrar
    // todos. `null` queda reservado para "no tocar", que este form no usa.
    DESCANSO_INICIO: breaks.map((b) => b.startTime),
    DESCANSO_FIN: breaks.map((b) => b.endTime),
  }
}

function createAcademicPeriod(
  values: AcademicPeriodFormValues
): Promise<AcademicPeriod> {
  return api.post(
    "/eval-col/periodos-academicos",
    toCreateAcademicPeriodRequest(values)
  )
}

interface UseCreateAcademicPeriodOptions {
  mutationConfig?: MutationConfig<typeof createAcademicPeriod>
}

export function useCreateAcademicPeriod({
  mutationConfig,
}: UseCreateAcademicPeriodOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAcademicPeriod,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["academic-periods"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
