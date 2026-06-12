import { ToastProvider } from "./components/ui/toast"
import Queue from "./_pages/Queue"
import { ToastViewport } from "@radix-ui/react-toast"
import { useEffect, useRef, useState } from "react"
import Solutions from "./_pages/Solutions"
import { QueryClient, QueryClientProvider } from "react-query"
import { OnboardingWizard } from "./components/ui/OnboardingWizard"

import { ElectronAPI } from "./types/electron"

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      cacheTime: Infinity
    }
  }
})

const App: React.FC = () => {
  const [view, setView] = useState<"queue" | "solutions" | "debug">("queue")
  const [isOnboardingActive, setIsOnboardingActive] = useState<boolean>(true)
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [opacity, setOpacity] = useState<number>(0.25)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await window.electronAPI.invoke("get-onboarding-status")
        setIsOnboardingActive(!completed)
        if (completed) {
          const config = await window.electronAPI.invoke("get-app-config")
          if (config) {
            setTheme(config.theme || "dark")
            setOpacity(config.opacity !== undefined ? config.opacity : 0.25)
            if (config.pulseEnabled === false) {
              document.documentElement.classList.add("disable-pulse")
            } else {
              document.documentElement.classList.remove("disable-pulse")
            }
          }
        }
      } catch (err) {
        console.error("Failed to check onboarding status:", err)
        setIsOnboardingActive(true)
      }
    }
    checkOnboarding()
  }, [isOnboardingActive])

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  // Effect for height monitoring
  useEffect(() => {
    const cleanup = window.electronAPI.onResetView(() => {
      console.log("Received 'reset-view' message from main process.")
      queryClient.invalidateQueries(["screenshots"])
      queryClient.invalidateQueries(["problem_statement"])
      queryClient.invalidateQueries(["solution"])
      queryClient.invalidateQueries(["new_solution"])
      setView("queue")
    })

    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const updateHeight = () => {
      if (!containerRef.current) return
      const height = containerRef.current.scrollHeight
      const width = containerRef.current.scrollWidth
      window.electronAPI?.updateContentDimensions({ width, height })
    }

    const resizeObserver = new ResizeObserver(() => {
      updateHeight()
    })

    // Initial height update
    updateHeight()

    // Observe for changes
    resizeObserver.observe(containerRef.current)

    // Also update height when view changes
    const mutationObserver = new MutationObserver(() => {
      updateHeight()
    })

    mutationObserver.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    })

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [view, isOnboardingActive]) // Re-run when view or onboarding state changes

  useEffect(() => {
    const cleanupFunctions = [
      window.electronAPI.onSolutionStart(() => {
        setView("solutions")
        console.log("starting processing")
      }),

      window.electronAPI.onUnauthorized(() => {
        queryClient.removeQueries(["screenshots"])
        queryClient.removeQueries(["solution"])
        queryClient.removeQueries(["problem_statement"])
        setView("queue")
        console.log("Unauthorized")
      }),
      // Update this reset handler
      window.electronAPI.onResetView(() => {
        console.log("Received 'reset-view' message from main process")

        queryClient.removeQueries(["screenshots"])
        queryClient.removeQueries(["solution"])
        queryClient.removeQueries(["problem_statement"])
        setView("queue")
        console.log("View reset to 'queue' via Command+R shortcut")
      }),
      window.electronAPI.onProblemExtracted((data: any) => {
        if (view === "queue") {
          console.log("Problem extracted successfully")
          queryClient.invalidateQueries(["problem_statement"])
          queryClient.setQueryData(["problem_statement"], data)
        }
      })
    ]
    return () => cleanupFunctions.forEach((cleanup) => cleanup())
  }, [])

  const containerStyle = {
    '--bg-color': theme === 'light' ? '255, 255, 255' : '0, 0, 0',
    '--bg-opacity': theme === 'light' ? String(opacity * 0.08) : String(opacity),
    '--text-color-primary': theme === 'light' ? '#000000' : '#f9fafb',
    '--text-color-secondary': theme === 'light' ? '#111111' : '#d1d5db',
    '--text-color-muted': theme === 'light' ? '#374151' : '#9ca3af',
    '--border-color': theme === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.15)',
  } as React.CSSProperties

  return (
    <div ref={containerRef} className="min-h-0" style={containerStyle}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {isOnboardingActive ? (
            <OnboardingWizard 
              onComplete={() => setIsOnboardingActive(false)} 
              onStyleChange={(t, o) => {
                setTheme(t)
                setOpacity(o)
              }}
            />
          ) : view === "queue" ? (
            <Queue setView={setView} opacity={opacity} onOpacityChange={setOpacity} />
          ) : view === "solutions" ? (
            <Solutions setView={setView} />
          ) : (
            <></>
          )}
          <ToastViewport />
        </ToastProvider>
      </QueryClientProvider>
    </div>
  )
}

export default App
