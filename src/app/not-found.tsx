import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="text-center text-white max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Shield className="h-12 w-12 text-blue-400" />
          <h1 className="text-4xl font-bold">404</h1>
        </div>
        
        <h2 className="text-2xl font-semibold mb-4">Trang không tồn tại</h2>
        
        <p className="text-gray-300 mb-8">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.
        </p>
        
        <div className="space-y-4">
          <Link href="/admin">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              <Home className="mr-2 h-4 w-4" />
              Về Admin Panel
            </Button>
          </Link>
          
          <Link href="/login">
            <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-800">
              <Shield className="mr-2 h-4 w-4" />
              Đăng nhập lại
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 