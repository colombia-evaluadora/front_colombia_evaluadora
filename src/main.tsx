import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { env } from "./config/env"
import { AppProvider } from "./provider"

async function enableMocking() {
  if (!env.ENABLE_API_MOCKING) return
  const { worker } = await import("./mocks/browser")
  return worker.start({ onUnhandledRequest: "error" })
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AppProvider />
    </StrictMode>,
  )
})
