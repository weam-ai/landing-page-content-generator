import React from 'react'

interface DividerProps {
  text?: string
  className?: string
  textClassName?: string
}

export function Divider({ 
  text = "Or", 
  className = "", 
  textClassName = "" 
}: DividerProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-center">
        <span className={`bg-white px-6 text-sm font-semibold text-gray-500 uppercase tracking-wider ${textClassName}`}>
          {text}
        </span>
      </div>
    </div>
  )
}
