import { useState, useEffect } from "react"
import { useTheme } from "@/contexts/ThemeContext"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { actualTheme } = useTheme()
  const [isMobilePage, setIsMobilePage] = useState(false)

  // Check if on mobile page using window.location (avoids Router context requirement)
  useEffect(() => {
    const checkMobilePage = () => {
      setIsMobilePage(window.location.pathname.startsWith('/m/'))
    }

    checkMobilePage()

    // Listen for browser back/forward
    window.addEventListener('popstate', checkMobilePage)

    // Intercept pushState/replaceState to detect SPA navigation
    // (replaces MutationObserver on document.body which fired on every DOM change)
    const origPushState = history.pushState
    const origReplaceState = history.replaceState
    history.pushState = function(...args: Parameters<typeof history.pushState>) {
      origPushState.apply(this, args)
      checkMobilePage()
    }
    history.replaceState = function(...args: Parameters<typeof history.replaceState>) {
      origReplaceState.apply(this, args)
      checkMobilePage()
    }

    return () => {
      window.removeEventListener('popstate', checkMobilePage)
      history.pushState = origPushState
      history.replaceState = origReplaceState
    }
  }, [])

  return (
    <Sonner
      theme={actualTheme as ToasterProps["theme"]}
      position={isMobilePage ? "bottom-left" : "bottom-right"}
      offset={isMobilePage ? 110 : 16}
      className={isMobilePage ? "toaster group !bottom-[calc(5rem+env(safe-area-inset-bottom))]" : "toaster group"}
      style={isMobilePage ? { left: '16px', right: 'auto', marginRight: '80px' } : undefined}
      toastOptions={{
        classNames: {
          toast: isMobilePage
            ? "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-md group-[.toaster]:py-1.5 group-[.toaster]:px-3 group-[.toaster]:text-xs group-[.toaster]:rounded-full group-[.toaster]:min-h-0 group-[.toaster]:w-auto group-[.toaster]:max-w-[200px]"
            : "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-sm",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:hidden",
          actionButton: isMobilePage
            ? "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:text-xs group-[.toast]:font-semibold group-[.toast]:rounded-full group-[.toast]:px-2.5 group-[.toast]:py-0.5 group-[.toast]:ml-2"
            : "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
        duration: isMobilePage ? 4000 : 5000,
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
