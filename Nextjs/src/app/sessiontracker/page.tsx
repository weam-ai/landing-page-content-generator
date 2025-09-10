import { cookies } from 'next/headers';
import { getSession } from '../../config/withSession';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Building2, Shield, CheckCircle, XCircle, AlertCircle, Lock } from "lucide-react";

export default async function SessionTrackerPage() {
  // Get the weam cookie using Next.js cookies
  const cookieStore = cookies();
  const weamCookie = cookieStore.get('weam');
  
  const session = await getSession();
  console.log('Session Debug:', session.user?.companyId);
  
  const isLoggedIn = !!session.user;
  const user = session.user;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-white via-gray-50/50 to-primary/5 border-b border-gray-200/60 sticky top-0 z-10 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(147,51,234,0.08),transparent_50%)] opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.06),transparent_50%)] opacity-60" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-primary via-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-xl shadow-primary/25">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-primary to-purple-700 bg-clip-text text-transparent">
                  Session Tracker Dashboard
                </h1>
                <p className="text-gray-600 text-sm">Track and monitor session status and user information</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge 
                variant={isLoggedIn ? "default" : "destructive"}
                className={`flex items-center space-x-1 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md ${isLoggedIn ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 hover:border-emerald-300" : "bg-red-100 text-red-800 border-red-200 hover:bg-red-200 hover:border-red-300"}`}
              >
                {isLoggedIn ? (
                  <>
                    <CheckCircle className="w-3 h-3 transition-transform duration-300 group-hover:scale-110" />
                    <span>Authenticated</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 transition-transform duration-300 group-hover:scale-110" />
                    <span>Not Authenticated</span>
                  </>
                )}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Session Status Card */}
          <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-gray-50/50 to-primary/5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(147,51,234,0.05),transparent_50%)] opacity-60" />
            <CardHeader className="relative">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">Session Status</CardTitle>
                  <CardDescription>Authentication & Security</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg group hover:bg-gray-100/50 transition-colors duration-200">
                <span className="font-medium">Authentication</span>
                <Badge variant={isLoggedIn ? "default" : "destructive"} className={`transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md ${isLoggedIn ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 hover:border-emerald-300" : "bg-red-100 text-red-800 border-red-200 hover:bg-red-200 hover:border-red-300"}`}>
                  {isLoggedIn ? "Active" : "Inactive"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg group hover:bg-gray-100/50 transition-colors duration-200">
                <span className="font-medium">Session Cookie</span>
                <Badge variant={weamCookie ? "default" : "secondary"} className={`transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md ${weamCookie ? "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 hover:border-blue-300" : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:border-slate-300"}`}>
                  {weamCookie ? "Present" : "Missing"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg group hover:bg-gray-100/50 transition-colors duration-200">
                <span className="font-medium">Session Valid</span>
                <Badge variant={session ? "default" : "secondary"} className={`transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md ${session ? "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200 hover:border-indigo-300" : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:border-slate-300"}`}>
                  {session ? "Valid" : "Invalid"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* User Information Card */}
          <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-gray-50/50 to-purple-500/5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(147,51,234,0.05),transparent_50%)] opacity-60" />
            <CardHeader className="relative">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">User Profile</CardTitle>
                  <CardDescription>Account information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-4">
              {isLoggedIn && user ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200/50">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Email</p>
                        <p className="text-lg font-semibold text-gray-900">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200/50">
                      <Shield className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">User ID</p>
                        <p className="text-sm font-semibold text-gray-900 font-mono">{user._id}</p>
                      </div>
                    </div>
                    
                    {user.companyId && (
                      <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200/50">
                        <Building2 className="w-5 h-5 text-purple-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">Company ID</p>
                          <p className="text-sm font-semibold text-gray-900 font-mono">{user.companyId}</p>
                        </div>
                      </div>
                    )}
                    
                    {user.roleCode && (
                      <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200/50">
                        <Shield className="w-5 h-5 text-orange-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">Role</p>
                          <p className="text-sm font-semibold text-gray-900">{user.roleCode}</p>
                        </div>
                      </div>
                    )}
                    
                    {user.isProfileUpdated !== undefined && (
                      <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200/50">
                        <CheckCircle className="w-5 h-5 text-teal-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">Profile Status</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {user.isProfileUpdated ? "Complete" : "Incomplete"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No User Session</h3>
                  <p className="text-gray-600">Please log in to view user information</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Information Card */}
          <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-gray-50/50 to-green-500/5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.05),transparent_50%)] opacity-60" />
            <CardHeader className="relative">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold">Security Status</CardTitle>
                  <CardDescription>Session security information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-4">
              {isLoggedIn && user ? (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200/50 group hover:from-green-100 hover:to-emerald-100 transition-all duration-300">
                      <Lock className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform duration-300" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Session Security</p>
                        <Badge variant="default" className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200 hover:border-emerald-300 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md">
                          Encrypted
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200/50 group hover:from-blue-100 hover:to-cyan-100 transition-all duration-300">
                      <Shield className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Session Type</p>
                        <Badge variant="default" className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:border-slate-300 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md">
                          Iron Session
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200/50 group hover:from-purple-100 hover:to-violet-100 transition-all duration-300">
                      <CheckCircle className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Session State</p>
                        <Badge variant="default" className="bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200 hover:border-indigo-300 transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-md">
                          Active & Secure
                        </Badge>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Security Information</h3>
                  <p className="text-gray-600">Authentication required to view security status</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}