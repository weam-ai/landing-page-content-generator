"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: string
  position?: "top" | "bottom" | "left" | "right"
  className?: string
}

export function Tooltip({ 
  children, 
  content, 
  position = "top",
  className 
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  const positionClasses = {
    top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
    left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
    right: "left-full top-1/2 transform -translate-y-1/2 ml-2"
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            "absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap",
            positionClasses[position],
            className
          )}
        >
          {content}
          <div
            className={cn(
              "absolute w-2 h-2 bg-gray-900 transform rotate-45",
              position === "top" && "top-full left-1/2 -translate-x-1/2 -translate-y-1/2",
              position === "bottom" && "bottom-full left-1/2 -translate-x-1/2 translate-y-1/2",
              position === "left" && "left-full top-1/2 -translate-y-1/2 -translate-x-1/2",
              position === "right" && "right-full top-1/2 -translate-y-1/2 translate-x-1/2"
            )}
          />
        </div>
      )}
    </div>
  )
}
