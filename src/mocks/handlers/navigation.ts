import { http, HttpResponse, delay } from "msw"

import { navigationMenu } from "../db/navigation"

export const navigationHandlers = [
  http.get("/navigation/menu", async () => {
    await delay(150)
    return HttpResponse.json(navigationMenu)
  }),
]
