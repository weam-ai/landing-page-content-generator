import React from 'react'
import { Upload, CheckCircle, X, ArrowRight, Loader2, FileImage } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Input } from "@/components/ui/input"

interface FileUploadCardProps {
  title: string
  description: string
  selectedFile: File | null
  dragActive: boolean
  isProcessing: boolean
  onDragEnter: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  onFileSubmit: () => void
  onRemoveFile: () => void
  maxSizeText: string
  icon: React.ReactNode
}

export function FileUploadCard({
  title,
  description,
  selectedFile,
  dragActive,
  isProcessing,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileInput,
  onFileSubmit,
  onRemoveFile,
  maxSizeText,
  icon
}: FileUploadCardProps) {
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
        <div
          className={`border-2 border-dashed rounded-xl p-4 text-center transition-all duration-300 ${
            dragActive 
              ? "border bg-gradient-to-r from-primary/5 to-purple-500/5 scale-105 shadow-lg shadow-primary/25" 
              : selectedFile 
              ? "border-green-500 bg-gradient-to-r from-green-50 to-emerald-50/50 shadow-md" 
              : "border-gray-300 hover:border-b7 hover:bg-gray-50/50"
          }`}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {selectedFile ? (
            <div className="space-y-3">
              <div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <p className="text-base font-semibold text-gray-800">
                    {selectedFile.name}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRemoveFile}
                    className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1 h-6 w-6"
                    disabled={isProcessing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mb-3 bg-green-100 rounded-full px-3 py-1 inline-block">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button 
                  onClick={onFileSubmit}
                  disabled={isProcessing}
                  className={`relative overflow-hidden bg-b2 text-white px-6 py-2 border duration-300 hover:bg-b5 ${
                    isProcessing ? 'cursor-not-allowed opacity-90' : ''
                  }`}
                >
                  {/* Animated background for processing state */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20 animate-pulse" />
                  )}
                  
                  {/* Button content with loading state */}
                  <div className="relative flex items-center">
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        <span>Process File</span>
                      </>
                    )}
                  </div>
                  
                  {/* Ripple effect on click */}
                  {isProcessing && (
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 to-purple-600/10 animate-ping" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                <Upload className="h-6 w-6 text-gray-500" />
              </div>
              <p className="text-base text-gray-700 mb-2 font-medium">
                Drag and drop your file here, or{" "}
                <label className="cursor-pointer hover:underline font-semibold underline">
                  browse files
                  <Input
                    type="file"
                    accept="*/*"
                    onChange={onFileInput}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-sm text-gray-500 bg-gray-100 rounded-full px-3 py-1 inline-block">
                {maxSizeText}
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
