"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LandingPageEditor } from "@/components/LandingPageEditor"
import { LandingPage } from "@/types"
import { useLandingPages } from "@/hooks/useLandingPages"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function EditorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pageId = searchParams.get('id')
  
  const [landingPage, setLandingPage] = useState<LandingPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { landingPages, loading: pagesLoading, error: pagesError, refreshData, updatePage } = useLandingPages()

  useEffect(() => {
    if (!pageId) {
      setError("No page ID provided")
      setLoading(false)
      return
    }

    // Wait for landing pages to load
    if (pagesLoading) {
      return
    }

    // Find the landing page from the list
    const page = landingPages.find(p => p.id === pageId)
    if (page) {
      setLandingPage(page)
      setLoading(false)
    } else {
      // If pages are loaded but page not found, try to refresh data
      if (landingPages.length > 0) {
        setError("Landing page not found")
        setLoading(false)
      } else {
        // If no pages loaded, refresh data and try again
        refreshData()
      }
    }
  }, [pageId, landingPages, pagesLoading, refreshData])

  const handleSave = async (updatedPage: LandingPage) => {
    try {
      await updatePage(updatedPage.id, updatedPage)
      // Navigate back to main page after successful update
      router.push('/')
    } catch (error) {
      console.error('Failed to update landing page:', error)
      setError('Failed to save changes')
    }
  }

  const handleCancel = () => {
    router.push('/')
  }

  if (loading || pagesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">
            {pagesLoading ? "Loading landing pages..." : "Loading landing page..."}
          </p>
        </div>
      </div>
    )
  }

  if (error || !landingPage || pagesError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">
            {pagesError || error || "Landing page not found"}
          </p>
          <div className="flex items-center justify-center space-x-3">
            <Button onClick={handleCancel} variant="outline">
              Go Back
            </Button>
            {pagesError && (
              <Button onClick={() => refreshData()} variant="outline">
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingPageEditor
        landingPage={landingPage}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}
