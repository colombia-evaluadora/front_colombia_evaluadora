import { useMemo, useState } from "react"

import { useNotify } from "@/components/notice/notice-context"
import { FileXlsIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { DialogoOperacionShell } from "@/features/gestion-estudiantil/commons/components/dialogo-operacion-shell"
import { useEstadoDialogo } from "@/features/gestion-estudiantil/commons/hooks/use-estado-dialogo"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { enfocarPrimerError } from "@/features/gestion-estudiantil/commons/utils/validaciones"
import { useExportarSimpade } from "@/features/gestion-estudiantil/prevencion/api/mutations/exportar-simpade"
import { useOpcionesPeriodosAcademicosQuery } from "@/features/gestion-estudiantil/prevencion/api/query/use-opciones-prevencion-query"
import { useAmbitoPrevencion } from "@/features/gestion-estudiantil/prevencion/hooks/use-ambito-prevencion"

const DATOS = [
  "Cobertura Educativa: identificación, matrícula y sus condiciones, retiro y su motivo, y trayectoria escolar.",
  "Gestión Académica: asistencia, asignaturas reprobadas y repitencia.",
  "Gestión Estudiantil: caracterización familiar y de vivienda, señales de riesgo, valoración y plan, estrategias de permanencia, factores de vulnerabilidad y razones del abandono.",
]

/**
 * Exportar para el SIMPADE (G.8.VAL.4): un solo Excel de apoyo con una fila por estudiante con matrícula en el
 * Período Académico elegido. Sede y Jornada acotan; la estructura del archivo es provisional.
 */
export function DialogExportarSimpade({
  sede: sedeInicial,
  jornada: jornadaInicial,
  onClose,
}: {
  /** Sede y Jornada aplicadas en la pestaña: el diálogo abre con ellas. */
  sede: string
  jornada: string
  onClose: () => void
}) {
  const { notify } = useNotify()
  const s = useEstadoDialogo()
  // null: sin elegir; el valor efectivo se deriva de lo que cargó (primera sede si hay varios establecimientos).
  const [periodoElegido, setPeriodo] = useState<string | null>(null)
  const [sedeElegida, setSede] = useState<string | null>(sedeInicial || null)
  const [jornadaElegida, setJornada] = useState<string | null>(jornadaInicial || null)

  const sinSede = useAmbitoPrevencion(sedeElegida ?? "")
  const sede = sedeElegida ?? (sinSede.establecimientoId == null ? (sinSede.sedeOpciones[0]?.value ?? "") : "")
  const ambito = useAmbitoPrevencion(sede)
  const jornada = sede ? (jornadaElegida ?? "") : ""
  const periodos = useOpcionesPeriodosAcademicosQuery(ambito.establecimientoId)
  const filasPeriodo = useMemo(
    () =>
      (periodos.data ?? []).filter(
        (p) => (!sede || String(p.fk_tsede) === sede) && (!jornada || String(p.fk_tlv_jornada) === jornada),
      ),
    [periodos.data, sede, jornada],
  )
  const periodoOpciones = useMemo<Opcion[]>(() => {
    const variasSedes = new Set(filasPeriodo.map((p) => p.fk_tsede)).size > 1
    return filasPeriodo.map((p) => ({
      value: String(p.fk_tperiodo_academico),
      label: variasSedes ? `${p.nombre} · ${p.sede_nombre}` : p.nombre,
    }))
  }, [filasPeriodo])
  // Un solo período, o el vigente, queda elegido sin pedirlo.
  const porDefecto =
    periodoOpciones.length === 1
      ? periodoOpciones[0].value
      : String(filasPeriodo.find((p) => p.es_vigente)?.fk_tperiodo_academico ?? "")
  const periodo = periodoElegido != null && periodoOpciones.some((o) => o.value === periodoElegido) ? periodoElegido : porDefecto

  const errorPeriodo = periodo ? undefined : "El Período Académico es obligatorio."

  const mut = useExportarSimpade({
    mutationConfig: {
      onSuccess: (r) => {
        if (r.status === "ok") {
          notify(r.message, { variant: "success" })
          onClose()
        } else s.setError(new Error(r.message))
      },
      onError: (e: Error) => s.setError(e),
    },
  })

  const exportar = () => {
    s.setIntento(true)
    s.setError(null)
    if (errorPeriodo || ambito.establecimientoId == null) return enfocarPrimerError()
    mut.mutate({
      ESTABLECIMIENTO: ambito.establecimientoId,
      PERIODO_ACADEMICO: Number(periodo),
      SEDE: sede ? Number(sede) : null,
      JORNADA: jornada ? Number(jornada) : null,
    })
  }

  return (
    <DialogoOperacionShell
      titulo="Exportar para el SIMPADE"
      onClose={onClose}
      error={s.error}
      pending={mut.isPending}
      className="sm:max-w-2xl"
      confirmar={{
        label: "Exportar",
        icon: <FileXlsIcon data-icon="inline-start" />,
        disabled: ambito.establecimientoId == null,
        onClick: exportar,
      }}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          Un solo archivo de apoyo con una fila por estudiante con matrícula en el Período Académico (Cursando o
          retirado durante el período), no solo los que tienen alerta, con los datos que ya están en la plataforma:
        </p>
        <ul className="list-disc pl-5 text-sm">
          {DATOS.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ComboOpciones
            id="simpade-periodo-academico"
            label="Período Académico"
            required
            todos={false}
            placeholder="Seleccione"
            value={periodo}
            options={periodoOpciones}
            error={s.intento ? errorPeriodo : undefined}
            onChange={setPeriodo}
          />
          <ComboOpciones
            id="simpade-sede"
            label="Sede"
            todos="Todas"
            value={sede}
            options={ambito.sedeOpciones}
            onChange={(v) => {
              setSede(v)
              setJornada("")
              setPeriodo(null)
            }}
          />
          <ComboOpciones
            id="simpade-jornada"
            label="Jornada"
            todos="Todas"
            disabled={!sede}
            value={jornada}
            options={ambito.jornadaOpciones}
            onChange={setJornada}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          El Nivel de riesgo es la valoración interna del Profesional de orientación: el archivo no lo convierte al
          índice de riesgo de deserción del SIMPADE.
        </p>
        <p className="text-xs text-muted-foreground">
          No incluye la información sensible, salvo lo que el SIMPADE exija. La generación queda registrada en la
          bitácora, con los filtros y la versión de la estructura y de las listas.
        </p>
      </div>
    </DialogoOperacionShell>
  )
}
