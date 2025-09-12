"use client"

import { ArrowLeftCircle } from "lucide-react"
import { navigateToMainDomain } from '@/utils/domainUtils'

interface UserEmailDisplayProps {
  className?: string
}


export function UserEmailDisplay({ className = "" }: UserEmailDisplayProps) {
  const handleBackToApp = () => {
    navigateToMainDomain();
  }

  return (
    <button
      onClick={handleBackToApp}
      className={`flex items-center space-x-2 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg px-3 py-2 hover:from-primary/20 hover:to-purple-500/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25 group cursor-pointer ${className}`}
    >
      <ArrowLeftCircle className="w-4 h-4 text-primary group-hover:animate-bounce transition-all duration-300" />
      <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors duration-300">
        Back to App
      </span>
    </button>
  )
}
