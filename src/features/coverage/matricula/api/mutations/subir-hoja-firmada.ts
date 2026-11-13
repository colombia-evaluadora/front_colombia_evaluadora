import { useMutation, useQueryClient } from "@tanstack/react-query"

import { postMultipart } from "@/lib/files"
import { invalidarMatriculas } from "@/features/coverage/matricula/api/query-keys"

// Hoja de matrícula firmada (bloque 2.14): un archivo; reemplaza la anterior.
// Pendiente en el back (docs/matricula/pendientes-back.md, tarea 8).
async function subirHojaFirmada({ matriculaId, archivo }: { matriculaId: string; archivo: File }) {
  await postMultipart(`/eval-col/cobertura-academica/matricula/${matriculaId}/hoja-firmada`, {}, { ARCHIVO: archivo })
}

export function useSubirHojaFirmada() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: subirHojaFirmada,
    onSuccess: () => invalidarMatriculas(queryClient),
  })
}
