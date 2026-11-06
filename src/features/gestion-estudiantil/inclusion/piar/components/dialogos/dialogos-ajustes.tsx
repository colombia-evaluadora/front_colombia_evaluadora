import { useCatalogo } from "@/features/gestion-estudiantil/convivencia/api/use-catalogos-convivencia"
import { useAsignaturasPiarQuery, usePeriodosPiarQuery } from "@/features/gestion-estudiantil/inclusion/piar/api/query/use-piar-query"
import { useEjecutarPiar } from "@/features/gestion-estudiantil/inclusion/piar/api/mutations/piar"

import { FormDialogPiar, type CampoPiar } from "@/features/gestion-estudiantil/inclusion/piar/components/form-dialog-piar"
import type { DialogoProps } from "@/features/gestion-estudiantil/inclusion/piar/components/dialogos/tipos"
import { nulo, texto } from "@/features/gestion-estudiantil/inclusion/piar/components/dialogos/tipos"

export function DialogosAjustes({ piar, dialogo, onClose }: DialogoProps) {
  const ejecutar = useEjecutarPiar()
  const estudiante = piar.estudiante.nombre
  const tiposAjuste = useCatalogo("TIPO_AJUSTE_RAZONABLE")
  const barreras = useCatalogo("TIPO_BARRERA")
  const adaptaciones = useCatalogo("TIPO_ADAPTACION")
  const coberturas = useCatalogo("COBERTURA_AJUSTES_PIAR")
  const asignaturas = (useAsignaturasPiarQuery(piar.id, dialogo?.tipo === "ajuste" || dialogo?.tipo === "asignar").data ?? []).map((a) => ({ value: String(a.fk_tasignatura), label: a.nombre }))
  const periodos = (usePeriodosPiarQuery(piar.id, dialogo?.tipo === "seguimiento" ? dialogo.ajuste.id : undefined).data ?? [])
    .filter((p) => !p.tiene_seguimiento)
    .map((p) => ({ value: String(p.fk_tperiodo_evaluacion), label: p.nombre }))
  const comunes = { onClose, abierto: true }

  switch (dialogo.tipo) {
    case "cobertura": {
      const f = dialogo.fila
      const opciones = coberturas.filter((c) => c.codigo !== "PENDIENTE_REVISION")
      const sinAjustes = opciones.find((c) => c.codigo === "SIN_AJUSTES")?.value
      return (
        <FormDialogPiar
          {...comunes}
          titulo={`Revisar cobertura — ${f.asignatura_nombre}`}
          descripcion={`Estudiante: ${estudiante} · ${piar.estudiante.grado_grupo} · Cobertura actual: ${f.cobertura_nombre}`}
          confirmar="Registrar revisión"
          inicial={{ cobertura: coberturas.find((c) => c.codigo === f.cobertura && c.codigo !== "PENDIENTE_REVISION")?.value, justificacion: f.justificacion }}
          campos={[
            { name: "cobertura", label: "Cobertura", kind: "select", required: true, options: opciones, ancho: true },
            texto("justificacion", "Justificación", 2000, { required: true, visible: (v) => v.cobertura === sinAjustes }),
          ]}
          onSubmit={(v) =>
            ejecutar("post", `/${piar.id}/cobertura`, {
              FK_ASIGNATURA: f.fk_tasignatura,
              FK_COBERTURA: Number(v.cobertura),
              JUSTIFICACION: v.cobertura === sinAjustes ? v.justificacion : null,
            })
          }
        />
      )
    }
    case "ajuste": {
      const a = dialogo.ajuste
      const infraestructura = tiposAjuste.find((x) => x.codigo === "INFRAESTRUCTURA")?.value
      const adaptacionOtro = adaptaciones.find((x) => /^otr/i.test(x.codigo) || /^otr/i.test(x.label))?.value
      return (
        <FormDialogPiar
          {...comunes}
          titulo={a ? "Modificar ajuste" : "Agregar ajuste"}
          descripcion={`Estudiante: ${estudiante}`}
          confirmar={a ? "Guardar" : "Agregar"}
          inicial={{
            asignatura: a?.fk_tasignatura?.toString(),
            tipo: a?.tipo_ajuste.id.toString(),
            barrera: a?.tipo_barrera?.id.toString(),
            adaptacion: a?.tipo_adaptacion.id.toString(),
            especificacion: a?.especificacion,
            barrera_concreta: a?.barrera_concreta,
            meta: a?.meta,
            ajuste: a?.ajuste,
            recursos: a?.recursos,
            apoyos: a?.apoyos_requeridos,
          }}
          campos={[
            { name: "asignatura", label: "Asignatura", kind: "select", options: asignaturas, required: true, visible: (v) => v.tipo !== infraestructura },
            { name: "tipo", label: "Tipo de ajuste", kind: "select", required: true, options: tiposAjuste },
            { name: "barrera", label: "Tipo de barrera", kind: "select", options: barreras },
            { name: "adaptacion", label: "Tipo de adaptación", kind: "select", required: true, options: adaptaciones },
            { name: "especificacion", label: "Especificación", kind: "texto", required: true, min: 3, max: 100, ancho: true, visible: (v) => v.adaptacion === adaptacionOtro },
            texto("barrera_concreta", "Barrera concreta", 2000, { required: true, min: 10 }),
            texto("meta", "Meta de aprendizaje", 1000, { required: true, min: 10 }),
            texto("ajuste", "Ajuste", 500, { required: true, min: 10 }),
            texto("recursos", "Recursos", 1000),
            texto("apoyos", "Apoyos requeridos", 1000),
          ]}
          onSubmit={(v) =>
            ejecutar("post", `/${piar.id}/ajustes`, {
              AJUSTE: a?.id ?? null,
              FK_ASIGNATURA: v.tipo === infraestructura ? null : nulo(v.asignatura),
              FK_IPO_AJUSTE: Number(v.tipo),
              FK_IPO_BARRERA: nulo(v.barrera),
              FK_IPO_ADAPTACION: Number(v.adaptacion),
              ESPECIFICACION: v.adaptacion === adaptacionOtro ? v.especificacion : null,
              BARRERA_CONCRETA: v.barrera_concreta,
              META: v.meta,
              TEXTO_AJUSTE: v.ajuste,
              RECURSOS: nulo(v.recursos),
              APOYOS_REQUERIDOS: nulo(v.apoyos),
              PRODUCTOS_APOYO: a?.productos_apoyo ?? null,
            })
          }
        />
      )
    }
    case "quitarAjuste":
      return (
        <FormDialogPiar
          {...comunes}
          titulo="Quitar ajuste"
          descripcion={`${dialogo.ajuste.asignatura_nombre ?? "Sin asignatura"} · ${dialogo.ajuste.ajuste}`}
          confirmar="Quitar"
          confirmarColor="destructive"
          campos={[texto("motivo", "Motivo", 1000, { required: true, min: 10 })]}
          onSubmit={(v) => ejecutar("post", `/ajustes/${dialogo.ajuste.id}/quitar`, { MOTIVO: v.motivo })}
        />
      )
    case "asignar":
      return (
        <FormDialogPiar
          {...comunes}
          titulo={`Asignar asignatura — Ajuste ${dialogo.indice}`}
          descripcion={`Ajuste del PIAR de origen: ${dialogo.ajuste.ajuste} · Meta: ${dialogo.ajuste.meta}`}
          confirmar="Asignar"
          campos={[{ name: "asignatura", label: "Asignatura", kind: "select", required: true, options: asignaturas, ancho: true }]}
          onSubmit={(v) => ejecutar("post", `/ajustes/${dialogo.ajuste.id}/area`, { FK_ASIGNATURA: Number(v.asignatura) })}
        />
      )
    case "seguimiento":
      return (
        <FormDialogPiar
          {...comunes}
          titulo={`Registrar seguimiento — ${estudiante}`}
          descripcion={`${dialogo.ajuste.asignatura_nombre ?? "Transversal"} · ${dialogo.ajuste.ajuste}`}
          confirmar="Registrar"
          campos={[
            { name: "periodo", label: "Período de Evaluación", kind: "select", required: true, options: periodos, ancho: true },
            texto("avance", "Avance", 2000, { required: true, min: 10 }),
          ]}
          onSubmit={(v) => ejecutar("post", `/ajustes/${dialogo.ajuste.id}/seguimientos`, { FK_PERIODO_EVALUACION: Number(v.periodo), AVANCE: v.avance })}
        />
      )
    case "evidencia": {
      const fijo = dialogo.ajuste
      return (
        <FormDialogPiar
          {...comunes}
          titulo={`Registrar evidencia directa — ${estudiante}`}
          descripcion={fijo ? `${fijo.asignatura_nombre ?? "Transversal"} · ${fijo.ajuste}` : undefined}
          confirmar="Registrar"
          archivos={{ label: "Archivos", max: 3, ayuda: "Hasta 3 · PDF, JPG o PNG, máximo 10 MB cada uno" }}
          campos={[
            ...(fijo
              ? []
              : [{ name: "ajuste", label: "Ajuste", kind: "select", required: true, ancho: true, options: piar.ajustes.map((a) => ({ value: String(a.id), label: `${a.asignatura_nombre ?? "Transversal"} · ${a.ajuste}` })) } as CampoPiar]),
            { name: "fecha", label: "Fecha", kind: "fecha", required: true },
            texto("descripcion", "Descripción", 1000, { required: true, min: 10 }),
          ]}
          onSubmit={(v, archivos) =>
            ejecutar("post", `/ajustes/${fijo?.id ?? v.ajuste}/evidencias`, { FECHA: v.fecha, DESCRIPCION: v.descripcion, ARCHIVOS: archivos })
          }
        />
      )
    }
    default:
      return null
  }
}
