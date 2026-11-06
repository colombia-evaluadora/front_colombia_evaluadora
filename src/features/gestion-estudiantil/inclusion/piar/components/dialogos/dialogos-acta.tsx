import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { WarningCircleIcon } from "@/components/ui/icons"
import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { useEjecutarPiar } from "@/features/gestion-estudiantil/inclusion/piar/api/mutations/piar"
import { useParticipantesOpcionQuery } from "@/features/gestion-estudiantil/inclusion/piar/api/query/use-piar-query"

import { FormDialogPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/form-dialog-piar"
import type { DialogoProps } from "@/features/gestion-estudiantil/inclusion/piar/components/dialogos/tipos"
import { nulo, texto } from "@/features/gestion-estudiantil/inclusion/piar/components/dialogos/tipos"

export function DialogosActa({ piar, dialogo, onClose }: DialogoProps) {
  const ejecutar = useEjecutarPiar()
  const estudiante = piar.estudiante.nombre
  const tiposPersona = useCatalogo("TIPO_PERSONA_ACTA")
  const calidades = useCatalogo("CALIDAD_PARTICIPACION_PIAR")
  const firmas = useCatalogo("ESTADO_FIRMA")
  const medios = useCatalogo("MEDIO_ENTREGA_PIAR")
  const tiposCambio = useCatalogo("TIPO_CAMBIO_PIAR")
  const personas = useParticipantesOpcionQuery(piar.id, dialogo?.tipo === "participante" || dialogo?.tipo === "antecedente").data ?? []
  const version = piar.version_actual
  const comunes = { onClose, abierto: true }

  switch (dialogo.tipo) {
    case "participante": {
      const externo = tiposPersona.find((t) => t.codigo === "PERSONA_EXTERNA")?.value
      const firmo = firmas.find((f) => f.codigo === "FIRMO")?.value
      const otra = calidades.find((c) => c.codigo === "OTRA")?.value
      const codigoTipo = (value: string) => tiposPersona.find((t) => t.value === value)?.codigo
      return (
        <FormDialogPiar
          {...comunes}
          titulo="Agregar participante — Acta de acuerdo"
          confirmar="Agregar"
          inicial={{ firmar: "SI", firma: firmas.find((f) => f.codigo === "PENDIENTE")?.value }}
          archivos={{ label: "Firma cargada", max: 1, ayuda: "Opcional · PDF, JPG o PNG, máximo 10 MB" }}
          campos={[
            { name: "tipo", label: "Tipo de persona", kind: "select", required: true, options: tiposPersona },
            { name: "persona", label: "Persona registrada", kind: "select", required: true, visible: (v) => Boolean(v.tipo) && v.tipo !== externo, options: personas.map((p, i) => ({ value: String(i), label: p.detalle ? `${p.nombre} · ${p.detalle}` : p.nombre })) },
            { name: "externo_nombre", label: "Nombre", kind: "texto", required: true, max: 200, visible: (v) => v.tipo === externo },
            { name: "externo_id", label: "Identificación", kind: "texto", max: 50, visible: (v) => v.tipo === externo },
            { name: "calidad", label: "Calidad en que participa", kind: "select", required: true, options: calidades },
            { name: "otra", label: "¿Cuál?", kind: "texto", required: true, max: 200, visible: (v) => v.calidad === otra },
            texto("compromisos", "Compromisos asumidos", 2000),
            { name: "firmar", label: "Debe firmar", kind: "select", required: true, options: [{ value: "SI", label: "Sí" }, { value: "NO", label: "No" }] },
            { name: "firma", label: "Estado de firma", kind: "select", options: firmas, visible: (v) => v.firmar === "SI" },
            { name: "fecha_firma", label: "Fecha de firma", kind: "fecha", required: true, visible: (v) => v.firmar === "SI" && v.firma === firmo },
          ]}
          onSubmit={(v, archivos) => {
            const esExterno = v.tipo === externo
            const persona = esExterno ? null : personas[Number(v.persona)]
            if (persona && persona.tipo_persona !== codigoTipo(v.tipo)) throw new Error("La persona elegida no corresponde al tipo de persona.")
            return ejecutar("post", `/versiones/${version?.id}/participantes`, {
              PARTICIPANTE: null,
              FK_IPO_PERSONA: Number(v.tipo),
              FK_FUNCIONARIO: persona?.fk_tfuncionario ?? null,
              FK_ESTUDIANTE: persona?.fk_testudiante ?? null,
              FK_PADRE: persona?.fk_tpadre ?? null,
              EXTERNO_NOMBRE: esExterno ? v.externo_nombre : null,
              EXTERNO_IDENTIFICACION: esExterno ? nulo(v.externo_id) : null,
              FK_CALIDAD: Number(v.calidad),
              OTRA_CALIDAD: v.calidad === otra ? v.otra : null,
              COMPROMISOS: nulo(v.compromisos),
              DEBE_FIRMAR: v.firmar === "SI",
              FK_ESTADO_FIRMA: v.firmar === "SI" ? nulo(v.firma) : null,
              FECHA_FIRMA: v.firma === firmo ? v.fecha_firma : null,
              FK_ARCHIVO_FIRMA: archivos[0] ?? null,
            })
          }}
        />
      )
    }
    case "acta":
      return (
        <FormDialogPiar
          {...comunes}
          titulo={`Activar PIAR — ${estudiante}`}
          descripcion="Al cargar el acta de acuerdo firmada, el PIAR pasa de Borrador a Vigente."
          confirmar="Activar PIAR"
          archivos={{ label: "Acta de acuerdo firmada", max: 1, required: true, ayuda: "PDF o imagen, máximo 10 MB." }}
          campos={[]}
          onSubmit={async (_, archivos) => {
            await ejecutar("put", `/versiones/${version?.id}/acta`, {
              FECHA_ACUERDO: version?.fecha_acuerdo,
              COMPROMISOS_ESTABLECIMIENTO: version?.compromisos_establecimiento,
              COMPROMISOS_FAMILIA: version?.compromisos_familia,
              FK_ARCHIVO_ACTA: archivos[0],
            })
            return ejecutar("post", `/${piar.id}/activar`, { COPIA_FECHA: null, FK_MEDIO_COPIA: null })
          }}
        />
      )
    case "bloqueos":
      return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>No se puede activar el PIAR de {estudiante}</DialogTitle>
            </DialogHeader>
            <p className="text-sm">Para activarlo falta:</p>
            <ul className="grid gap-2 text-sm">
              {(piar.activacion_faltantes ?? []).map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <WarningCircleIcon className="mt-0.5 size-4 shrink-0 text-yellow" />
                  {f}
                </li>
              ))}
            </ul>
            <DialogFooter>
              <DialogClose render={<Button size="sm" type="button" />}>Entendido</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )
    case "copia":
      return (
        <FormDialogPiar
          {...comunes}
          titulo={`Registrar copia a la familia — ${estudiante}`}
          confirmar="Registrar"
          campos={[
            { name: "fecha", label: "Fecha de entrega", kind: "fecha", required: true },
            { name: "medio", label: "Medio de entrega", kind: "select", required: true, options: medios },
          ]}
          onSubmit={(v) => ejecutar("post", `/${piar.id}/copia-familia`, { FECHA: v.fecha, FK_MEDIO: Number(v.medio) })}
        />
      )
    case "actualizar": {
      return (
        <FormDialogPiar
          {...comunes}
          titulo={`Actualizar el acuerdo — ${estudiante}`}
          confirmar="Registrar cambio"
          archivos={{ label: "Documento de actualización firmado", max: 1, ayuda: "En un cambio sustancial, la versión queda pendiente hasta cargarlo." }}
          campos={[
            { name: "tipo", label: "Tipo de cambio", kind: "select", required: true, options: tiposCambio },
            { name: "aplica", label: "Aplica desde", kind: "fecha", required: true },
            { name: "elemento", label: "Elemento que cambia", kind: "texto", required: true, max: 200, ancho: true },
            texto("antes", "Antes", 1000, { required: true }),
            texto("ahora", "Ahora", 1000, { required: true }),
            texto("que", "Qué cambió", 1000, { required: true, min: 3 }),
            texto("porque", "Por qué", 1000, { required: true, min: 3 }),
          ]}
          onSubmit={(v, archivos) =>
            ejecutar("post", `/${piar.id}/actualizaciones`, {
              FK_IPO_CAMBIO: Number(v.tipo),
              QUE_CAMBIO: v.que,
              POR_QUE: v.porque,
              APLICA_DESDE: v.aplica,
              VALORES_ANTERIORES: { [v.elemento]: v.antes },
              VALORES_NUEVOS: { [v.elemento]: v.ahora },
              FK_ARCHIVO_SOPORTE: archivos[0] ?? null,
            })
          }
        />
      )
    }
    default:
      return null
  }
}
