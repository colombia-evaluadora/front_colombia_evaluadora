import { useEffect, useState } from "react"

import { useFuncionariosInvolucrablesQuery } from "@/features/gestion-estudiantil/convivencia/api/query/use-funcionarios-involucrables-query"
import type { FuncionarioInvolucrable } from "@/features/gestion-estudiantil/convivencia/api/types"
import type { InvolucradoFila } from "@/features/gestion-estudiantil/convivencia/api/form-types"

const ESPERA_MS = 300

/** De dónde sale el alcance del combo: el caso al modificar, la primera matrícula al crear. */
export interface ContextoFuncionarios {
  casoId: number | null
  matricula: number | null
}

interface Opciones {
  fila: InvolucradoFila
  todas: InvolucradoFila[]
  contexto: ContextoFuncionarios
  activo: boolean
  onChange: (patch: Partial<InvolucradoFila>) => void
}

const etiqueta = (f: FuncionarioInvolucrable) =>
  [f.nombre, f.cargo_nombre, [f.tipo_documento_codigo, f.numero_documento].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" · ")

/** Combo «Funcionario» de una fila de Otros involucrados: búsqueda en servidor y relleno desde la ficha (3.1). */
export function useFuncionarioInvolucrado({ fila, todas, contexto, activo, onChange }: Opciones) {
  const [texto, setTexto] = useState("")
  const [busqueda, setBusqueda] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto), ESPERA_MS)
    return () => clearTimeout(t)
  }, [texto])

  const sinContexto = contexto.casoId == null && contexto.matricula == null
  const query = useFuncionariosInvolucrablesQuery({
    ...contexto,
    tipo: fila.tipo ? Number(fila.tipo) : null,
    search: busqueda,
    enabled: activo && fila.id == null,
  })

  // Una persona una vez por caso: fuera los elegidos en otras filas.
  const elegidosOtras = new Set(todas.filter((o) => o.key !== fila.key && o.fk_funcionario != null).map((o) => o.fk_funcionario))
  const filas = (query.data ?? []).filter((f) => !elegidosOtras.has(f.fk_tfuncionario))
  const opciones = filas.map((f) => ({ value: String(f.fk_tfuncionario), label: etiqueta(f) }))
  // El elegido sigue visible aunque la búsqueda actual ya no lo traiga.
  if (fila.fk_funcionario != null && !opciones.some((o) => o.value === String(fila.fk_funcionario)))
    opciones.unshift({ value: String(fila.fk_funcionario), label: fila.nombre })

  function elegir(value: string) {
    const f = filas.find((x) => String(x.fk_tfuncionario) === value)
    if (!f) {
      if (!value) onChange({ fk_funcionario: null, nombre: "", tipoDoc: "", numDoc: "" })
      return
    }
    onChange({
      fk_funcionario: f.fk_tfuncionario,
      nombre: f.nombre,
      tipoDoc: f.fk_tlv_tipo_documento != null ? String(f.fk_tlv_tipo_documento) : "",
      numDoc: f.numero_documento ?? "",
    })
  }

  return {
    opciones,
    deshabilitado: sinContexto,
    placeholder: sinContexto
      ? "Agregue primero un estudiante"
      : query.isFetching && !query.data
        ? "Cargando…"
        : "Buscar funcionario",
    buscar: setTexto,
    elegir,
  }
}
