'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Target, 
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function SessionResultsManagement() {
  const { toast } = useToast();
  const [futureSessions, setFutureSessions] = useState<any[]>([]);
  const [loadingFuture, setLoadingFuture] = useState(false);

  useEffect(() => {
    loadFutureSessions();
    
    // Auto-refresh future sessions every 2 minutes
    const interval = setInterval(() => {
      loadFutureSessions();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, []);

  const loadFutureSessions = async () => {
    try {
      setLoadingFuture(true);
      const response = await fetch('/api/admin/session-results/future', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFutureSessions(data.data.sessions);
        } else {
          setFutureSessions([]);
        }
      } else {
        setFutureSessions([]);
      }
    } catch (error) {
      console.error('Error loading future sessions:', error);
      setFutureSessions([]);
    } finally {
      setLoadingFuture(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Đang hoạt động</Badge>;
      case 'PREDICTED':
        return <Badge className="bg-yellow-100 text-yellow-800">Đã dự đoán</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-blue-100 text-blue-800">Đã hoàn thành</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getResultBadge = (result?: string) => {
    if (!result) return <Badge variant="outline">Chưa có</Badge>;
    return result === 'UP' 
      ? <Badge className="bg-green-100 text-green-800 flex items-center gap-1"><TrendingUp className="w-3 h-3" />LÊN</Badge>
      : <Badge className="bg-red-100 text-red-800 flex items-center gap-1"><TrendingDown className="w-3 h-3" />XUỐNG</Badge>;
  };

  const getCreatedByBadge = (createdBy?: string) => {
    if (!createdBy) return <Badge variant="outline">Hệ thống</Badge>;
    return createdBy === 'admin' 
      ? <Badge className="bg-purple-100 text-purple-800">Admin</Badge>
      : <Badge className="bg-gray-100 text-gray-800">Hệ thống</Badge>;
  };

  const getTimeUntilStart = (startTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const diff = start.getTime() - now.getTime();
    
    if (diff <= 0) return 'Đã bắt đầu';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} ngày ${hours % 24} giờ`;
    if (hours > 0) return `${hours} giờ ${minutes % 60} phút`;
    return `${minutes} phút`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Xem 30 phiên giao dịch tương lai</h1>
          <p className="text-gray-600 mt-2">Hệ thống tự động duy trì 30 phiên tương lai với kết quả sẵn (đã được tối ưu hóa)</p>
        </div>
      </div>

      {/* Future Sessions Section */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Target className="h-5 w-5" />
            30 phiên giao dịch tương lai (Tự động duy trì)
          </CardTitle>
          <CardDescription className="text-green-700">
            Hệ thống tự động duy trì 30 phiên tương lai với kết quả sẵn, không cần thao tác thủ công
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Future Sessions Table */}
          {loadingFuture ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-2 text-green-700">Đang tải 30 phiên tương lai...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-green-50">
                    <TableHead className="text-green-800">Mã phiên</TableHead>
                    <TableHead className="text-green-800">Thời gian bắt đầu</TableHead>
                    <TableHead className="text-green-800">Thời gian kết thúc</TableHead>
                    <TableHead className="text-green-800">Còn lại</TableHead>
                    <TableHead className="text-green-800">Trạng thái</TableHead>
                    <TableHead className="text-green-800">Kết quả</TableHead>
                    <TableHead className="text-green-800">Người tạo</TableHead>
                    <TableHead className="text-green-800">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {futureSessions.map((session) => (
                    <TableRow key={session._id} className="hover:bg-green-50">
                      <TableCell className="font-mono text-sm font-semibold">{session.sessionId}</TableCell>
                      <TableCell>{new Date(session.startTime).toLocaleString('vi-VN')}</TableCell>
                      <TableCell>{new Date(session.endTime).toLocaleString('vi-VN')}</TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-blue-600">
                          {getTimeUntilStart(session.startTime)}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                      <TableCell>{getResultBadge(session.result)}</TableCell>
                      <TableCell>{getCreatedByBadge(session.createdBy)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {session.status === 'ACTIVE' && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                              Sẵn sàng
                            </Badge>
                          )}
                          {session.status === 'COMPLETED' && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                              Đã hoàn thành
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Future Sessions Info */}
          <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">Thông tin hệ thống tự động (Đã tối ưu hóa):</h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• <strong>Tự động duy trì:</strong> Hệ thống luôn đảm bảo có đúng 30 phiên tương lai</li>
              <li>• <strong>Tự động tạo kết quả:</strong> Mỗi phiên mới được tạo với kết quả sẵn (50% UP, 50% DOWN)</li>
              <li>• <strong>Tối ưu hóa hiệu suất:</strong> Phiên mới được tạo sau khi người dùng lấy kết quả</li>
              <li>• <strong>Không cần thao tác:</strong> Admin chỉ cần xem, không cần đặt kết quả thủ công</li>
              <li>• <strong>Thời gian thực:</strong> Hiển thị thời gian còn lại đến khi phiên bắt đầu</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
