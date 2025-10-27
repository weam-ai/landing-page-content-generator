import React from 'react'
import { Globe, Sparkles } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Input } from './input'

interface UrlInputCardProps {
  title: string
  description: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  buttonText: string
  buttonIcon: React.ReactNode
  disabled?: boolean
  infoText: string
  icon: React.ReactNode
}

export function UrlInputCard({
  title,
  description,
  placeholder,
  value,
  onChange,
  onSubmit,
  buttonText,
  buttonIcon,
  disabled = false,
  infoText,
  icon
}: UrlInputCardProps) {
  return (
    <Card className="group border-2 border-dashed border-b10 hover:border-b8 transition-all duration-300 bg-white/80">
      <CardHeader className="text-center pb-3">
        <div className="mx-auto w-10 h-10 bg-b12 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <CardTitle className="text-lg font-semibold text-gray-800">{title}</CardTitle>
        <CardDescription className="text-gray-600">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex md:space-x-3 md:flex-row flex-col md:gap-y-0 gap-y-2">
          <Input
            type="url"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className=""
          />
          <Button 
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className="px-6 py-2 bg-b2 text-white transition-all duration-200 transform hover:bg-b5"
          >
            {buttonIcon}
            {buttonText}
          </Button>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500 bg-blue-50/50 rounded-lg p-3 max-md:p-0">
          <Sparkles className="w-4 h-4 text-blue-500 max-md:hidden" />
          <span>{infoText}</span>
        </div>
      </CardContent>
    </Card>
  )
}
