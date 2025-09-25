"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, ArrowRight, LogIn, FileText, Sparkles } from "lucide-react"
import { extractMainDomain } from "@/utils/domainUtils"

interface AuthorizationMessageProps {}

export function AuthorizationMessage({}: AuthorizationMessageProps) {
  const handleAuthRedirect = () => {
    try {
      // Extract the main domain and construct login URL
      const mainDomain = extractMainDomain();
      const loginUrl = `${mainDomain}/login`;
      window.location.href = loginUrl;
    } catch (error) {
      // Fallback to a default URL if domainUtils fails
      window.location.href = 'https://app.weam.ai/login';
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header - Matching the main page design */}
      <header className="overflow-hidden bg-b12 border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-6 relative">
          <div className="flex items-center justify-center">
            <div className="flex-1 text-center">
              {/* Enhanced Title Section */}
              <div className="flex items-center justify-center space-x-3 mb-2">
                  <div className="w-12 h-12 bg-b12 border rounded-xl flex items-center justify-center">
                    <div className="w-8 h-8 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-b2" />
                    </div>
                  </div>
                
                <div>
                  <h1 className="text-3xl font-black">
                    AI Landing Page Generator
                  </h1>
                  <div className="flex items-center justify-center space-x-2 mt-1">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Weam AI-Powered Platform</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-2xl text-center border overflow-hidden">
            {/* Card Header with Gradient Background */}
            <CardHeader className="relative pb-8 pt-12">
              <div className="relative text-center">
                {/* Icon with Enhanced Styling */}
                <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-xl border bg-b12">
                  <Shield className="h-10 w-10 text-primary" />
                </div>
                
                <CardTitle className="text-3xl font-black mb-4">
                  Authorization Required
                </CardTitle>
                <CardDescription className="text-lg text-gray-600 leading-relaxed font-medium">
                  You need to be authenticated to view your landing pages. 
                  <br />
                  <span className="text-primary font-semibold">Please sign in to continue</span> and access your AI-powered content.
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-8 pb-12 px-8 text-center">
              {/* Enhanced CTA Button */}
              <div className="relative">
                <Button 
                  onClick={handleAuthRedirect}
                  size="lg"
                  className="bg-black text-white hover:bg-b5 hover:text-white"
                >
                                    
                  {/* Button Content */}
                  <div className="relative flex items-center justify-center space-x-3">
                    <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm relative">
                      <LogIn className="h-4 w-4 text-white animate-pulse" />
                      {/* Star animation particles */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1 h-1 bg-white rounded-full animate-ping absolute -top-1 -right-1" style={{ animationDelay: '0.5s' }}></div>
                        <div className="w-1 h-1 bg-white rounded-full animate-ping absolute -bottom-1 -left-1" style={{ animationDelay: '1s' }}></div>
                        <div className="w-1 h-1 bg-white rounded-full animate-ping absolute top-0 left-0" style={{ animationDelay: '1.5s' }}></div>
                      </div>
                    </div>
                    <span>Sign In to Continue</span>
                  </div>
                </Button>
              </div>


              {/* Support Message */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200/50">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-gray-700">Need Help?</span>
                </div>
                <p className="text-sm text-gray-600">
                  If you're having trouble signing in, please contact our support team or try refreshing the page.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
