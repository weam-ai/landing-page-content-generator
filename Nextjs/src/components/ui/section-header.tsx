import React from 'react'

interface SectionHeaderProps {
  icon: React.ReactNode
  title: string
  description: string
  iconBgColor?: string
  iconTextColor?: string
  className?: string
}

export function SectionHeader({
  icon,
  title,
  description,
  iconBgColor = "bg-b12",
  iconTextColor = "text-b5",
  className = ""
}: SectionHeaderProps) {
  return (
    <div className={`text-center mb-8 ${className}`}>
      <div className={`mx-auto w-14 h-14 ${iconBgColor} rounded-full flex items-center justify-center mb-6`}>
        <div className={`w-8 h-8 ${iconTextColor}`}>
          {icon}
        </div>
      </div>
      <h3 className="md:text-2xl text-lg font-bold text-foreground mb-3">
        {title}
      </h3>
      <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
        {description}
      </p>
    </div>
  )
}
