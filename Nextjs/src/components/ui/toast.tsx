"use client"

import { useState, useEffect } from "react"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Trash2 } from "lucide-react"

export interface ToastProps {
  id: string
  title: string
  description?: string
  type?: "success" | "error" | "warning" | "info"
  duration?: number
  onClose?: () => void
}

export function Toast({ id, title, description, type = "info", duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [timeLeft, setTimeLeft] = useState(duration / 1000)

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onClose?.(), 300) // Wait for animation to complete
      }, duration)

      // Update countdown every second
      const countdownInterval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        clearTimeout(timer)
        clearInterval(countdownInterval)
      }
    }
  }, [duration, onClose])

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case "error":
        return <AlertCircle className="h-6 w-6 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
      default:
        return <Info className="h-6 w-6 text-blue-600" />
    }
  }

  const getGradientBackground = () => {
    switch (type) {
      case "success":
        return "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
      case "error":
        return "bg-gradient-to-r from-red-50 to-rose-50 border-red-200"
      case "warning":
        return "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200"
      default:
        return "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
    }
  }

  const getProgressColor = () => {
    switch (type) {
      case "success":
        return "bg-green-500"
      case "error":
        return "bg-red-500"
      case "warning":
        return "bg-yellow-500"
      default:
        return "bg-blue-500"
    }
  }

  if (!isVisible) return null

  return (
    <div
      className={`fixed top-4 right-4 z-50 max-w-md w-full bg-white border-2 rounded-xl shadow-xl transform transition-all duration-300 ease-in-out ${
        isVisible ? "translate-x-0 opacity-100 scale-100" : "translate-x-full opacity-0 scale-95"
      } ${getGradientBackground()}`}
    >
      {/* Progress Bar */}
      <div className="h-1 bg-gray-200 rounded-t-xl overflow-hidden">
        <div 
          className={`h-full ${getProgressColor()} transition-all duration-1000 ease-linear`}
          style={{ 
            width: `${(timeLeft / (duration / 1000)) * 100}%` 
          }}
        />
      </div>

      <div className="p-5">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              type === "success" ? "bg-green-100" :
              type === "error" ? "bg-red-100" :
              type === "warning" ? "bg-yellow-100" :
              "bg-blue-100"
            }`}>
              {getIcon()}
            </div>
          </div>
          <div className="ml-4 w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-gray-900">{title}</p>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 font-medium">
                  {timeLeft}s
                </span>
                <button
                  className="bg-white rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => {
                    setIsVisible(false)
                    setTimeout(() => onClose?.(), 300)
                  }}
                >
                  <span className="sr-only">Close</span>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {description && (
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ToastContainer({ toasts, onRemove }: { toasts: ToastProps[], onRemove: (id: string) => void }) {
  // Show only the latest toast (last one in the array)
  const latestToast = toasts[toasts.length - 1]
  
  return (
    <div className="fixed top-4 right-4 z-50">
      {latestToast && (
        <Toast
          key={latestToast.id}
          {...latestToast}
          onClose={() => onRemove(latestToast.id)}
        />
      )}
    </div>
  )
}
