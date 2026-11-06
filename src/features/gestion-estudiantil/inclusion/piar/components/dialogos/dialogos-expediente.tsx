import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { useEjecutarPiar } from "@/features/gestion-estudiantil/inclusion/piar/api/mutations/piar"
import { useParticipantesOpcionQuery } from "@/features/gestion-estudiantil/inclusion/piar/api/query/use-piar-query"

import { FormDialogPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/form-dialog-piar"
import type { DialogoProps } from "@/features/gestion-estudiantil/inclusion/piar/components/dialogos/tipos"
import { nulo, texto } from "@/features/gestion-estudiantil/inclusion/piar/components/dialogos/tipos"

export function DialogosExpediente({ piar, dialogo, onClose }: DialogoProps) {
  const ejecutar = useEjecutarPiar()
  const estudiante = piar.estudiante.nombre
  const integrantes = useCatalogo("TIPO_INTEGRANTE_PIAR")
  const tiposDocumento = useCatalogo("TIPO_DOCUMENTO_EXTERNO_PIAR")
  const personas = useParticipantesOpcionQuery(piar.id, dialogo?.tipo === "participante" || dialogo?.tipo === "antecedente").data ?? []
  const comunes = { onClose, abierto: true }

  switch (dialogo.tipo) {
    case "actividad": {
      const a = dialogo.actividad
      return (
        <FormDialogPiar
          {...comunes}
          titulo={a ? "Modificar actividad familiar" : "Agregar actividad familiar"}
          confirmar={a ? "Guardar" : "Agregar"}
          inicial={a as unknown as Record<string, string>}
          campos={[
            { name: "actividad", label: "Actividad", kind: "texto", required: true, max: 200 },
            { name: "frecuencia", label: "Frecuencia acordada", kind: "texto", required: true, max: 100 },
            { name: "responsable", label: "Responsable acordado", kind: "texto", required: true, max: 200 },
            { name: "fecha_revision", label: "Fecha de revisión", kind: "fecha", required: true },
            texto("descripcion", "Descripción", 1000, { required: true }),
          ]}
          onSubmit={(v) =>
            ejecutar("post", `/${piar.id}/actividades-familiares`, {
              ACTIVIDAD_FAMILIAR: a?.id ?? null,
              ACTIVIDAD: v.actividad,
              DESCRIPCION: v.descripcion,
              FRECUENCIA: v.frecuencia,
              RESPONSABLE: v.responsable,
              FECHA_REVISION: v.fecha_revision,
            })
          }
        />
      )
    }
    case "resultado":
      return (
        <FormDialogPiar
          {...comunes}
          titulo={`Registrar resultado — ${dialogo.actividad.actividad}`}
          confirmar="Registrar"
          campos={[
            { name: "fecha", label: "Fecha del seguimiento", kind: "fecha", required: true },
            { name: "fuente", label: "Fuente de la información", kind: "texto", required: true, max: 200 },
            texto("resultado", "Resultado del seguimiento", 2000, { required: true }),
          ]}
          onSubmit={(v) =>
            ejecutar("post", `/actividades-familiares/${dialogo.actividad.id}/resultado`, { RESULTADO: v.resultado, FECHA_RESULTADO: v.fecha, FUENTE_RESULTADO: v.fuente })
          }
        />
      )
    case "red":
      return (
        <FormDialogPiar
          {...comunes}
          titulo="Agregar red de apoyo"
          confirmar="Agregar"
          campos={[
            { name: "tipo", label: "Tipo de integrante", kind: "select", required: true, options: integrantes },
            { name: "persona", label: "Persona o institución", kind: "texto", required: true, max: 200 },
            { name: "relacion", label: "Relación", kind: "texto", required: true, max: 200, ancho: true },
            texto("apoyo", "Apoyo que brinda", 1000, { required: true }),
          ]}
          onSubmit={(v) =>
            ejecutar("post", `/${piar.id}/red-apoyo`, { RED: null, FK_IPO_INTEGRANTE: Number(v.tipo), FK_PADRE: null, PERSONA_INSTITUCION: v.persona, RELACION: v.relacion, APOYO: v.apoyo })
          }
        />
      )
    case "informes": {
      const disponibles = 5 - (piar.informes_profesionales?.length ?? 0)
      return (
        <FormDialogPiar
          {...comunes}
          titulo="Adjuntar informes de profesionales"
          confirmar="Adjuntar"
          archivos={{ label: "Informes", max: disponibles, required: true, ayuda: `Hasta ${disponibles} · PDF, JPG o PNG, máximo 10 MB cada uno` }}
          campos={[]}
          onSubmit={(_, archivos) => ejecutar("post", `/${piar.id}/informes`, { ARCHIVOS: archivos })}
        />
      )
    }
    case "antecedente":
      return (
        <FormDialogPiar
          {...comunes}
          titulo={`Registrar antecedente — ${estudiante}`}
          confirmar="Registrar"
          campos={[
            { name: "necesidad", label: "Necesidad o antecedente", kind: "texto", required: true, min: 3, max: 200, ancho: true },
            { name: "fecha", label: "Fecha", kind: "fecha", required: true },
            { name: "fuente", label: "Fuente", kind: "texto", required: true, min: 3, max: 200 },
            texto("descripcion", "Descripción", 1000, { required: true, min: 10 }),
            texto("apoyo", "Apoyo o precaución durante la jornada", 1000),
            { name: "responsable", label: "Responsable institucional", kind: "select", required: true, ancho: true, options: personas.filter((p) => p.fk_tfuncionario != null).map((p) => ({ value: String(p.fk_tfuncionario), label: p.nombre })) },
          ]}
          onSubmit={(v) =>
            ejecutar("post", `/${piar.id}/antecedentes`, {
              ANTECEDENTE: null,
              NECESIDAD: v.necesidad,
              FECHA: v.fecha,
              FUENTE: v.fuente,
              DESCRIPCION: v.descripcion,
              APOYO_JORNADA: nulo(v.apoyo),
              FK_FUNCIONARIO_RESPONSABLE: Number(v.responsable),
            })
          }
        />
      )
    case "externo":
      return (
        <FormDialogPiar
          {...comunes}
          titulo={`Incorporar documento externo — ${estudiante}`}
          confirmar="Incorporar"
          archivos={{ label: "Archivo", max: 1, required: true, ayuda: "PDF o imagen, máximo 10 MB" }}
          campos={[
            { name: "tipo", label: "Tipo de documento", kind: "select", required: true, options: tiposDocumento },
            { name: "institucion", label: "Institución de procedencia", kind: "texto", required: true, min: 3, max: 150 },
            { name: "fecha_documento", label: "Fecha del documento", kind: "fecha", required: true },
            { name: "fecha_recepcion", label: "Fecha de recepción", kind: "fecha", required: true },
          ]}
          onSubmit={(v, archivos) =>
            ejecutar("post", `/${piar.id}/documentos-externos`, {
              DOCUMENTO: null,
              FK_IPO: Number(v.tipo),
              INSTITUCION: v.institucion,
              FECHA_DOCUMENTO: v.fecha_documento,
              FECHA_RECEPCION: v.fecha_recepcion,
              FK_ARCHIVO: archivos[0],
            })
          }
        />
      )
    default:
      return null
  }
}
