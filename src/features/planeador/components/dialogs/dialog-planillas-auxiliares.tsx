import { useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileDownloadOutlinedIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"
import { useNotify } from "@/components/notice/notice-context"
import { useAppForm } from "@/lib/forms"
import { range, required } from "@/lib/forms/messages"

import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"
import { selectCategoryQueryOptions } from "@/features/establishment/academic-period/api/query/fetch-select-category"
import { usePlanillasAuxiliaresGruposQuery } from "@/features/planeador/api/query/use-planillas-auxiliares-query"
import {
  useDescargarPlanillaAuxiliar,
  type TipoPlanillaAuxiliar,
} from "@/features/planeador/api/mutations/descargar-planilla-auxiliar"

const FORM_ID = "form-planillas-auxiliares"
/** Valor del selector de [Área] que significa «Todas» (una hoja por [Área]). */
const TODAS = -1
/**
 * Regla 96: el back ya genera Listado y Asistencia. Calificaciones y Rúbricas
 * siguen en la Lista de valores pero no se ofrecen (el `SelectField` del repo no
 * admite opciones deshabilitadas, así que no se muestran «Próximamente»).
 */
const TIPOS_DISPONIBLES: TipoPlanillaAuxiliar[] = ["LISTADO", "ASISTENCIA"]

const schema = z
  .object({
    tipo: z.string(),
    grupo: z.number(),
    area: z.number(),
    periodo: z.number(),
    contenido: z.string(),
    columnas: z.number(),
  })
  .superRefine((v, ctx) => {
    const falta = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message })
    if (!v.tipo) falta("tipo", required("El tipo de planilla"))
    if (!v.grupo) falta("grupo", required("El Grado/Grupo"))
    if (v.tipo === "LISTADO") {
      if (!Number.isInteger(v.columnas) || v.columnas < 1 || v.columnas > 10) {
        falta("columnas", range(1, 10, "El número de columnas en blanco"))
      }
    } else if (v.tipo === "ASISTENCIA") {
      if (!v.area) falta("area", required("El área"))
      if (!v.periodo) falta("periodo", required("El período de evaluación"))
      if (!v.contenido) falta("contenido", required("El contenido"))
    }
  })

/** `yyyy-MM-dd` → `dd/mm/aaaa`. */
const ddmmaaaa = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/")

/** Foco al primer campo con error, en el orden del formulario. */
function enfocarPrimerError(form: HTMLElement | null) {
  setTimeout(() => {
    const el = form?.querySelector<HTMLElement>("[aria-invalid='true']")
    el?.focus()
  }, 0)
}

interface DialogPlanillasAuxiliaresProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Planillas auxiliares del Planeador (Regla 96, Sección 5; A.2.PLA.3): PDF
 * para trabajar en papel con la lista de estudiantes de un Grado/Grupo. Los
 * grupos, [Áreas] y períodos vienen del alcance del usuario
 * (`GET /planeador/planillas-auxiliares/grupos`).
 */
