"use client"

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface TurnstileProps {
  siteKey: string
  onSuccess?: (token: string) => void
  onError?: (error: Error) => void
  onExpire?: () => void
  theme?: "light" | "dark" | "auto"
  size?: "normal" | "compact"
  tabIndex?: number
  responseField?: boolean
  responseFieldName?: string
  retry?: "auto" | "never"
  retryInterval?: number
  refreshExpired?: "auto" | "manual" | "never"
  className?: string
  wrapInCard?: boolean
}

export interface TurnstileRef {
  reset: () => void
  getResponse: () => string | undefined
  remove: () => void
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          "error-callback"?: (error: string | Error) => void
          "expired-callback"?: () => void
          theme?: "light" | "dark" | "auto"
          size?: "normal" | "compact"
          tabindex?: number
          "response-field"?: boolean
          "response-field-name"?: string
          retry?: "auto" | "never"
          "retry-interval"?: number
          "refresh-expired"?: "auto" | "manual" | "never"
        }
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
      getResponse: (widgetId: string) => string | undefined
      ready: (callback: () => void) => void
    }
    turnstileLoadCallbacks?: (() => void)[]
  }
}

let scriptLoadPromise: Promise<void> | null = null
let scriptLoaded = false
let onloadCallbackName: string | null = null

