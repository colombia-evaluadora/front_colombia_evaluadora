import { http, HttpResponse, delay } from "msw"

import { generalAreasDb } from "../db/general-areas"
import type { GeneralArea } from "@/features/establishment/api/types/academic-period/general-area"

export const generalAreasHandlers = [
  http.get("/api/general-areas", async () => {
    await delay(150)
    return HttpResponse.json<GeneralArea[]>(generalAreasDb)
  }),
]
