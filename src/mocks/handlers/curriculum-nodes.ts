import { http, HttpResponse, delay } from "msw"

import { curriculumNodesDb } from "../db/curriculum-nodes"

export const curriculumNodesHandlers = [
  http.get("/api/curriculum-nodes", async () => {
    await delay(150)
    return HttpResponse.json<string[]>(curriculumNodesDb)
  }),
]