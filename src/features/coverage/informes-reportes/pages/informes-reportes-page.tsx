import { useState } from "react"

import { TableScreen, TableScreenBody, TableScreenHeader, TableScreenTitle, TableScreenToolbar } from "@/components/layout/table-screen"
import { NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field, FieldLabel } from "@/components/ui/field"
import { CaretDownIcon, FileDownloadOutlinedIcon, SpinnerIcon } from "@/components/ui/icons"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { downloadReport, type ReportKey } from "@/lib/report-client"
import { coberturaInformesReportesRoute } from "@/router"

import { filtrosMatriculados } from "@/features/coverage/informes-reportes/api/informes"
import { etiquetaInforme, INFORMES, type InformeId, type InformesSearch } from "@/features/coverage/informes-reportes/api/schema"
import { filtrosBase, filtrosInformeMatricula } from "@/features/coverage/informes-reportes/api/resumenes"
import { filtrosCobertura } from "@/features/coverage/informes-reportes/api/cobertura"
import {
  InformeCupos,
  InformeDemanda,
  InformeInscripciones,
  InformeListaCobertura,
  InformeListaSorteo,
} from "@/features/coverage/informes-reportes/components/informes-cobertura"
import { EstadisticaEdades } from "@/features/coverage/informes-reportes/components/estadistica-edades"
import { filtrosEdades } from "@/features/coverage/informes-reportes/api/edades"
import { FiltrosFuera, FueraMatriculaInforme } from "@/features/coverage/informes-reportes/components/fuera-matricula"
import { filtrosFuera } from "@/features/coverage/informes-reportes/api/fuera-matricula"
import { CalidadInforme, FiltrosCalidad, GenerarCalidad } from "@/features/coverage/informes-reportes/components/calidad"
import { filtrosCalidad } from "@/features/coverage/informes-reportes/api/calidad"
import { FiltrosInforme } from "@/features/coverage/informes-reportes/components/filtros-informe"
import { InformeMatricula, InformeNivelaciones } from "@/features/coverage/informes-reportes/components/informes-matricula"
import { ConsultaMatriculados } from "@/features/coverage/informes-reportes/components/consulta-matriculados"
import { ControlesLibro, LibroRegistroInforme } from "@/features/coverage/informes-reportes/components/libro-registro"
import { FiltrosGraduacion, GraduacionInforme } from "@/features/coverage/informes-reportes/components/graduacion"
import { filtrosGraduacion } from "@/features/coverage/informes-reportes/api/graduacion"
import { filtrosCulminacion } from "@/features/coverage/informes-reportes/api/culminacion"
import { CulminacionInforme, FiltrosCulminacion } from "@/features/coverage/informes-reportes/components/culminacion"
import { ActasGraduacionInforme, FiltrosActasGraduacion, GenerarLibroActas } from "@/features/coverage/informes-reportes/components/actas-graduacion"

const ITEMS = Object.fromEntries(INFORMES.flatMap((g) => g.opciones.map((o) => [o.value, o.label])))

/** Vista Informes y reportes (C.4.GEN.1; Cobertura 3.9, Regla 55). */
export function InformesReportesPage() {
  return (
    <NoticeProvider>
      <Contenido />
    </NoticeProvider>
  )
}