const loadTurnstileScript = (): Promise<void> => {
  if (scriptLoaded && window.turnstile) {
    return Promise.resolve()
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise
  }

  const existingScript = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')
  if (existingScript) {
    existingScript.remove()
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    onloadCallbackName = `turnstileOnload_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    const windowObj = window as unknown as Record<string, unknown>
    windowObj[onloadCallbackName] = () => {
      scriptLoaded = true
      scriptLoadPromise = null
      if (onloadCallbackName) {
        delete windowObj[onloadCallbackName]
      }
      resolve()
    }

    const script = document.createElement("script")
    script.src = `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=${onloadCallbackName}`
    script.crossOrigin = "anonymous"
    script.defer = true

    script.onerror = (event) => {
      scriptLoadPromise = null
      if (onloadCallbackName) {
        const windowObj = window as unknown as Record<string, unknown>
        delete windowObj[onloadCallbackName]
      }
      const errorMsg = event instanceof ErrorEvent ? event.message : 'Failed to load Turnstile script'
      reject(new Error(errorMsg))
    }

    document.head.appendChild(script)
  })

  return scriptLoadPromise
}

const Turnstile = forwardRef<TurnstileRef, TurnstileProps>(
  (
    {
      siteKey,
      onSuccess,
      onError,
      onExpire,
      theme = "auto",
      size = "normal",
      tabIndex,
      responseField = true,
      responseFieldName = "cf-turnstile-response",
      retry = "auto",
      retryInterval = 8000,
      refreshExpired = "auto",
      wrapInCard = true,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<string | null>(null)
    const mountedRef = useRef(true)
    const [renderError, setRenderError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const retryCountRef = useRef(0)
    const maxRetries = 3

    const callbacksRef = useRef({
      onSuccess,
      onError,
      onExpire,
    })

    const optionsRef = useRef({
      theme,
      size,
      tabIndex,
      responseField,
      responseFieldName,
      retry,
      retryInterval,
      refreshExpired,
    })

    useEffect(() => {
      callbacksRef.current = {
        onSuccess,
        onError,
        onExpire,
      }
      optionsRef.current = {
        theme,
        size,
        tabIndex,
        responseField,
        responseFieldName,
        retry,
        retryInterval,
        refreshExpired,
      }
    }, [onSuccess, onError, onExpire, theme, size, tabIndex, responseField, responseFieldName, retry, retryInterval, refreshExpired])

    const handleTurnstileError = useCallback((error: string | Error) => {
      console.warn('Turnstile error:', error)
      setRenderError(typeof error === 'string' ? error : error.message)
      setIsLoading(false)

      let errorMessage = 'Captcha verification failed. Please try again.'

      if (typeof error === 'string') {
        switch (error) {
          case '600010':
            errorMessage = 'Captcha loading issue. Please refresh the page and try again.'
            break
          case '600011':
            errorMessage = 'Captcha expired. Please verify again.'
            break
          case '600012':
            errorMessage = 'Captcha already used. Please refresh and try again.'
            break
          case '110200':
            errorMessage = 'Invalid site configuration. Please contact support.'
            break
          default:
            errorMessage = `Captcha error (${error}). Please try again.`
        }
      } else if (error.message?.includes('600010')) {
        errorMessage = 'Captcha loading issue. Please refresh the page and try again.'
      }

      callbacksRef.current.onError?.(new Error(errorMessage))
    }, [])

    const renderWidget = useCallback(async () => {
      if (!containerRef.current || !window.turnstile || !mountedRef.current) {
        return
      }

      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch (cleanupError) {
          console.warn('Error cleaning up previous widget:', cleanupError)
        }
        widgetIdRef.current = null
      }

      try {
        setRenderError(null)

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            if (mountedRef.current) {
              retryCountRef.current = 0
              callbacksRef.current.onSuccess?.(token)
            }
          },
          "error-callback": handleTurnstileError,
          "expired-callback": () => {
            if (mountedRef.current) {
              callbacksRef.current.onExpire?.()
            }
          },
          theme: optionsRef.current.theme,
          size: optionsRef.current.size,
          tabindex: optionsRef.current.tabIndex,
          "response-field": optionsRef.current.responseField,
          "response-field-name": optionsRef.current.responseFieldName,
          retry: optionsRef.current.retry,
          "retry-interval": optionsRef.current.retryInterval,
          "refresh-expired": optionsRef.current.refreshExpired,
        })

        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
              if (node.nodeName === 'IFRAME') {
                // Give it a bit more time to fully render
                setTimeout(() => {
                  if (mountedRef.current) {
                    setIsLoading(false)
                  }
                }, 100)
                observer.disconnect()
                return
              }
            }
          }
        })

        if (containerRef.current) {
          observer.observe(containerRef.current, { childList: true, subtree: true })

          setTimeout(() => {
            if (mountedRef.current) {
              setIsLoading(false)
            }
            observer.disconnect()
          }, 2000)
        }
      } catch (error) {
        console.error("Failed to render Turnstile widget:", error)
        const errorMessage = error instanceof Error ? error.message : "Failed to render Turnstile widget"
        setRenderError(errorMessage)

        if (retryCountRef.current < maxRetries && mountedRef.current) {
          retryCountRef.current++
          console.log(`Retrying widget render (attempt ${retryCountRef.current}/${maxRetries})`)
          setTimeout(() => {
            if (mountedRef.current) {
              renderWidget()
            }
          }, 1000 * retryCountRef.current)
        } else {
          handleTurnstileError(error instanceof Error ? error : new Error(errorMessage))
        }
      }
    }, [siteKey, handleTurnstileError])

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.reset(widgetIdRef.current)
            setRenderError(null)
          } catch (error) {
            console.error('Failed to reset Turnstile widget:', error)
          }
        }
      },
      getResponse: () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            return window.turnstile.getResponse(widgetIdRef.current)
          } catch (error) {
            console.error('Failed to get Turnstile response:', error)
          }
        }
        return undefined
      },
      remove: () => {
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current)
            widgetIdRef.current = null
            setRenderError(null)
          } catch (error) {
            console.error('Failed to remove Turnstile widget:', error)
          }
        }
      },
    }), [])

    useEffect(() => {
      const initializeTurnstile = async () => {
        try {
          await loadTurnstileScript()

          if (!mountedRef.current) return

          if (window.turnstile && !widgetIdRef.current) {
            renderWidget()
          }
        } catch (error) {
          console.error("Failed to initialize Turnstile:", error)
          if (mountedRef.current) {
            handleTurnstileError(error instanceof Error ? error : new Error("Failed to initialize Turnstile"))
          }
        }
      }

      initializeTurnstile()

      return () => {
        mountedRef.current = false

        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current)
          } catch (error) {
            console.warn("Failed to clean up Turnstile widget:", error)
          }
          widgetIdRef.current = null
        }
      }
    }, [renderWidget, handleTurnstileError])

    useEffect(() => {
      if (widgetIdRef.current && window.turnstile && scriptLoaded && mountedRef.current) {
        renderWidget()
      }
    }, [siteKey, renderWidget])

    useEffect(() => {
      mountedRef.current = true
      return () => {
        mountedRef.current = false
      }
    }, [])

    const widgetContent = (
      <>
        {isLoading && !renderError && (
          <Skeleton
            className={`${
              size === 'compact'
                ? 'h-[140px] w-[150px]'
                : 'h-[65px] w-[300px]'
            } rounded-md border`}
          />
        )}
        <div
          ref={containerRef}
          className="cf-turnstile"
          style={{ display: isLoading && !renderError ? 'none' : 'block' }}
        />
        {renderError && (
          <div className="text-sm text-red-600 mt-2" role="alert">
            {renderError}
          </div>
        )}
      </>
    )

    if (wrapInCard) {
      return (
        <Card className="max-w-md py-4 px-0">
          <CardHeader>
            <CardTitle>Verification</CardTitle>
          </CardHeader>
          <CardContent className="-mt-4">
            {widgetContent}
          </CardContent>
        </Card>
      )
    }

    return widgetContent
  }
)

Turnstile.displayName = "Turnstile"

export { Turnstile }