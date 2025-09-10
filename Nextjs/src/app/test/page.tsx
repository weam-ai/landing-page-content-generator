import { cookies } from 'next/headers';
import { getSession } from '../../config/withSession';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Building2, Shield, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default async function SessionTestPage() {
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
                  Session Test Dashboard
                </h1>
                <p className="text-gray-600 text-sm">Monitor session status and user information</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge 
                variant={isLoggedIn ? "default" : "destructive"}
                className="flex items-center space-x-1"
              >
                {isLoggedIn ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    <span>Authenticated</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3" />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
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
                  <CardDescription>Current authentication state</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg">
                <span className="font-medium">Authentication Status</span>
                <Badge variant={isLoggedIn ? "default" : "destructive"}>
                  {isLoggedIn ? "Active" : "Inactive"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg">
                <span className="font-medium">Cookie Present</span>
                <Badge variant={weamCookie ? "default" : "secondary"}>
                  {weamCookie ? "Found" : "Not Found"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg">
                <span className="font-medium">Session Object</span>
                <Badge variant={session ? "default" : "secondary"}>
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
                  <CardTitle className="text-xl font-semibold">User Information</CardTitle>
                  <CardDescription>Current user session data</CardDescription>
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
                        <p className="text-sm font-medium text-gray-600">Email Address</p>
                        <p className="text-lg font-semibold text-gray-900">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200/50">
                      <Shield className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">User ID</p>
                        <p className="text-lg font-semibold text-gray-900 font-mono">{user._id}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200/50">
                      <Building2 className="w-5 h-5 text-purple-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Company ID</p>
                        <p className="text-lg font-semibold text-gray-900 font-mono">{user.companyId}</p>
                      </div>
                    </div>
                    
                    {user.roleCode && (
                      <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200/50">
                        <Shield className="w-5 h-5 text-orange-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">Role</p>
                          <p className="text-lg font-semibold text-gray-900">{user.roleCode}</p>
                        </div>
                      </div>
                    )}
                    
                    {user.isProfileUpdated !== undefined && (
                      <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200/50">
                        <CheckCircle className="w-5 h-5 text-teal-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600">Profile Status</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {user.isProfileUpdated ? "Updated" : "Pending Update"}
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
        </div>

        {/* Debug Information Card */}
        <Card className="mt-8 relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-gray-50/50 to-gray-500/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(107,114,128,0.05),transparent_50%)] opacity-60" />
          <CardHeader className="relative">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-gray-500 to-gray-700 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">Debug Information</CardTitle>
                <CardDescription>Technical details for troubleshooting</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Cookie Information</h4>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Cookie Name:</span> weam
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Cookie Present:</span> {weamCookie ? "Yes" : "No"}
                  </p>
                  {weamCookie && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Cookie Value:</span> {weamCookie.value.substring(0, 20)}...
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700">Session Object</h4>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Session Exists:</span> {session ? "Yes" : "No"}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">User Object:</span> {user ? "Present" : "Missing"}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Timestamp:</span> {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}