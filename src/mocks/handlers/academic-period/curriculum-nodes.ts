import { http, HttpResponse, delay } from "msw"

import { curriculumNodesDb } from "@/mocks/db/academic-period/curriculum-nodes"

export const curriculumNodesHandlers = [
  http.get("/api/eval-col/catalogos/nodos-curriculares", async () => {
    await delay(150)
    return HttpResponse.json({ rows: curriculumNodesDb })
  }),
]