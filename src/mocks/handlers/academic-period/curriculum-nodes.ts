import { http, HttpResponse, delay } from "msw"

import { curriculumNodesDb } from "@/mocks/db/academic-period/curriculum-nodes"
import type { CurriculumNodeOption } from "@/features/establishment/academic-period/api/types/curriculum-node"

export const curriculumNodesHandlers = [
  http.get("/api/curriculum-nodes", async () => {
    await delay(150)
    return HttpResponse.json<CurriculumNodeOption[]>(curriculumNodesDb)
  }),
]