/** Selector agrupado del informe; cambiar de informe limpia los filtros. */
function SelectorInforme({ value }: { value: InformeId }) {
  const navigate = coberturaInformesReportesRoute.useNavigate()
  return (
    <Field variant="outlined" className="w-full gap-1.5">
      <FieldLabel htmlFor="informe-selector">
        Informe<span data-required-mark="">*</span>
      </FieldLabel>
      <Select
        items={ITEMS}
        value={value}
        onValueChange={(v) => v && navigate({ search: { informe: v === "matriculados" ? undefined : (v as InformeId) } })}
      >
        <SelectTrigger id="informe-selector" variant="outlined">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {INFORMES.map((g) => (
            <SelectGroup key={g.grupo}>
              <SelectLabel>{g.grupo}</SelectLabel>
              {g.opciones.map((o) => (
                <SelectItem key={o.value} value={o.value} className="pl-6">
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

/** Cada informe disponible: su vista, su reporte y los filtros que exporta (Regla 57). */
const DISPONIBLES: Partial<Record<InformeId, { reporte: ReportKey; filtros: (s: InformesSearch) => Record<string, unknown> }>> = {
  matriculados: { reporte: "informes-matriculados", filtros: filtrosMatriculados },
  "informe-matricula": { reporte: "informes-matricula", filtros: filtrosInformeMatricula },
  nivelaciones: { reporte: "informes-nivelaciones", filtros: filtrosBase },
  "cupos-reservas": { reporte: "informes-cupos", filtros: filtrosCobertura.cupos },
  "reservas-confirmar": { reporte: "informes-reservas-confirmar", filtros: filtrosCobertura["reservas-confirmar"] },
  traslados: { reporte: "informes-traslados", filtros: filtrosCobertura.traslados },
  inscripciones: { reporte: "informes-inscripciones", filtros: filtrosCobertura.inscripciones },
  "demanda-no-atendida": { reporte: "informes-demanda", filtros: filtrosCobertura.demanda },
  edades: { reporte: "informes-edades", filtros: filtrosEdades },
  "fuera-matricula": { reporte: "informes-fuera-matricula", filtros: filtrosFuera },
  calidad: { reporte: "informes-calidad", filtros: filtrosCalidad },
  graduacion: { reporte: "informes-graduacion", filtros: filtrosGraduacion },
  culminacion: { reporte: "informes-culminacion", filtros: filtrosCulminacion },
}

/** Exportar el informe abierto en Excel o PDF con sus filtros. */
function Exportar({ informe }: { informe: InformeId }) {
  const search = coberturaInformesReportesRoute.useSearch()
  const { notify } = useNotify()
  const [pendiente, setPendiente] = useState(false)
  const config = DISPONIBLES[informe]
  if (!config) return null

  async function exportar(format: "excel" | "pdf") {
    setPendiente(true)
    const r = await downloadReport(config!.reporte, { format, filters: config!.filtros(search) })
    setPendiente(false)
    notify(r.message, { variant: r.status === "error" ? "error" : "success" })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" color="neutral" size="sm" disabled={pendiente} />}>
        {pendiente ? <SpinnerIcon data-icon="inline-start" className="animate-spin" /> : <FileDownloadOutlinedIcon data-icon="inline-start" />}
        Exportar
        <CaretDownIcon data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void exportar("excel")}>Excel</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void exportar("pdf")}>PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Parámetros de cada informe de resumen, en la fila del selector (C.4.MAT). */
const CAMPOS: Partial<Record<InformeId, Parameters<typeof FiltrosInforme>[0]["campos"]>> = {
  "informe-matricula": ["sede", "jornada", "periodo", "grado", "tipo", "edad"],
  nivelaciones: ["sede", "jornada", "periodo", "grado"],
  "cupos-reservas": ["sede", "jornada", "periodo", "grado"],
  "reservas-confirmar": ["sede", "jornada", "periodo", "grado"],
  traslados: ["periodo", "direccion", "estadoTraslado", "grado"],
  inscripciones: ["sede", "jornada", "grupoAdmision", "grado", "edad"],
  "lista-sorteo": ["jornada", "grado", "grupoAdmision"],
  "demanda-no-atendida": ["periodo", "grado"],
  edades: ["sede", "jornada", "periodo", "grado"],
  "fuera-matricula": ["grado"],
  calidad: ["sede", "jornada", "periodo", "grado"],
  "libro-calificaciones": ["sede", "jornada", "periodo", "grado"],
  graduacion: ["sede", "jornada", "periodo"],
  culminacion: ["sede", "jornada", "periodo"],
}

function Contenido() {
  const { informe = "matriculados" } = coberturaInformesReportesRoute.useSearch()
  const campos = CAMPOS[informe]

  const encabezado = (
    <>
      <TableScreenTitle
        action={
          <div className="flex items-center gap-2">
            {informe === "calidad" ? <GenerarCalidad /> : null}
            {informe === "actas-graduacion" ? <GenerarLibroActas /> : null}
            <Exportar informe={informe} />
          </div>
        }
      >
        Informes y reportes
      </TableScreenTitle>
      <TableScreenToolbar>
        <div className="grid w-full grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SelectorInforme value={informe} />
          {informe === "fuera-matricula" ? <FiltrosFuera /> : null}
          {campos ? <FiltrosInforme campos={campos} soloCerrados={informe === "libro-calificaciones"} /> : null}
          {informe === "libro-calificaciones" ? <ControlesLibro /> : null}
          {informe === "graduacion" ? <FiltrosGraduacion /> : null}
          {informe === "actas-graduacion" ? <FiltrosActasGraduacion /> : null}
          {informe === "culminacion" ? <FiltrosCulminacion /> : null}
          {informe === "calidad" ? <FiltrosCalidad /> : null}
        </div>
      </TableScreenToolbar>
    </>
  )

  if (informe === "matriculados") return <ConsultaMatriculados encabezado={encabezado} />
  if (informe === "informe-matricula") return <InformeMatricula encabezado={encabezado} />
  if (informe === "nivelaciones") return <InformeNivelaciones encabezado={encabezado} />
  if (informe === "cupos-reservas") return <InformeCupos encabezado={encabezado} />
  if (informe === "reservas-confirmar" || informe === "traslados")
    return <InformeListaCobertura encabezado={encabezado} informe={informe} />
  if (informe === "inscripciones") return <InformeInscripciones encabezado={encabezado} />
  if (informe === "lista-sorteo") return <InformeListaSorteo encabezado={encabezado} />
  if (informe === "demanda-no-atendida") return <InformeDemanda encabezado={encabezado} />
  if (informe === "edades") return <EstadisticaEdades encabezado={encabezado} />
  if (informe === "fuera-matricula") return <FueraMatriculaInforme encabezado={encabezado} />
  if (informe === "calidad") return <CalidadInforme encabezado={encabezado} />
  if (informe === "libro-calificaciones") return <LibroRegistroInforme encabezado={encabezado} />
  if (informe === "graduacion") return <GraduacionInforme encabezado={encabezado} />
  if (informe === "actas-graduacion") return <ActasGraduacionInforme encabezado={encabezado} />
  if (informe === "culminacion") return <CulminacionInforme encabezado={encabezado} />

  return (
    <TableScreen>
      <TableScreenHeader>{encabezado}</TableScreenHeader>
      <TableScreenBody>
        <p className="p-10 text-center text-sm text-muted-foreground">
          {etiquetaInforme(informe)} todavía no está disponible.
        </p>
      </TableScreenBody>
    </TableScreen>
  )
}
