import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { TableScreenTabs, TableScreenTitle } from "@/components/layout/table-screen"
import { NoticeProvider } from "@/components/notice/notice-context"
import { OnlineOnlyAction } from "@/components/offline/online-only-action"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "@/components/ui/icons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { paths } from "@/config/paths"
import { coberturaComplementariaRoute } from "@/router"

import type { PestanaComplementaria } from "@/features/coverage/matricula-complementaria/api/schema"
import { ConveniosTab } from "@/features/coverage/matricula-complementaria/components/convenios-tab"
import { DialogNuevoConvenio } from "@/features/coverage/matricula-complementaria/components/dialogs-convenio"
import { PostulacionesTab } from "@/features/coverage/matricula-complementaria/components/postulaciones-tab"
import { ConvocatoriasTab, MENU_COMPLEMENTARIA } from "@/features/coverage/matricula-complementaria/components/convocatorias-tab"
import { useEstablecimiento } from "@/features/coverage/matricula-complementaria/hooks/use-establecimiento"
import { CampoSelect } from "@/features/coverage/matricula/components/dialogs/acciones/compartido"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

const PESTANAS: { value: PestanaComplementaria; label: string }[] = [
  { value: "convocatorias", label: "Convocatorias" },
  { value: "postulaciones", label: "Postulaciones" },
  { value: "convenios", label: "Convenios de adscripción" },
]

/**
 * Vista Matrícula complementaria (Sección 2.16; Administración del Sistema, 4.3):
 * solo para la adscripción. La complementaria del estudiante propio se agrega
 * desde la vista Matrícula; todas se ven allí con su badge.
 */
export function MatriculaComplementariaPage() {
  return (
    <NoticeProvider>
      <Contenido />
    </NoticeProvider>
  )
}

function Contenido() {
  const { tab = "convocatorias" } = coberturaComplementariaRoute.useSearch()
  const navigate = coberturaComplementariaRoute.useNavigate()
  const { puedeCrear: permisoCrear } = useMenuPermission(MENU_COMPLEMENTARIA)
  const { establecimientos, territorial, establecimientoId, setEstablecimiento } = useEstablecimiento()
  // Territoriales: solo lectura (el back responde 403 a las escrituras).
  const puedeCrear = permisoCrear && !territorial
  const [nuevoConvenio, setNuevoConvenio] = useState(false)

  const encabezado = (
    <>
      <TableScreenTitle
        action={
          tab === "convenios" && puedeCrear ? (
            <OnlineOnlyAction>
              <Button type="button" variant="fill" color="primary" size="sm" onClick={() => setNuevoConvenio(true)}>
                <PlusIcon data-icon="inline-start" />
                Nuevo convenio
              </Button>
            </OnlineOnlyAction>
          ) : (tab === "convocatorias" || tab === "postulaciones") && puedeCrear ? (
            <OnlineOnlyAction>
              <Button
                render={
                  <Link
                    to={tab === "convocatorias" ? paths.app.coberturaConvocatoriaNueva.getHref() : paths.app.coberturaPostulacionNueva.getHref()}
                  />
                }
                nativeButton={false}
                variant="fill"
                color="primary"
                size="sm"
              >
                <PlusIcon data-icon="inline-start" />
                {tab === "convocatorias" ? "Nueva convocatoria" : "Nueva postulación"}
              </Button>
            </OnlineOnlyAction>
          ) : null
        }
      >
        Matrícula complementaria
      </TableScreenTitle>
      {territorial ? (
        <CampoSelect
          id="complementaria-establecimiento"
          label="Establecimiento"
          value={establecimientoId != null ? String(establecimientoId) : ""}
          onChange={(v) => v && setEstablecimiento(Number(v))}
          opciones={establecimientos.map((e) => ({ value: String(e.id), label: e.nombre }))}
          className="sm:max-w-md"
        />
      ) : null}
      <TableScreenTabs>
        <Tabs
          value={tab}
          onValueChange={(value) =>
            navigate({
              search: (prev) => ({
                establecimiento: prev.establecimiento,
                tab: value === "convocatorias" ? undefined : (value as PestanaComplementaria),
                page: 0,
                pageSize: prev.pageSize,
              }),
            })
          }
        >
          <TabsList className="border-b-0">
            {PESTANAS.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </TableScreenTabs>
    </>
  )

  if (tab === "convocatorias") return <ConvocatoriasTab encabezado={encabezado} />
  if (tab === "postulaciones") return <PostulacionesTab encabezado={encabezado} />
  return (
    <>
      <ConveniosTab encabezado={encabezado} />
      {nuevoConvenio ? <DialogNuevoConvenio onOpenChange={setNuevoConvenio} /> : null}
    </>
  )
}