export function DialogPlanillasAuxiliares({ open, onOpenChange }: DialogPlanillasAuxiliaresProps) {
  const { notify } = useNotify()
  const formRef = useRef<HTMLFormElement>(null)
  const noticeIdRef = useRef(0)
  const [notice, setNotice] = useState<{ id: number; message: string; variant: NoticeVariant } | null>(null)
  const { data: grupos = [], isPending: cargandoGrupos } = usePlanillasAuxiliaresGruposQuery(open)
  const { data: tipos = [] } = useQuery({ ...selectCategoryQueryOptions("TIPO_PLANILLA_AUXILIAR"), enabled: open })
  const { data: contenidos = [] } = useQuery({ ...selectCategoryQueryOptions("CONTENIDO_PLANILLA"), enabled: open })
  const descargar = useDescargarPlanillaAuxiliar()

  const contenidoInicial = contenidos.find((c) => c.predeterminado)?.valor ?? "EN_BLANCO"

  const form = useAppForm({
    defaultValues: { tipo: "", grupo: 0, area: TODAS, periodo: 0, contenido: "", columnas: 5 },
    validators: { onSubmit: schema },
    onSubmitInvalid: () => enfocarPrimerError(formRef.current),
    onSubmit: async ({ value }) => {
      const grupo = grupos.find((g) => g.pk_tgrupo === value.grupo)
      const area = grupo?.areas.find((a) => a.pk_tasignatura === value.area)
      const periodo = grupo?.periodos.find((p) => p.pk_tperiodo_evaluacion === value.periodo)
      const resultado = await descargar.mutateAsync({
        tipo: value.tipo as TipoPlanillaAuxiliar,
        grupo: value.grupo,
        asignatura: value.area === TODAS ? null : value.area,
        periodo: value.tipo === "LISTADO" ? null : value.periodo,
        contenido: (value.contenido || contenidoInicial) as "EN_BLANCO" | "CON_REGISTRADO",
        columnas: value.columnas,
        etiquetas: {
          grado_grupo: grupo?.grado_grupo ?? "",
          area: value.tipo === "LISTADO" ? "" : (area?.nombre ?? "Todas"),
          periodo: value.tipo === "LISTADO" ? "" : (periodo?.nombre ?? ""),
        },
      })
      if (resultado.status === "error") {
        noticeIdRef.current += 1
        setNotice({ id: noticeIdRef.current, message: resultado.message, variant: "error" })
        return
      }
      notify("Se generó la planilla auxiliar.")
      onOpenChange(false)
    },
  })

  const opcionesTipo = tipos
    .filter((t) => TIPOS_DISPONIBLES.includes(t.valor as TipoPlanillaAuxiliar))
    .map((t) => ({ value: t.valor, label: t.nombre }))
  const opcionesGrupo = grupos.map((g) => ({
    value: g.pk_tgrupo,
    label: [g.grado_grupo, g.jornada].filter(Boolean).join(" · "),
  }))
  const opcionesContenido = contenidos.map((c) => ({ value: c.valor, label: c.nombre }))

  return (
    <Dialog open={open} onOpenChange={(next) => !descargar.isPending && onOpenChange(next)}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Planillas auxiliares</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Hojas en PDF para trabajar en papel con la lista de estudiantes. No son documentos oficiales.
        </p>

        <NoticeBanner notice={notice} onClose={() => setNotice(null)} variant={notice?.variant} autoCloseMs={12000} />

        <form
          id={FORM_ID}
          ref={formRef}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="grid gap-5"
        >
          <form.AppField name="tipo">
            {(f) => <f.SelectField label="Tipo de planilla" required options={opcionesTipo} />}
          </form.AppField>

          <form.AppField
            name="grupo"
            listeners={{
              // Al cambiar de grupo, el período vuelve al en curso y el área a «Todas».
              onChange: ({ value }) => {
                const g = grupos.find((x) => x.pk_tgrupo === value)
                const enCurso = g?.periodos.find((p) => p.en_curso) ?? g?.periodos.at(-1)
                form.setFieldValue("periodo", enCurso?.pk_tperiodo_evaluacion ?? 0)
                form.setFieldValue("area", TODAS)
                if (!form.getFieldValue("contenido")) form.setFieldValue("contenido", contenidoInicial)
              },
            }}
          >
            {(f) => (
              <f.SelectField
                label="Grado/Grupo"
                required
                options={opcionesGrupo}
                emptyValue={0}
                placeholder={cargandoGrupos ? "Cargando…" : "Seleccione"}
              />
            )}
          </form.AppField>

          <form.Subscribe selector={(s) => [s.values.tipo, s.values.grupo] as const}>
            {([tipo, grupoId]) => {
              if (tipo !== "ASISTENCIA") {
                return tipo === "LISTADO" ? (
                  <form.AppField name="columnas">
                    {(f) => (
                      <f.NumberField
                        label="Columnas en blanco"
                        required
                        valueAs="number"
                        maxDigits={2}
                        description="Entre 1 y 10"
                      />
                    )}
                  </form.AppField>
                ) : null
              }
              const grupo = grupos.find((g) => g.pk_tgrupo === grupoId)
              const rotulo = grupo?.rotulo_area ?? "Área"
              const opcionesArea = [
                { value: TODAS, label: "Todas" },
                ...(grupo?.areas ?? []).map((a) => ({ value: a.pk_tasignatura, label: a.nombre })),
              ]
              const opcionesPeriodo = (grupo?.periodos ?? []).map((p) => ({
                value: p.pk_tperiodo_evaluacion,
                label: `${p.nombre} (${ddmmaaaa(p.fecha_inicio)} – ${ddmmaaaa(p.fecha_fin)})`,
              }))
              return (
                <>
                  <form.AppField name="area">
                    {(f) => (
                      <f.SelectField
                        label={rotulo}
                        required
                        options={opcionesArea}
                        emptyValue={0}
                        description={
                          grupo?.modo_asistencia === "DIARIA"
                            ? "El grupo registra asistencia diaria: sale una hoja con un día por columna."
                            : `«Todas» genera una hoja por ${rotulo.toLowerCase()}.`
                        }
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="periodo">
                    {(f) => (
                      <f.SelectField label="Período de evaluación" required options={opcionesPeriodo} emptyValue={0} />
                    )}
                  </form.AppField>
                  <form.AppField name="contenido">
                    {(f) => <f.SelectField label="Contenido" required options={opcionesContenido} />}
                  </form.AppField>
                </>
              )
            }}
          </form.Subscribe>
        </form>

        <DialogFooter className="items-center">
          <p className="mr-auto text-xs text-muted-foreground">Los campos marcados con * son obligatorios</p>
          <Button
            size="sm"
            variant="outline"
            color="neutral"
            disabled={descargar.isPending}
            onClick={() => onOpenChange(false)}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
          <Button
            size="sm"
            type="submit"
            color="primary"
            form={FORM_ID}
            disabled={descargar.isPending}
            aria-busy={descargar.isPending}
          >
            {descargar.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <FileDownloadOutlinedIcon data-icon="inline-start" />
            )}
            Generar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Botón «Planillas auxiliares» de la cabecera del Planeador; abre el modal.
 * Mismo gate que el back (`fn_asistencia_assert_puede_ver`): VER en ASISTENCIAS.
 */
export function PlanillasAuxiliaresButton() {
  const [open, setOpen] = useState(false)
  const { puedeVer } = useMenuPermission("ASISTENCIAS")
  if (!puedeVer) return null
  return (
    <>
      <Button size="sm" variant="outline" color="primary" onClick={() => setOpen(true)}>
        <FileDownloadOutlinedIcon data-icon="inline-start" />
        Planillas auxiliares
      </Button>
      {open && <DialogPlanillasAuxiliares open={open} onOpenChange={setOpen} />}
    </>
  )
}
