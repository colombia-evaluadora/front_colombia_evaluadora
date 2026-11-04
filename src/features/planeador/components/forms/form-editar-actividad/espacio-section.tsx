import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useNotify } from "@/components/notice/notice-context"
import { paths } from "@/config/paths"
import { getErrorMessage } from "@/lib/api-client"
import {
  useGuardarHerramientas,
  useQuitarEspacio,
} from "@/features/comunicaciones/espacios/api/mutations/use-acciones-espacio"
import { useConfiguracionEspacioQuery } from "@/features/comunicaciones/espacios/api/query/use-espacios-query"
import type { ConfiguracionEspacio, HerramientaEspacio } from "@/features/comunicaciones/espacios/api/types"

const HERRAMIENTAS: { valor: HerramientaEspacio; label: string }[] = [
  { valor: "CHAT", label: "Chat" },
  { valor: "FORO", label: "Foro" },
  { valor: "ENCUESTAS", label: "Encuestas" },
  { valor: "EQUIPOS", label: "Equipos" },
]
const OPCIONES = { SIN: "Sin espacio", INTERNO: "Espacio interno" }

function Formulario({ actividadId, config }: { actividadId: number; config: ConfiguracionEspacio }) {
  const { notify } = useNotify()
  const guardar = useGuardarHerramientas(actividadId)
  const quitar = useQuitarEspacio(actividadId)
  const [tipo, setTipo] = useState<"SIN" | "INTERNO">(config.espacioId ? "INTERNO" : "SIN")
  const [elegidas, setElegidas] = useState<HerramientaEspacio[]>(config.herramientas)
  const bloqueado = !config.puedeEditar
  const fallar = (error: unknown) => notify(getErrorMessage(error), { variant: "error" })

  const onGuardar = () => {
    const listo = { onSuccess: () => notify("Espacio actualizado."), onError: fallar }
    if (tipo === "SIN") quitar.mutate(undefined, listo)
    else guardar.mutate(elegidas, listo)
  }

  return (
    <div className="space-y-3">
      <Field>
        <FieldLabel>Espacio de interacción</FieldLabel>
        <Select
          items={OPCIONES}
          value={tipo}
          disabled={bloqueado || config.tieneContenido}
          onValueChange={(v) => setTipo(v as "SIN" | "INTERNO")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SIN">Sin espacio</SelectItem>
            <SelectItem value="INTERNO">Espacio interno</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {config.tieneContenido && (
        <p className="text-sm text-muted-foreground">No se puede cambiar el espacio porque ya tiene participaciones.</p>
      )}
      {tipo === "INTERNO" && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Herramientas del espacio</legend>
          {HERRAMIENTAS.map((h) => (
            <label key={h.valor} className="flex items-center gap-2 text-sm">
              <Checkbox
                disabled={bloqueado}
                checked={elegidas.includes(h.valor)}
                onCheckedChange={(marcada) =>
                  setElegidas(marcada ? [...elegidas, h.valor] : elegidas.filter((x) => x !== h.valor))
                }
              />
              {h.label}
            </label>
          ))}
          <p className="text-xs text-muted-foreground">
            Deshabilitar una herramienta detiene nuevas aportaciones y conserva lo escrito.
          </p>
        </fieldset>
      )}
      <div className="flex flex-wrap gap-2">
        {!bloqueado && (
          <Button
            type="button"
            size="sm"
            disabled={guardar.isPending || quitar.isPending || (tipo === "INTERNO" && elegidas.length === 0)}
            onClick={onGuardar}
          >
            Guardar espacio
          </Button>
        )}
        {config.espacioId && (
          <Button
            variant="outline"
            color="neutral"
            size="sm"
            nativeButton={false}
            render={<Link to={paths.app.comunicacionesEspacio.getHref(String(config.espacioId))} />}
          >
            Abrir espacio
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Bloque 4: Espacio de interacción. Se guarda aparte del formulario (botón propio) para no meter un
 * paso más en el guardado multi-paso de la actividad; por eso pide que la actividad ya exista.
 * "Enlace externo" no se ofrece: requiere el catálogo de dominios autorizados, que aún no existe.
 */
export function EspacioSection({ actividadId }: { actividadId: number | null }) {
  const { data: config, isPending, isError } = useConfiguracionEspacioQuery(actividadId)
  return (
    <Card className="space-y-3 p-4">
      <h3 className="font-medium">Espacio de interacción</h3>
      {!actividadId ? (
        <p className="text-sm text-muted-foreground">Guarde la actividad para activar su espacio.</p>
      ) : isPending ? null : isError || !config ? (
        <p className="text-sm text-red">No se pudo cargar la configuración del espacio.</p>
      ) : (
        <Formulario key={config.espacioId ?? 0} actividadId={actividadId} config={config} />
      )}
    </Card>
  )
}
