"use no memo"

import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { paths } from "@/config/paths"
import { ArrowLeftIcon, FileTextIcon, InfoIcon, PencilIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { NoticeOutlet, NoticeProvider } from "@/components/notice/notice-context"

import { gestionAcademicaReferentesCurricularesDetalleRoute } from "@/router"
import { useCurricularReferenceQuery } from "@/features/academic-management/curricular-references/api/query/use-curricular-reference"
import {
  curricularReferenceStatusBadge,
  curricularReferenceStatusLabel,
} from "@/features/academic-management/curricular-references/api/ui-mappings"
import { ManageCurricularReferenceDialog } from "@/features/academic-management/curricular-references/components/dialogs/dialog-manage"
import { useEducationLevelsQuery } from "@/features/academic-management/curricular-references/api/query/use-education-levels"
import { usePedagogicalApproachesQuery } from "@/features/academic-management/curricular-references/api/query/use-pedagogical-approaches"
import { useEvaluationTypesQuery } from "@/features/academic-management/curricular-references/api/query/use-evaluation-types"
import { TabStatements } from "@/features/academic-management/curricular-references/components/statements/tab-statements"
import type { CurricularReference } from "@/features/academic-management/curricular-references/api/types/curricular-reference"

const PANEL_CLASS =
  "rounded-b-lg rounded-tr-lg border bg-background p-4 group-data-[tabs-filled=true]/tabs:rounded-tr-none"

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-bold">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  )
}

function GeneralInfoTab({ reference }: { reference: CurricularReference }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-bold">Estructura del referente</p>

      <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        <InfoField label="Nivel 1 *">{reference.level1 || "—"}</InfoField>
        <InfoField label="Nivel 2 *">{reference.level2 || "—"}</InfoField>

        <InfoField label="Enfoque pedagógico *">{reference.pedagogicalApproach?.name ?? "—"}</InfoField>
        <InfoField label="Tipo de evaluación *">{reference.evaluationType?.name ?? "—"}</InfoField>

        <InfoField label="Áreas o dimensiones">
          {reference.areas.length === 0 ? (
            "—"
          ) : (
            <div className="mt-1 flex flex-wrap gap-1">
              {reference.areas.map((area) => (
                <Badge key={area.id} variant="soft" color="muted">
                  {area.name}
                </Badge>
              ))}
            </div>
          )}
        </InfoField>
        <InfoField label="Instrumento *">{reference.instrument || "—"}</InfoField>

        <InfoField label="Información adicional del instrumento">
          {reference.instrumentDescription || "—"}
        </InfoField>
        <InfoField label="Normatividad">
          <div className="flex flex-col">
            {reference.regulation
              ? reference.regulation.split("\n").map((line, index) => <span key={index}>{line}</span>)
              : "—"}
          </div>
        </InfoField>
      </div>
    </div>
  )
}

export function CurricularReferenceDetailPage() {
  return (
    <NoticeProvider>
      <CurricularReferenceDetailPageContent />
    </NoticeProvider>
  )
}

function CurricularReferenceDetailPageContent() {
  const { curricularReferenceId } = gestionAcademicaReferentesCurricularesDetalleRoute.useParams()
  const id = Number(curricularReferenceId)

  const { data: reference, isPending, isError } = useCurricularReferenceQuery(id)
  const [editorOpen, setEditorOpen] = useState(false)

  const { data: educationLevels = [] } = useEducationLevelsQuery()
  const { data: pedagogicalApproaches = [] } = usePedagogicalApproachesQuery()
  const { data: evaluationTypes = [] } = useEvaluationTypesQuery()

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          description={
            <Button
              variant="ghost"
              color="neutral"
              size="sm"
              className="-ml-3 h-auto font-normal text-sm"
              render={<Link to={paths.app.gestionAcademicaReferentesCurriculares.getHref()} />}
              nativeButton={false}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Volver a referentes curriculares
            </Button>
          }
        >
          Detalle del referente
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <NoticeOutlet className="mb-4" />
        {isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : isError || !reference ? (
          <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
            No fue posible cargar este referente curricular.
          </div>
        ) : (
          <div className="flex flex-col gap-4 text-sm">
            <div className="relative">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-lg font-bold">{reference.name}</h2>
                {reference.educationLevels.map((level) => (
                  <Badge key={level.id} variant="soft" color="muted" className="rounded-full px-3 py-1 text-sm">
                    {level.name}
                  </Badge>
                ))}
                <Badge
                  {...curricularReferenceStatusBadge(reference.active)}
                  className="rounded-full px-3 py-1 text-sm"
                >
                  {curricularReferenceStatusLabel(reference.active)}
                </Badge>
              </div>
              {reference.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{reference.description}</p>
              ) : null}

              <Button
                type="button"
                variant="outline"
                color="primary"
                size="icon-sm"
                aria-label="Editar referente curricular"
                className="absolute top-0 right-0"
                onClick={() => setEditorOpen(true)}
              >
                <PencilIcon />
              </Button>
            </div>

            <Tabs defaultValue="general">
              <TabsList variant="folder">
                <TabsTrigger value="general" className="[&[data-active]_svg]:text-primary">
                  <span className="inline-flex items-center gap-1.5">
                    <InfoIcon />
                    Información general
                  </span>
                </TabsTrigger>
                {reference.level1 ? (
                  <TabsTrigger value="level1" className="[&[data-active]_svg]:text-primary">
                    <span className="inline-flex items-center gap-1.5">
                      <FileTextIcon />
                      {reference.level1}
                    </span>
                  </TabsTrigger>
                ) : null}
              </TabsList>
              <TabsContent value="general" className={PANEL_CLASS}>
                <GeneralInfoTab reference={reference} />
              </TabsContent>
              {reference.level1 ? (
                <TabsContent value="level1" className={PANEL_CLASS}>
                  <TabStatements reference={reference} />
                </TabsContent>
              ) : null}
            </Tabs>

            <ManageCurricularReferenceDialog
              open={editorOpen}
              onOpenChange={setEditorOpen}
              curricularReferenceId={id}
              educationLevels={educationLevels}
              pedagogicalApproaches={pedagogicalApproaches}
              evaluationTypes={evaluationTypes}
            />
          </div>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}
