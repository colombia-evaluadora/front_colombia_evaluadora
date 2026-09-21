import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportResult } from "@/features/establishment/institution/api/types/export"

interface BoletinPreescolarInput {
  grupoId: number
  periodoId: number
  matriculaId: number
}

/** `POST /reportes/boletin-preescolar`. Solo PDF — no es una grilla — y de un
 *  único (período, estudiante) a la vez: un boletín es individual. */
function generarBoletinPreescolar(input: BoletinPreescolarInput): Promise<ExportResult> {
  return downloadReport("boletin-preescolar", {
    format: "pdf",
    filters: {
      FK_TGRUPO: input.grupoId,
      FK_TPERIODO_EVALUACION: input.periodoId,
      FK_TMATRICULAS: [input.matriculaId],
    },
  })
}

interface UseBoletinPreescolarOptions {
  mutationConfig?: MutationConfig<typeof generarBoletinPreescolar>
}

export function useBoletinPreescolar({ mutationConfig }: UseBoletinPreescolarOptions = {}) {
  return useMutation({
    mutationFn: generarBoletinPreescolar,
    ...mutationConfig,
  })
}
