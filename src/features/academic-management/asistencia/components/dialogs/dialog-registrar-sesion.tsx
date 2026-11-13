import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ClipboardCheckIcon } from "@/components/ui/icons"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toSelectItemsMap } from "@/lib/catalog-options"
import { paths } from "@/config/paths"

import { useAsistenciaCalendarioMesesQuery } from "@/features/academic-management/asistencia/api/query/use-asistencia-calendario-query"
import { hoyDateOnly } from "@/features/academic-management/asistencia/api/ui-mappings"

interface DialogRegistrarSesionProps {
  sede: number
  /** Filtros de Asistencia por grupo: precargan la cascada (Sección 7). */
  grupoInicial?: number
  asignaturaInicial?: number
  /** Docente: solo las clases que dicta (MIAS). El administrador del establecimiento ve todas. */
  soloPropias?: boolean
}

/** Meses que mira el selector: el actual y los dos anteriores, de modo que
 *  cubre el período de evaluación calificable en curso. */
function mesesHastaHoy(): { anio: number; mes: number }[] {
  const hoy = new Date()
  return [2, 1, 0].map((atras) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - atras, 1)
    return { anio: d.getFullYear(), mes: d.getMonth() + 1 }
  })
}

const fechaLarga = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

/**
 * Sección 7, "Registrar sesión": abre la planilla de una clase eligiendo en
 * cascada Grado/Grupo → [Área] → Fecha, sin aplicar filtros. Las fechas son las
 * mismas que el calendario: días con clase de esa [Área] en el horario del
 * grupo, hábiles y hasta hoy (el back ya no proyecta los inhábiles, V457).
 */
export function DialogRegistrarSesion({
  sede,
  grupoInicial,
  asignaturaInicial,
  soloPropias = true,
}: DialogRegistrarSesionProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [grupo, setGrupo] = useState("")
  const [asignatura, setAsignatura] = useState("")
  const [fecha, setFecha] = useState("")
  const hoy = hoyDateOnly()

  const sesiones = useAsistenciaCalendarioMesesQuery({ SEDE: sede, MIAS: soloPropias || undefined }, open ? mesesHastaHoy() : [])
  const dictadas = sesiones.filter((s) => !s.es_formativa && s.fecha <= hoy)

  const grupos = new Map<string, string>()
  for (const s of dictadas) grupos.set(String(s.fk_grupo), `${s.grado}${s.grupo} (${s.jornada})`)
  const asignaturas = new Map<string, string>()
  for (const s of dictadas) {
    if (String(s.fk_grupo) === grupo) asignaturas.set(String(s.fk_asignatura), s.asignatura)
  }
  const fechas = [
    ...new Set(
      dictadas
        .filter((s) => String(s.fk_grupo) === grupo && String(s.fk_asignatura) === asignatura)
        .map((s) => s.fecha),
    ),
  ].sort((a, b) => b.localeCompare(a))

  const opcionesGrupo = [...grupos].map(([value, label]) => ({ value, label }))
  const opcionesAsignatura = [...asignaturas].map(([value, label]) => ({ value, label }))
  const opcionesFecha = fechas.map((f) => ({ value: f, label: fechaLarga(f) }))

  function elegirAsignatura(valor: string | null) {
    const next = valor ?? ""
    setAsignatura(next)
    const delDia = dictadas.some(
      (s) => String(s.fk_grupo) === grupo && String(s.fk_asignatura) === next && s.fecha === hoy,
    )
    // Por defecto hoy, si ese día tiene clase.
    setFecha(delDia ? hoy : "")
  }

  function abrir() {
    navigate({
      to: paths.app.asistenciaManual.getHref(),
      search: { fecha, sede, grupo: Number(grupo), asignatura: Number(asignatura) },
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setGrupo(grupoInicial != null ? String(grupoInicial) : "")
          setAsignatura(grupoInicial != null && asignaturaInicial != null ? String(asignaturaInicial) : "")
        } else {
          setGrupo("")
          setAsignatura("")
          setFecha("")
        }
      }}
    >
      <DialogTrigger render={<Button color="primary" size="sm" />}>
        <ClipboardCheckIcon data-icon="inline-start" />
        Registrar sesión
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar sesión</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Solo se pueden elegir días con clase del área en el horario del grupo, desde el inicio del período
          calificable hasta hoy.
        </p>
        <div className="grid gap-4">
          <span className="-mb-3 text-sm font-medium">Grado/Grupo<span className="text-red">*</span></span>
          <Select
            items={toSelectItemsMap(opcionesGrupo)}
            value={grupo}
            onValueChange={(next) => {
              setGrupo(next ?? "")
              setAsignatura("")
              setFecha("")
            }}
          >
            <SelectTrigger variant="outlined" aria-label="Grado/Grupo">
              <SelectValue placeholder="Seleccione" />
            </SelectTrigger>
            <SelectContent>
              {opcionesGrupo.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="-mb-3 text-sm font-medium">Área<span className="text-red">*</span></span>
          <Select
            items={toSelectItemsMap(opcionesAsignatura)}
            value={asignatura}
            disabled={!grupo}
            onValueChange={elegirAsignatura}
          >
            <SelectTrigger variant="outlined" aria-label="Área">
              <SelectValue placeholder="Seleccione" />
            </SelectTrigger>
            <SelectContent>
              {opcionesAsignatura.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="-mb-3 text-sm font-medium">Fecha<span className="text-red">*</span></span>
          <Select items={toSelectItemsMap(opcionesFecha)} value={fecha} disabled={!asignatura} onValueChange={(next) => setFecha(next ?? "")}>
            <SelectTrigger variant="outlined" aria-label="Fecha">
              <SelectValue placeholder="Seleccione" />
            </SelectTrigger>
            <SelectContent>
              {opcionesFecha.map((o) => (
                <SelectItem key={o.value} value={o.value} className="capitalize">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button size="sm" variant="outline" color="neutral" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button size="sm" color="primary" disabled={!grupo || !asignatura || !fecha} onClick={abrir}>
            Abrir planilla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
