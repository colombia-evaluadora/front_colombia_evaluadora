import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { ControlPointIcon } from "@/components/ui/icons"

import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { BotonQuitar } from "@/features/gestion-estudiantil/commons/components/boton-quitar"
import type { Opcion } from "@/features/gestion-estudiantil/commons/utils/opcion"
import { useFuncionariosFirmanteQuery } from "@/features/gestion-estudiantil/inclusion/orientacion/api/query/use-orientacion-query"
import { AvisoPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/ui-piar"
import { esOpcionElegida } from "@/features/gestion-estudiantil/inclusion/piar/utils/piar"

export const MAX_FIRMANTES = 3

export interface FirmanteForm {
  /** Identidad estable de la fila mientras se edita. */
  clave: number
  funcionario: string
  nombre: string
  calidad: string
}

interface Props {
  filas: FirmanteForm[]
  onChange: (filas: FirmanteForm[]) => void
  /** Opciones de la lista CALIDAD_FIRMANTE_ATENCION. */
  calidades: Opcion[]
  disabled?: boolean
  /** Mensaje por fila tras intentar guardar. */
  errores?: Record<number, string | undefined>
}

/**
 * Firmantes adicionales de la ficha impresa de la atención (ATE.1): de 0 a 3, funcionario del alcance y su calidad.
 * No existe un constructor repetible común (las actas de Convivencia y el PIAR llevan el suyo, con otros campos).
 */
export function FirmantesAtencion({ filas, onChange, calidades, disabled, errores = {} }: Props) {
  const [texto, setBusqueda] = useState("")
  // Búsqueda por servidor (SEARCH) con debounce: no se consulta por cada tecla.
  const [busqueda, setBusquedaDiferida] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDiferida(texto), 300)
    return () => clearTimeout(t)
  }, [texto])
  const { data } = useFuncionariosFirmanteQuery(busqueda, !disabled)
  const encontrados = useMemo(() => data ?? [], [data])

  const opciones = (fila: FirmanteForm): Opcion[] => {
    const usados = new Set(filas.filter((f) => f.clave !== fila.clave).map((f) => f.funcionario))
    const base = encontrados
      .filter((f) => !usados.has(String(f.fk_tfuncionario)))
      .map((f) => ({ value: String(f.fk_tfuncionario), label: f.roles ? `${f.nombre} · ${f.roles}` : f.nombre }))
    // El elegido puede no estar en la búsqueda actual: se conserva para que no pierda su etiqueta.
    return fila.funcionario && !base.some((o) => o.value === fila.funcionario) ? [{ value: fila.funcionario, label: fila.nombre }, ...base] : base
  }
  const cambiar = (clave: number, parte: Partial<FirmanteForm>) => onChange(filas.map((f) => (f.clave === clave ? { ...f, ...parte } : f)))

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Firmantes adicionales (hasta {MAX_FIRMANTES})</h2>
        {!disabled && (
          <Button
            size="xs"
            variant="outline"
            color="neutral"
            type="button"
            disabled={filas.length >= MAX_FIRMANTES}
            onClick={() => onChange([...filas, { clave: Math.max(0, ...filas.map((f) => f.clave)) + 1, funcionario: "", nombre: "", calidad: "" }])}
          >
            <ControlPointIcon data-icon="inline-start" />
            Agregar firmante
          </Button>
        )}
      </div>
      {filas.length > 0 && <AvisoPiar tipo="info">El firmante podrá leer la ficha impresa.</AvisoPiar>}
      {filas.map((f, i) => {
        const lista = opciones(f)
        return (
          <div key={f.clave} className="flex items-start gap-2">
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <ComboOpciones
                id={`ate-firmante-${f.clave}`}
                label={`Funcionario ${i + 1}`}
                required
                todos={false}
                placeholder="Seleccione"
                disabled={disabled}
                value={f.funcionario}
                options={lista}
                error={errores[f.clave]}
                onChange={(v) => cambiar(f.clave, { funcionario: v, nombre: lista.find((o) => o.value === v)?.label ?? "" })}
                onInputChange={(texto) => !esOpcionElegida(texto, lista) && setBusqueda(texto)}
              />
              <ComboOpciones
                id={`ate-firmante-calidad-${f.clave}`}
                label="Calidad"
                required
                todos={false}
                placeholder="Seleccione"
                disabled={disabled}
                value={f.calidad}
                options={calidades}
                onChange={(v) => cambiar(f.clave, { calidad: v })}
              />
            </div>
            {!disabled && <BotonQuitar label={`Quitar al firmante ${i + 1}`} onClick={() => onChange(filas.filter((x) => x.clave !== f.clave))} />}
          </div>
        )
      })}
    </section>
  )
}
