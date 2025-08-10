'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, Shield } from 'lucide-react';

import '@/lib/ensure-react';

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const router = useRouter();
  const { login, isAuthenticated, isAdmin, logout } = useAuth();

  // Redirect if already authenticated as admin
  useEffect(() => {
    if (isAuthenticated() && isAdmin() && !isLoading && !isRedirecting) {
      router.push("/admin");
    }
  }, [isAuthenticated, isAdmin, router, isLoading, isRedirecting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    if (!username.trim()) {
      setError("Vui lòng nhập tên đăng nhập");
      setIsLoading(false);
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu");
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(username.trim(), password);

      if (result?.success) {
        
        // Thay vì dựa vào state, kiểm tra trực tiếp từ API
        try {
          const token = localStorage.getItem('token');
          
          if (token) {
            const meResponse = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache'
              }
            });
            
            if (meResponse.ok) {
              const meData = await meResponse.json();
              
              // Kiểm tra trực tiếp từ API response
              if (meData?.success && meData.user?.role === 'admin') {
                
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('loginTimestamp', Date.now().toString());

                setSuccessMessage("🎉 Đăng nhập thành công! Đang chuyển hướng đến Admin Panel...");
                setIsRedirecting(true);
                setIsLoading(false);

                setTimeout(() => {
                  router.replace('/admin');
                }, 800);
                return;
              } else {
                await logout();
                setError("⛔ Chỉ admin mới được phép truy cập hệ thống này.");
                setIsLoading(false);
                return;
              }
            } else {
              setError("Không thể xác minh quyền truy cập. Vui lòng thử lại.");
              setIsLoading(false);
              return;
            }
          } else {
            setError("Lỗi xác thực. Vui lòng thử lại.");
            setIsLoading(false);
            return;
          }
        } catch (apiError) {
          setError("Lỗi xác minh quyền admin. Vui lòng thử lại.");
          setIsLoading(false);
          return;
        }
      } else {
        setError(result?.message || "Đăng nhập thất bại. Vui lòng thử lại.");
        setIsLoading(false);
      }
    } catch (err) { 
      setError("Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại sau.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-2">
      <Card className="w-full max-w-md sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl relative z-10 bg-white/95 backdrop-blur-sm border-0 shadow-2xl flex flex-col items-center p-0">
        {/* Logo */}
        <div className="w-full h-28 sm:h-24 md:h-32 rounded-t-xl overflow-hidden flex items-center justify-center bg-gray-200">
          <img
            src="/logo-london.jpg"
            alt="Banner"
            className="w-full h-full object-cover"
            style={{ minHeight: 80, maxHeight: 140 }}
          />
        </div>

        <CardHeader className="space-y-1 w-full px-4 pt-4 pb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-xl md:text-2xl font-bold text-center">Admin Panel</CardTitle>
          </div>
          <CardDescription className="text-center text-sm md:text-base">
            Đăng nhập với tài khoản Admin để truy cập hệ thống quản lý
          </CardDescription>
        </CardHeader>

        <CardContent className="w-full px-4 pb-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="flex items-center">{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <AlertDescription className="flex items-center text-green-800">
                {successMessage}
                <Loader2 className="ml-2 h-4 w-4 animate-spin inline-block" />
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập Admin</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                placeholder="Nhập tên đăng nhập admin"
                disabled={isLoading || isRedirecting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Nhập mật khẩu"
                  disabled={isLoading || isRedirecting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || isRedirecting}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading || isRedirecting}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xác thực...
                </>
              ) : isRedirecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang chuyển hướng...
                </>
              ) : (
                "Đăng nhập Admin"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-gray-600">⚠️ Chỉ tài khoản Admin mới được phép truy cập</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
