import { useNavigate } from "@tanstack/react-router"

import logo from "@/assets/logo.svg"
import { Button } from "@/components/ui/button"
import { paths } from "@/config/paths"
import { useUser } from "@/lib/auth"

export function LandingNavbar() {
  const navigate = useNavigate()
  const user = useUser()

  function handleLogin() {
    if (user.data) {
      navigate({ to: paths.app.root.getHref() })
    } else {
      navigate({ to: paths.auth.login.getHref() })
    }
  }

  return (
    <header className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between bg-[#1e2235] px-8 py-4">
      <img src={logo} alt="Colombia Evaluadora" className="h-10 w-auto" />
      <Button onClick={handleLogin}>Ingresar</Button>
    </header>
  )
}
