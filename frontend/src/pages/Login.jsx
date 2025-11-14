import React, { useState, useContext } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Eye, EyeOff } from 'lucide-react';
import { AuthContext } from '../App';
// import { mockUser } from '../mock'; // Removed mockUser import
import { toast } from '../hooks/use-toast';
import apiClient from '../lib/apiClient'; // Import apiClient

const Login = () => {
  const { login } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ 
    email: '', 
    password: '', 
    confirmPassword: '', 
    role: 'viewer' // Default role
  });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const loginBody = new URLSearchParams({
        username: loginForm.email,
        password: loginForm.password,
      });
      console.log("Frontend sending login request with:", {
        username: loginForm.email,
        password: loginForm.password,
        bodyString: loginBody.toString()
      });

      const response = await apiClient('/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: loginBody,
      });

      localStorage.setItem('token', response.access_token);

      const userData = await apiClient('/auth/me', {
        headers: { 'Authorization': `Bearer ${response.access_token}` },
      });
      
      login(userData);
      toast({
        title: "Login successful",
        description: "Welcome to Optiya INSIGHT"
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (registerForm.password !== registerForm.confirmPassword) {
      toast({
        title: "Registration failed",
        description: "Passwords do not match",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }
    
    try {
      const data = await apiClient('/auth/register', {
        method: 'POST',
        body: {
          email: registerForm.email,
          password: registerForm.password,
          name: registerForm.email.split('@')[0],
          role: registerForm.role,
        },
      });

      // After successful registration, automatically log in the user
      const loginData = await apiClient('/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          username: registerForm.email,
          password: registerForm.password,
        }),
      });

      localStorage.setItem('token', loginData.access_token);

      const userData = await apiClient('/auth/me', {
        headers: { 'Authorization': `Bearer ${loginData.access_token}` },
      });

      login(userData);
      toast({
        title: "Registration successful",
        description: "Welcome to Optiya INSIGHT"
      });
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <img src="/logo.png" alt="Optiya INSIGHT Logo" className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Optiya INSIGHT
            </h1>
            <p className="text-gray-400 mt-2">
              Advanced Number Plate Recognition Platform
            </p>
          </div>
        </div>

        {/* Login/Register Card */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 shadow-2xl">
          <CardHeader className="space-y-1">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-black/50">
                <TabsTrigger value="login" className="data-[state=active]:bg-blue-600">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-blue-600">
                  Sign Up
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 mt-6">
                <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
                <CardDescription className="text-gray-300">
                  Enter your credentials to access your account
                </CardDescription>
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@optiya.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                      className="bg-black/50 border-white/30 text-white placeholder:text-gray-400 focus:border-blue-500 transition-all duration-200"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                        className="bg-black/50 border-white/30 text-white placeholder:text-gray-400 focus:border-blue-500 transition-all duration-200 pr-10"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remember" 
                        checked={rememberMe}
                        onCheckedChange={setRememberMe}
                        className="border-white/30"
                      />
                      <Label htmlFor="remember" className="text-sm text-gray-300">
                        Remember me
                      </Label>
                    </div>
                    <Button variant="link" className="px-0 text-blue-400 hover:text-blue-300">
                      Forgot password?
                    </Button>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4 mt-6">
                <CardTitle className="text-2xl text-white">Create account</CardTitle>
                <CardDescription className="text-gray-300">
                  Fill in the information below to create your account
                </CardDescription>
                
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-white">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="your@email.com"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                      className="bg-black/50 border-white/30 text-white placeholder:text-gray-400 focus:border-blue-500 transition-all duration-200"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-white">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                      className="bg-black/50 border-white/30 text-white placeholder:text-gray-400 focus:border-blue-500 transition-all duration-200"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-white">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                      className="bg-black/50 border-white/30 text-white placeholder:text-gray-400 focus:border-blue-500 transition-all duration-200"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-white">Role</Label>
                    <Select onValueChange={(value) => setRegisterForm({...registerForm, role: value})} required>
                      <SelectTrigger className="bg-black/50 border-white/30 text-white">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-white/30">
                        <SelectItem value="admin" className="text-white">Administrator</SelectItem>
                        <SelectItem value="operator" className="text-white">Operator</SelectItem>
                        <SelectItem value="viewer" className="text-white">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-blue-500/25"
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm">
          © 2024 Optiya INSIGHT. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
