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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Header - Matching the main page design */}
      <header className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50/50 to-primary/5 border-b border-gray-200/60 sticky top-0 z-10 shadow-sm">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(147,51,234,0.08),transparent_50%)] opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.06),transparent_50%)] opacity-60" />
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full blur-3xl opacity-30" />
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-gradient-to-r from-purple-500/20 to-primary/20 rounded-full blur-3xl opacity-30" />
        
        <div className="container mx-auto px-6 py-6 relative">
          <div className="flex items-center justify-center">
            <div className="flex-1 text-center">
              {/* Enhanced Title Section */}
              <div className="flex items-center justify-center space-x-3 mb-2">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-primary via-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-xl shadow-primary/25">
                    <div className="w-8 h-8 bg-white/90 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  {/* Floating accent dots */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                </div>
                
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-gray-900 via-primary to-purple-700 bg-clip-text text-transparent leading-tight">
                    AI Landing Page Generator
                  </h1>
                  <div className="flex items-center justify-center space-x-2 mt-1">
                    <div className="w-2 h-2 bg-gradient-to-r from-primary to-purple-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Weam AI-Powered Platform</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-2xl text-center shadow-2xl border-0 overflow-hidden bg-gradient-to-br from-white via-gray-50/50 to-primary/5">
            {/* Card Header with Gradient Background */}
            <CardHeader className="relative pb-8 pt-12">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(147,51,234,0.08),transparent_50%)] opacity-60" />
              
              <div className="relative">
                {/* Icon with Enhanced Styling */}
                <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-r from-primary/10 via-purple-100 to-purple-200 border-2 border-primary/20 shadow-xl relative">
                  <Shield className="h-10 w-10 text-primary" />
                  {/* Floating particles */}
                  <div className="absolute -top-2 -right-2 w-3 h-3 bg-gradient-to-r from-primary to-purple-500 rounded-full animate-ping" />
                  <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-gradient-to-r from-purple-400 to-primary rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                </div>
                
                <CardTitle className="text-3xl font-black bg-gradient-to-r from-gray-900 via-primary to-purple-700 bg-clip-text text-transparent mb-4">
                  Authorization Required
                </CardTitle>
                <CardDescription className="text-xl text-gray-600 leading-relaxed font-medium">
                  You need to be authenticated to view your landing pages. 
                  <br />
                  <span className="text-primary font-semibold">Please sign in to continue</span> and access your AI-powered content.
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-8 pb-12 px-8">
              {/* Enhanced CTA Button */}
              <div className="relative">
                <Button 
                  onClick={handleAuthRedirect}
                  size="lg"
                  className="relative bg-gradient-to-r from-primary via-purple-600 to-purple-700 hover:from-primary/90 hover:via-purple-600/90 hover:to-purple-700/90 text-white shadow-2xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 px-8 py-4 text-lg font-bold rounded-xl border-0 overflow-hidden group w-[70%]"
                >
                  {/* Button Background Pattern */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
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
                  
                  {/* Button Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Floating notification badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-primary via-purple-600 to-purple-700 rounded-full flex items-center justify-center shadow-lg shadow-primary/30 border-2 border-white animate-pulse">
                    <Shield className="w-4 h-4 text-white" />
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
