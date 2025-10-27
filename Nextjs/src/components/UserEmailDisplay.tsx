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
      className="flex items-center space-x-2 border px-3 py-2 rounded-md text-sm font-medium group hover:bg-b2 hover:text-white transition-all duration-300"
    >
      <ArrowLeftCircle className="w-4 h-4" />
      <span>
        Back to App
      </span>
    </button>
  )
}
