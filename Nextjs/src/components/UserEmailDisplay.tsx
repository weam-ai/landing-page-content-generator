"use client"

import { useState, useEffect } from "react"
import { ArrowLeft } from "lucide-react"
import config from '../config/credencial_config'

interface UserObject {
  id: string
  email: string
  companyId: string
}

interface UserEmailDisplayProps {
  className?: string
}

// Environment URL mapper
const getEnvironmentUrl = (): string => {
  const environment = config.environment
  
  switch (environment) {
    case 'development':
      return 'https://dev.weam.ai/'
    case 'qa':
      return 'https://qa.weam.ai/'
    case 'production':
      return 'https://app.weam.ai/'
    default:
      // Default to production if environment is not set
      return 'https://app.weam.ai/'
  }
}

export function UserEmailDisplay({ className = "" }: UserEmailDisplayProps) {
  const [user, setUser] = useState<UserObject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`${config.basePath}/api/user/session`)
        const result = await response.json()
        
        if (result.success) {
          setUser(result.data)
        } else {
          setError('Failed to load user data')
          // Set fallback user data
          setUser({
            id: "507f1f77bcf86cd799439011",
            email: "default@gmail.com",
            companyId: "507f1f77bcf86cd799439012"
          })
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err)
        setError('Failed to load user data')
        // Set fallback user data
        setUser({
          id: "507f1f77bcf86cd799439011",
          email: "default@gmail.com",
          companyId: "507f1f77bcf86cd799439012"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const handleBackToApp = () => {
    window.open(getEnvironmentUrl(), '_blank')
  }

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-5 h-5 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full animate-pulse" />
        <div className="w-20 h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded animate-pulse" />
      </div>
    )
  }

  // Check if user is a guest (default email or error state)
  const isGuest = error || !user || user.email === "default@gmail.com"

  if (isGuest) {
    return (
      <button
        onClick={handleBackToApp}
        className={`flex items-center space-x-2 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg px-3 py-2 hover:from-primary/20 hover:to-purple-500/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25 group cursor-pointer ${className}`}
      >
        <ArrowLeft className="w-4 h-4 text-primary group-hover:animate-bounce transition-all duration-300" />
        <span className="text-sm font-medium text-gray-600 group-hover:text-primary transition-colors duration-300">back to app</span>
      </button>
    )
  }

  return (
    <button
      onClick={handleBackToApp}
      className={`flex items-center space-x-2 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg px-3 py-2 hover:from-primary/20 hover:to-purple-500/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25 group cursor-pointer ${className}`}
    >
      <ArrowLeft className="w-4 h-4 text-primary group-hover:animate-bounce transition-all duration-300" />
      <span className="text-sm font-medium text-gray-700 group-hover:text-primary transition-colors duration-300">
        back to app
      </span>
    </button>
  )
}
