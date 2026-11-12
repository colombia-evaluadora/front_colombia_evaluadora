import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { evalCol } from "@/lib/eval-col-client"
import { matriculaKeys } from "@/features/coverage/matricula/api/query-keys"

// Estudiante ya registrado al digitar el documento en el alta (Reglas 3 y 8).
// Pendiente en el back (docs/matricula/pendientes-back.md, tarea 9).

export interface EstudianteExistente {
  firstName: string
  secondName: string
  lastName: string
  secondLastName: string
  /** yyyy-MM-dd */
  birthDate: string
  /** Ya enmascarados por el back (Guía UX §5): «a***@g***.com», «******4321». */
  correoEnmascarado: string
  telefonoEnmascarado: string
  /** Acudiente de su última matrícula, para confirmar que es el estudiante correcto. */
  ultimoAcudiente: { parentesco: string; nombre: string } | null
}

interface Row {
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  fecha_nacimiento: string | null
  correo_enmascarado: string | null
  telefono_enmascarado: string | null
  ultimo_acudiente_parentesco: string | null
  ultimo_acudiente_nombre: string | null
}

function useDebounced(valor: string, ms = 600) {
  const [debounced, setDebounced] = useState(valor)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), ms)
    return () => clearTimeout(id)
  }, [valor, ms])
  return debounced
}

/** Se identifica por el número, sin importar el tipo (Regla 3). `null` si no existe. */
export function useEstudianteExistenteQuery(documento: string) {
  const doc = useDebounced(documento.trim())
  return useQuery({
    queryKey: matriculaKeys.estudianteExistente(doc),
    queryFn: async (): Promise<EstudianteExistente | null> => {
      const rows = await evalCol.getRows<Row>(
        `/cobertura-academica/matricula/estudiante-existente?DOCUMENTO=${encodeURIComponent(doc)}`,
      )
      const r = rows[0]
      if (!r) return null
      return {
        firstName: r.primer_nombre,
        secondName: r.segundo_nombre ?? "",
        lastName: r.primer_apellido,
        secondLastName: r.segundo_apellido ?? "",
        birthDate: r.fecha_nacimiento ?? "",
        correoEnmascarado: r.correo_enmascarado ?? "",
        telefonoEnmascarado: r.telefono_enmascarado ?? "",
        ultimoAcudiente: r.ultimo_acudiente_nombre
          ? { parentesco: r.ultimo_acudiente_parentesco ?? "", nombre: r.ultimo_acudiente_nombre }
          : null,
      }
    },
    enabled: doc.length >= 5,
    staleTime: 60_000,
  })
}
