import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { XIcon } from "@/components/ui/icons"

import { CampoTexto } from "@/features/gestion-estudiantil/prevencion/components/estrategias/form/campo-texto"
import { CampoLista } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-lista"
import { CampoSiNo } from "@/features/gestion-estudiantil/prevencion/components/caracterizacion/form/campo-si-no"
import type { FormularioCaracterizacion } from "@/features/gestion-estudiantil/prevencion/hooks/use-caracterizacion-form"
import {
  esProgenitor,
  MAX,
  type IntegranteForm,
} from "@/features/gestion-estudiantil/prevencion/utils/formularios-caracterizacion"

interface Props {
  f: FormularioCaracterizacion
  integrante: IntegranteForm
  indice: number
}

const soloDigitos = (t: string, largo: number) => t.replace(/\D/g, "").slice(0, largo)

/** Una persona del núcleo familiar o de apoyo: una fila con las condiciones que le corresponden. */
export function FilaIntegrante({ f, integrante: i, indice: n }: Props) {
  const p = `integrante-${n}`
  const cambiar = (parche: Partial<IntegranteForm>) => f.integrantes.cambiar(i.clave, parche)
  // El número de hijos solo aplica al padre, la madre y el acudiente.
  const aceptaHijos = esProgenitor(f.listas.PARENTESCO, i.parentesco) || i.esAcudiente

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">Integrante {n + 1}</h3>
        {i.esAcudiente && (
          <Badge variant="soft" color="info">
            Acudiente de la matrícula
          </Badge>
        )}
        {!f.lectura && (
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
            className="ml-auto"
            aria-label={`Quitar al integrante ${n + 1}`}
            onClick={() => f.integrantes.quitar(i.clave)}
          >
            <XIcon />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <CampoLista
          id={`${p}-parentesco`}
          label="Parentesco"
          required
          opciones={f.listas.PARENTESCO}
          value={i.parentesco}
          disabled={f.lectura}
          error={f.error(`${p}-parentesco`)}
          onChange={(parentesco) => cambiar({ parentesco, hijos: aceptaHijosDe(f, parentesco, i) ? i.hijos : "" })}
        />
        <CampoTexto
          id={`${p}-nombre`}
          label="Nombre"
          max={MAX.nombre}
          value={i.nombre}
          disabled={f.lectura}
          onChange={(nombre) => cambiar({ nombre })}
        />
        <CampoTexto
          id={`${p}-edad`}
          label="Edad"
          inputMode="numeric"
          value={i.edad}
          disabled={f.lectura}
          error={f.error(`${p}-edad`)}
          onChange={(t) => cambiar({ edad: soloDigitos(t, 3) })}
        />
        <CampoLista
          id={`${p}-escolaridad`}
          label="Nivel de escolaridad"
          opciones={f.listas.NIVEL_ESTUDIO}
          value={i.escolaridad}
          disabled={f.lectura}
          onChange={(escolaridad) => cambiar({ escolaridad })}
        />
        <CampoLista
          id={`${p}-empleo`}
          label="Tipo de empleo"
          opciones={f.listas.TIPO_EMPLEO}
          value={i.empleo}
          disabled={f.lectura}
          onChange={(empleo) => cambiar({ empleo })}
        />
        <CampoSiNo
          id={`${p}-vive`}
          label="Vive con el estudiante"
          required
          value={i.vive}
          disabled={f.lectura}
          error={f.error(`${p}-vive`)}
          onChange={(vive) => cambiar({ vive })}
        />
        <CampoSiNo
          id={`${p}-cuidador`}
          label="Es cuidador principal"
          value={i.cuidador}
          disabled={f.lectura}
          error={f.error(`${p}-cuidador`)}
          onChange={(cuidador) => cambiar({ cuidador })}
        />
        <CampoTexto
          id={`${p}-hijos`}
          label="Número de hijos"
          inputMode="numeric"
          value={i.hijos}
          disabled={f.lectura || !aceptaHijos}
          ayuda="Solo para el padre, la madre y el acudiente."
          error={f.error(`${p}-hijos`)}
          onChange={(t) => cambiar({ hijos: soloDigitos(t, 2) })}
        />
        <div className="lg:col-span-2 xl:col-span-4">
          <CampoTexto
            id={`${p}-apoyo`}
            label="Apoyo que proporciona"
            max={MAX.apoyo}
            value={i.apoyo}
            disabled={f.lectura}
            onChange={(apoyo) => cambiar({ apoyo })}
          />
        </div>
      </div>
    </div>
  )
}

/** Con otro parentesco, el número de hijos se conserva solo si la fila sigue siendo padre, madre o acudiente. */
const aceptaHijosDe = (f: FormularioCaracterizacion, parentesco: string, i: IntegranteForm) =>
  esProgenitor(f.listas.PARENTESCO, parentesco) || i.esAcudiente
