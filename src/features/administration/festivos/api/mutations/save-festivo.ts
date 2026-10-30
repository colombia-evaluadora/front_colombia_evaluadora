import { useMutation, useQueryClient } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import type { MutationConfig } from "@/lib/react-query"

import { invalidarFestivos } from "@/features/administration/festivos/api/mutations/invalidar-festivos"
import type { ReglaFecha } from "@/features/administration/festivos/lib/fecha-festivo"
import type { Festivo, Resultado } from "@/features/administration/festivos/api/types"

interface SaveFestivoVariables extends ReglaFecha {
  /** Presente = modificar. */
  id?: number
  nombre: string
}

// El back guarda solo los campos del tipo (CHK_TFESTIVO_FORMA): los demás se
// mandan en null. 409 (23505) nombre repetido; 400 (22023) fecha inválida.
async function saveFestivo({ id, nombre, tipoFecha, mes, dia, diasPascua, trasladoLunes }: SaveFestivoVariables) {
  const pascua = tipoFecha === "PASCUA"
  const body = {
    NOMBRE: nombre,
    TIPO_FECHA: tipoFecha,
    MES: pascua ? null : mes,
    DIA: pascua ? null : dia,
    DIAS_PASCUA: pascua ? diasPascua : null,
    TRASLADO_LUNES: pascua && trasladoLunes,
  }
  const row =
    id == null
      ? await evalCol.postRow<Resultado<Festivo>>("/festivos", body)
      : await evalCol.putRow<Resultado<Festivo>>(`/festivos/${id}`, body)
  return row.resultado
}

export function useSaveFestivo({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof saveFestivo> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: saveFestivo,
    ...rest,
    onSuccess: (...args) => {
      invalidarFestivos(queryClient)
      onSuccess?.(...args)
    },
  })
}
