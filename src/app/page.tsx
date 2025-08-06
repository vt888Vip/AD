"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Landing() {
  const router = useRouter();

  useEffect(() => {
    // Chuyển hướng ngay lập tức đến trang đăng nhập
    router.replace("/login");
  }, [router]);

  // Hiển thị loading trong khi chuyển hướng
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Đang chuyển hướng đến trang đăng nhập...</p>
      </div>
    </div>
  );
}