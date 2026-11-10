import { memo, useMemo } from "react"

import { Button } from "@/components/ui/button"
import { TrashIcon } from "@/components/ui/icons"

import type { LimitesSancion, OpcionSancion } from "@/features/gestion-estudiantil/convivencia/api/procesos-etapas-types"
import { ComboOpciones } from "@/features/gestion-estudiantil/commons/components/combo-opciones"
import { CampoFecha } from "@/features/gestion-estudiantil/convivencia/components/procesos/dialogos/campo-fecha"
import { TextoLargo } from "@/features/gestion-estudiantil/commons/components/texto-largo"
import type { Errores, SancionFila } from "@/features/gestion-estudiantil/convivencia/utils/proceso-etapas"

interface Props {
  fila: SancionFila
  numero: number
  catalogo: OpcionSancion[]
  /** Ids ya elegidos en las filas: una sanción solo una vez por decisión. */
  usadas: Set<string>
  limites: LimitesSancion | null | undefined
  errores: Errores
  onChange: (key: string, patch: Partial<SancionFila>) => void
  onQuitar: (key: string) => void
}

/** Una sanción: catálogo, fechas (solo si tiene duración; acotadas por `limites-sancion`) y detalle. */
function FilaSancionBase({ fila: f, numero, catalogo, usadas, limites, errores, onChange, onQuitar }: Props) {
  const id = `sancion-${f.key}`
  const e = (campo: string) => errores[`sancion:${f.key}:${campo}`]
  const dura = catalogo.find((o) => String(o.id) === f.sancion)?.tiene_duracion ?? false
  const opciones = useMemo(
    () =>
      catalogo
        .filter((o) => String(o.id) === f.sancion || !usadas.has(String(o.id)))
        .map((o) => ({ value: String(o.id), label: o.nombre })),
    [catalogo, usadas, f.sancion],
  )
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border p-3">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <ComboOpciones
            id={`${id}-sancion`}
            label={`Sanción ${numero}`}
            required
            size="default"
            todos={false}
            value={f.sancion}
            options={opciones}
            error={e("sancion")}
            onChange={(sancion) => onChange(f.key, { sancion, inicio: "", fin: "" })}
          />
          {dura && (
            <>
              <CampoFecha
                id={`${id}-inicio`}
                label="Fecha de inicio"
                value={f.inicio}
                min={limites?.inicio_minimo}
                max={limites?.fin_maximo}
                error={e("inicio")}
                onChange={(inicio) => onChange(f.key, { inicio })}
              />
              <CampoFecha
                id={`${id}-fin`}
                label="Fecha de fin"
                value={f.fin}
                min={f.inicio || limites?.inicio_minimo}
                max={limites?.fin_maximo}
                error={e("fin")}
                onChange={(fin) => onChange(f.key, { fin })}
              />
            </>
          )}
        </div>
        <TextoLargo
          id={`${id}-detalle`}
          label="Detalle"
          max={1000}
          rows={2}
          placeholder="Opcional"
          value={f.detalle}
          onChange={(detalle) => onChange(f.key, { detalle })}
        />
      </div>
      <Button type="button" variant="ghost" color="neutral" size="icon-sm" aria-label={`Quitar la sanción ${numero}`} onClick={() => onQuitar(f.key)}>
        <TrashIcon />
      </Button>
    </div>
  )
}

export const FilaSancion = memo(FilaSancionBase)
