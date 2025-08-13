'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '../../../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Settings, 
  LogOut, 
  Plus,
  Eye,
  CreditCard,
  History,
  Banknote,
  Building,
  Trash2,
  Edit,
  Target,
  Search,
  X,
  Zap,
  TrendingDown,
  Key,
  Upload
} from 'lucide-react';
import UploadImage from '@/components/UploadImage';
import { useToast } from '@/components/ui/use-toast';

type TabType = 'dashboard' | 'users' | 'transactions' | 'deposits' | 'banks' | 'orders' | 'session-results' | 'predictions';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, isAdmin, logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    activeUsers: 0
  });
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [banks, setBanks] = useState([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  // Form states
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [newBank, setNewBank] = useState({
    name: '',
    accountNumber: '',
    accountHolder: '',
    branch: ''
  });
  
  // User management states
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  
  // Password reset states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Bank management states
  const [editingBank, setEditingBank] = useState<any>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showBankDeleteConfirm, setShowBankDeleteConfirm] = useState(false);
  const [bankToDelete, setBankToDelete] = useState<any>(null);

  // Session results states
  const [futureSessions, setFutureSessions] = useState<any[]>([]);
  const [loadingFuture, setLoadingFuture] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showSetResultDialog, setShowSetResultDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState<'UP' | 'DOWN'>('UP');

  // Search states
  const [searchName, setSearchName] = useState('');
  const [searchDateFrom, setSearchDateFrom] = useState('');
  // 1. Thêm state cho searchOrderDate
  const [searchOrderDate, setSearchOrderDate] = useState('');
  
  // Orders search and pagination states
  const [searchOrderUsername, setSearchOrderUsername] = useState('');
  const [searchOrderSessionId, setSearchOrderSessionId] = useState('');
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [ordersTotal, setOrdersTotal] = useState(0);

  // Kiểm tra quyền truy cập
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated()) {
        toast({
          title: 'Lỗi',
          description: 'Vui lòng đăng nhập để truy cập trang quản trị',
          variant: 'destructive',
        });
        router.push('/login');
        return;
      }

      if (!isAdmin()) {
        toast({
          title: 'Lỗi',
          description: 'Bạn không có quyền truy cập trang này',
          variant: 'destructive',
        });
        router.push('/');
        return;
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, router, toast]);

  // Load dữ liệu
  useEffect(() => {
    if (isAuthenticated() && isAdmin()) {
      loadData();
    }
  }, [isAuthenticated, isAdmin]);

  // Reload orders when search criteria change
  useEffect(() => {
    if (isAuthenticated() && isAdmin() && activeTab === 'orders') {
      loadOrders();
    }
  }, [searchOrderUsername, searchOrderSessionId, searchOrderDate, ordersPage, activeTab]);

  // Load future sessions when session-results tab is selected
  useEffect(() => {
    if (isAuthenticated() && isAdmin() && activeTab === 'session-results') {
      loadFutureSessions();
    }
  }, [activeTab]);

  // Auto-refresh future sessions every 2 minutes when on session-results tab
  useEffect(() => {
    if (isAuthenticated() && isAdmin() && activeTab === 'session-results') {
      const interval = setInterval(() => {
        loadFutureSessions();
      }, 120000); // Refresh every 2 minutes

      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const loadOrders = async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', ordersPage.toString());
      params.append('limit', '10');
      if (searchOrderUsername) params.append('username', searchOrderUsername);
      if (searchOrderSessionId) params.append('sessionId', searchOrderSessionId);
      if (searchOrderDate) {
        const date = new Date(searchOrderDate);
        params.append('startDate', date.toISOString());
        params.append('endDate', new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString());
      }

      const ordersResponse = await fetch(`/api/admin/orders?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        if (ordersData.success && ordersData.data) {
          setOrders(ordersData.data.orders || []);
          setOrdersTotalPages(ordersData.data.pagination.totalPages);
          setOrdersTotal(ordersData.data.pagination.total);
        } else {
          setOrders([]);
          setOrdersTotalPages(1);
          setOrdersTotal(0);
        }
      } else {
        setOrders([]);
        setOrdersTotalPages(1);
        setOrdersTotal(0);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
      setOrdersTotalPages(1);
      setOrdersTotal(0);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load stats
      console.log('📊 Loading admin stats...');
      const statsResponse = await fetch('/api/admin/stats', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('📊 Stats response status:', statsResponse.status);
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log('📊 Stats data received:', statsData);
        setStats(statsData);
      } else {
        console.error('❌ Failed to load stats:', statsResponse.status, statsResponse.statusText);
        const errorText = await statsResponse.text();
        console.error('❌ Error response:', errorText);
      }

      // Load users
      const usersResponse = await fetch('/api/admin/users', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      // Load transactions
      const transactionsResponse = await fetch('/api/admin/transactions', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.transactions || []);
      }

      // Load deposits
      const depositsResponse = await fetch('/api/admin/deposits', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (depositsResponse.ok) {
        const depositsData = await depositsResponse.json();
        setDeposits(depositsData.deposits || []);
      }

      // Load banks
      const banksResponse = await fetch('/api/admin/banks', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (banksResponse.ok) {
        const banksData = await banksResponse.json();
        setBanks(banksData.banks || []);
      }

      // Load initial orders
      if (activeTab === 'orders') {
        loadOrders();
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải dữ liệu',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Filter users based on search criteria
  const filteredUsers = users.filter((user: any) => {
    const nameMatch = searchName === '' || 
      user.username?.toLowerCase().includes(searchName.toLowerCase());
    
    const dateMatch = () => {
      if (!searchDateFrom) return true;
      
      const userDate = new Date(user.createdAt);
      const searchDate = new Date(searchDateFrom);
      
      return userDate.toDateString() === searchDate.toDateString();
    };
    
    return nameMatch && dateMatch();
  });

  const handleDeposit = async () => {
    if (!selectedUser || !depositAmount) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn người dùng và nhập số tiền',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: selectedUser._id,
          amount: parseFloat(depositAmount),
          note: depositNote
        })
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đã nạp tiền cho người dùng',
        });
        setDepositAmount('');
        setDepositNote('');
        setSelectedUser(null);
        loadData(); // Reload data
      } else {
        throw new Error('Failed to deposit');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể nạp tiền',
        variant: 'destructive',
      });
    }
  };

  const handleAddBank = async () => {
    if (!newBank.name || !newBank.accountNumber || !newBank.accountHolder) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin ngân hàng',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/banks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newBank)
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đã thêm ngân hàng mới',
        });
        setNewBank({ name: '', accountNumber: '', accountHolder: '', branch: '' });
        loadData(); // Reload data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add bank');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể thêm ngân hàng',
        variant: 'destructive',
      });
    }
  };

  const handleEditBank = (bank: any) => {
    setEditingBank({ ...bank });
    setShowBankModal(true);
  };

  const handleUpdateBank = async () => {
    if (!editingBank.name || !editingBank.accountNumber || !editingBank.accountHolder) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng điền đầy đủ thông tin ngân hàng',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/banks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editingBank)
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đã cập nhật ngân hàng',
        });
        setShowBankModal(false);
        setEditingBank(null);
        loadData(); // Reload data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update bank');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể cập nhật ngân hàng',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteBank = (bank: any) => {
    setBankToDelete(bank);
    setShowBankDeleteConfirm(true);
  };

  const confirmDeleteBank = async () => {
    if (!bankToDelete) return;

    try {
      const response = await fetch(`/api/admin/banks?id=${bankToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đã xóa ngân hàng',
        });
        setShowBankDeleteConfirm(false);
        setBankToDelete(null);
        loadData(); // Reload data
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete bank');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể xóa ngân hàng',
        variant: 'destructive',
      });
    }
  };

  const handleProcessDeposit = async (depositId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/admin/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          depositId,
          action,
          note: action === 'approve' ? 'Được duyệt bởi admin' : 'Bị từ chối bởi admin'
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Thành công',
          description: result.message,
        });
        loadData(); // Reload data to update the list
      } else {
        const error = await response.json();
        toast({
          title: 'Lỗi',
          description: error.message || 'Không thể xử lý yêu cầu nạp tiền',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error processing deposit:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xử lý yêu cầu nạp tiền',
        variant: 'destructive',
      });
    }
  };

  // User management functions
  const handleViewUser = (user: any) => {
    setEditingUser({ ...user });
    setShowUserModal(true);
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editingUser)
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đã cập nhật thông tin người dùng',
        });
        setShowUserModal(false);
        setEditingUser(null);
        loadData();
      } else {
        const error = await response.json();
        toast({
          title: 'Lỗi',
          description: error.message || 'Không thể cập nhật người dùng',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật người dùng',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = (user: any) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`/api/admin/users/${userToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: 'Đã xóa người dùng',
        });
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        loadData();
      } else {
        const error = await response.json();
        toast({
          title: 'Lỗi',
          description: error.message || 'Không thể xóa người dùng',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa người dùng',
        variant: 'destructive',
      });
    }
  };

  // Password reset functions
  const handleResetPassword = (user: any) => {
    console.log('🔍 Resetting password for user:', {
      username: user.username,
      id: user._id,
      idType: typeof user._id,
      idString: user._id?.toString()
    });
    setUserToResetPassword(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const confirmResetPassword = async () => {
    if (!userToResetPassword) return;

    // Validate password
    if (newPassword.length < 6) {
      toast({
        title: 'Lỗi',
        description: 'Mật khẩu phải có ít nhất 6 ký tự',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Lỗi',
        description: 'Mật khẩu xác nhận không khớp',
        variant: 'destructive',
      });
      return;
    }

    setIsResettingPassword(true);

    try {
      console.log('🚀 Making API call to reset password for user ID:', userToResetPassword._id);
      const response = await fetch(`/api/admin/users/${userToResetPassword._id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ newPassword })
      });

      if (response.ok) {
        toast({
          title: 'Thành công',
          description: `Đã đổi mật khẩu cho ${userToResetPassword.username}`,
        });
        setShowPasswordModal(false);
        setUserToResetPassword(null);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await response.json();
        toast({
          title: 'Lỗi',
          description: error.message || 'Không thể đổi mật khẩu',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể đổi mật khẩu',
        variant: 'destructive',
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Session Results Functions
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



  // Nút đặt kết quả cho 30 phiên - Random kết quả hàng loạt
  const handleSetResultsFor30Sessions = async () => {
    const activeSessions = futureSessions.filter(s => s.status === 'ACTIVE');
    if (activeSessions.length === 0) {
      toast({
        title: 'Thông báo',
        description: 'Không có phiên nào cần đặt kết quả',
      });
      return;
    }

    // Hiển thị thông báo xác nhận
    if (!confirm(`Bạn có chắc muốn đặt kết quả cho ${activeSessions.length} phiên giao dịch tương lai?\n\nKết quả sẽ được random với tỷ lệ 50% UP, 50% DOWN.`)) {
      return;
    }

    try {
      setLoadingFuture(true);
      const response = await fetch('/api/admin/session-results/future', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'bulk_random_results',
          sessionIds: activeSessions.map(s => s.sessionId)
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Thành công',
          description: `Đã đặt kết quả cho ${data.data.results.length} phiên giao dịch tương lai`,
        });
        loadFutureSessions();
      } else {
        toast({
          title: 'Lỗi',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error setting results for 30 sessions:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể đặt kết quả hàng loạt',
        variant: 'destructive',
      });
    } finally {
      setLoadingFuture(false);
    }
  };

  const handleSetResult = async () => {
    if (!selectedSession || !selectedResult) return;

    try {
      const response = await fetch('/api/admin/session-results/future', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'set_future_result',
          sessionId: selectedSession.sessionId,
          result: selectedResult
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Thành công',
          description: data.message,
        });
        setShowSetResultDialog(false);
        loadFutureSessions();
      } else {
        toast({
          title: 'Lỗi',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error setting result:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật kết quả',
        variant: 'destructive',
      });
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

  // Loading state
  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  // Không render nếu không có quyền
  if (!isAuthenticated() || !isAdmin()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Xin chào, {user?.username}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'dashboard'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="h-4 w-4 inline mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'users'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Quản lý người dùng
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-4 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'transactions'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <History className="h-4 w-4 inline mr-2" />
              Lịch sử giao dịch
            </button>
            <button
              onClick={() => setActiveTab('deposits')}
              className={`py-4 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'deposits'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Banknote className="h-4 w-4 inline mr-2" />
              Nạp tiền
            </button>
            <button
              onClick={() => setActiveTab('banks')}
              className={`py-4 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'banks'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Building className="h-4 w-4 inline mr-2" />
              Quản lý ngân hàng
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'orders'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <History className="h-4 w-4 inline mr-2" />
              Lệnh đặt
            </button>
            <button
              onClick={() => setActiveTab('session-results')}
              className={`py-4 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                activeTab === 'session-results'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Target className="h-4 w-4 inline mr-2" />
              Kết quả phiên giao dịch
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Tổng người dùng</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</p>
                      <p className="text-xs text-green-600 mt-1">+12% so với tháng trước</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Tổng nạp tiền</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalDeposits.toLocaleString()}</p>
                      <p className="text-xs text-green-600 mt-1">+8% so với tháng trước</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Tổng rút tiền</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalWithdrawals.toLocaleString()}</p>
                      <p className="text-xs text-red-600 mt-1">+5% so với tháng trước</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-red-500 to-red-600 rounded-xl">
                      <DollarSign className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Người dùng hoạt động</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.activeUsers.toLocaleString()}</p>
                      <p className="text-xs text-purple-600 mt-1">+15% so với tháng trước</p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                      <Settings className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle>Người dùng mới nhất</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead>Số dư</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.slice(0, 5).map((user: any) => (
                      <TableRow key={user._id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-bold text-green-600">
                              {user.balance?.available?.toLocaleString() || 0}đ
                            </div>
                            <div className="text-xs text-gray-500">
                              Đã nạp: {user.totalDeposited?.toLocaleString() || 0}đ
                            </div>
                            {user.totalWithdrawn > 0 && (
                              <div className="text-xs text-red-500">
                                Đã rút: {user.totalWithdrawn?.toLocaleString() || 0}đ
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status?.active ? 'default' : 'destructive'}>
                            {user.status?.active ? 'Hoạt động' : 'Khóa'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">Quản lý người dùng</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Quản lý và theo dõi tất cả người dùng trong hệ thống</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Search Filters */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Tìm kiếm người dùng</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="searchName" className="text-gray-700 font-medium">Tìm kiếm theo tên</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="searchName"
                        placeholder="Nhập tên người dùng..."
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="searchDateFrom" className="text-gray-700 font-medium">Ngày tạo giao dịch</Label>
                    <Input
                      id="searchDateFrom"
                      type="date"
                      value={searchDateFrom}
                      onChange={(e) => setSearchDateFrom(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchName('');
                      setSearchDateFrom('');
                    }}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Xóa bộ lọc
                  </Button>
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Tìm thấy {filteredUsers.length} người dùng
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableRow className="hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">Username</TableHead>
                      <TableHead className="font-semibold text-gray-700">Vai trò</TableHead>
                      <TableHead className="font-semibold text-gray-700">Số dư</TableHead>
                      <TableHead className="font-semibold text-gray-700">CCCD</TableHead>
                      <TableHead className="font-semibold text-gray-700">Ngân hàng</TableHead>
                      <TableHead className="font-semibold text-gray-700">Trạng thái</TableHead>
                      <TableHead className="font-semibold text-gray-700">Ngày tạo</TableHead>
                      <TableHead className="font-semibold text-gray-700">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: any) => (
                    <TableRow key={user._id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{user.username}</TableCell>
                      {/* Vai trò */}
                      <TableCell>
                        {user.role === 'admin' ? (
                          <span className="rounded-full px-2 py-1 text-[10px] font-semibold bg-purple-500 text-white whitespace-nowrap">Admin</span>
                        ) : (
                          <span className="rounded-full px-2 py-1 text-[10px] font-semibold bg-blue-500 text-white whitespace-nowrap">User</span>
                        )}
                      </TableCell>
                      {/* Số dư */}
                      <TableCell>
                        <div>
                          <div className="font-bold text-green-600 text-sm">
                            {user.balance?.available?.toLocaleString() || 0}đ
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Nạp: {user.totalDeposited?.toLocaleString() || 0}đ
                          </div>
                        </div>
                      </TableCell>
                      {/* CCCD */}
                      <TableCell>
                        {user.verification?.verified ? (
                          <span className="rounded-full px-2 py-1 text-[10px] font-semibold bg-green-500 text-white whitespace-nowrap">✓ Xác minh</span>
                        ) : (
                          <span className="rounded-full px-2 py-1 text-[10px] font-semibold bg-yellow-500 text-white whitespace-nowrap">⏳ Chờ</span>
                        )}
                      </TableCell>
                      {/* Ngân hàng */}
                      <TableCell>
                        {user.bank?.name ? (
                          <div className="bg-green-50 p-1 rounded border border-green-200">
                            <div className="font-medium text-green-800 text-xs">{user.bank.name}</div>
                            <div className="text-[10px] text-green-600 font-mono">{user.bank.accountNumber}</div>
                            <div className="text-[10px] text-green-500 truncate">{user.bank.accountHolder}</div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 p-1 rounded border border-gray-200">
                            <span className="text-gray-500 text-[10px]">Chưa cập nhật</span>
                          </div>
                        )}
                      </TableCell>
                      {/* Trạng thái tài khoản */}
                      <TableCell>
                        {user.status?.active ? (
                          <span className="rounded-full px-2 py-1 text-[10px] font-semibold bg-green-500 text-white whitespace-nowrap">✓ Hoạt động</span>
                        ) : (
                          <span className="rounded-full px-2 py-1 text-xs font-semibold bg-red-500 text-white whitespace-nowrap">🔒 Khóa</span>
                        )}
                      </TableCell>
                      {/* Ngày tạo */}
                      <TableCell>
                        <span className="text-xs text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </TableCell>
                      {/* Hành động */}
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewUser(user)}
                            className="hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleResetPassword(user)}
                            className="hover:bg-yellow-50 hover:text-yellow-600"
                            title="Đổi mật khẩu"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(user)}
                            disabled={user.role === 'admin'}
                            className="hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                </div>
            </CardContent>
          </Card>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử giao dịch</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Số tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction: any) => (
                    <TableRow key={transaction._id}>
                      <TableCell className="font-medium">{transaction.username}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.type === 'deposit' ? 'default' : 'secondary'}>
                          {transaction.type === 'deposit' ? 'Nạp tiền' : 'Rút tiền'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.amount.toLocaleString()}đ
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          transaction.type === 'deposit'
                            ? (transaction.status === 'completed' ? 'default' : 'destructive')
                            : transaction.status === 'Đã duyệt' ? 'default' : transaction.status === 'Từ chối' ? 'destructive' : 'secondary'
                        }>
                          {transaction.type === 'deposit'
                            ? (transaction.status === 'completed' ? 'Hoàn thành' : transaction.status === 'rejected' ? 'Từ chối' : 'Đang xử lý')
                            : transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.note || 'N/A'}</TableCell>
                      <TableCell>
                        {new Date(transaction.createdAt).toLocaleString('vi-VN')}
                      </TableCell>
                      <TableCell>
                        {(transaction.status === 'pending' || transaction.status === 'processing' || transaction.status === 'Đang xử lý' || transaction.status === 'Chờ duyệt') && (
                          <div className="flex gap-2">
                            <button
                              className="rounded-full px-3 py-1 text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition"
                              onClick={async () => {
                                if (transaction.type === 'withdrawal') {
                                  const withdrawalId = transaction.withdrawalId || (typeof transaction._id === 'string' ? transaction._id : transaction._id?.toString?.() || '');
                                  console.log('Duyệt rút tiền:', { withdrawalId, _id: transaction._id, raw: transaction });
                                  if (!withdrawalId || !withdrawalId.startsWith('RUT-')) {
                                    alert('Không tìm thấy withdrawalId hợp lệ để duyệt!');
                                    return;
                                  }
                                  const res = await fetch('/api/admin/withdrawals', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                                    },
                                    body: JSON.stringify({ withdrawalId, action: 'approve' })
                                  });
                                  if (!res.ok) {
                                    const data = await res.json();
                                    alert(data.message || 'Lỗi khi duyệt rút tiền!');
                                  }
                                  loadData();
                                } else {
                                  await fetch('/api/admin/transactions', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                                    },
                                    body: JSON.stringify({ transactionId: transaction._id, action: 'approve' })
                                  });
                                  loadData();
                                }
                              }}
                            >
                              Duyệt
                            </button>
                            <button
                              className="rounded-full px-3 py-1 text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition"
                              onClick={async () => {
                                if (transaction.type === 'withdrawal') {
                                  const withdrawalId = transaction.withdrawalId || (typeof transaction._id === 'string' ? transaction._id : transaction._id?.toString?.() || '');
                                  console.log('Từ chối rút tiền:', { withdrawalId, _id: transaction._id, raw: transaction });
                                  if (!withdrawalId || !withdrawalId.startsWith('RUT-')) {
                                    alert('Không tìm thấy withdrawalId hợp lệ để từ chối!');
                                    return;
                                  }
                                  const res = await fetch('/api/admin/withdrawals', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                                    },
                                    body: JSON.stringify({ withdrawalId, action: 'reject' })
                                  });
                                  if (!res.ok) {
                                    const data = await res.json();
                                    alert(data.message || 'Lỗi khi từ chối rút tiền!');
                                  }
                                  loadData();
                                } else {
                                  await fetch('/api/admin/transactions', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                                    },
                                    body: JSON.stringify({ transactionId: transaction._id, action: 'reject' })
                                  });
                                  loadData();
                                }
                              }}
                            >
                              Từ chối
                            </button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Deposits Tab */}
        {activeTab === 'deposits' && (
          <div className="space-y-6">
            {/* Manual Deposit Form */}
            <Card>
              <CardHeader>
                <CardTitle>Nạp tiền thủ công</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="user">Chọn người dùng</Label>
                                         <Select onValueChange={(value: string) => {
                       const user = users.find((u: any) => u._id === value);
                       setSelectedUser(user);
                     }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn người dùng" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user: any) => (
                          <SelectItem key={user._id} value={user._id}>
                            {user.username} - {user.balance?.available?.toLocaleString() || 0}đ (Đã nạp: {user.totalDeposited?.toLocaleString() || 0}đ)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="amount">Số tiền</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Nhập số tiền"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label htmlFor="note">Ghi chú</Label>
                  <Textarea
                    id="note"
                    placeholder="Ghi chú về giao dịch"
                    value={depositNote}
                    onChange={(e) => setDepositNote(e.target.value)}
                  />
                </div>
                <Button onClick={handleDeposit} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Nạp tiền
                </Button>
              </CardContent>
            </Card>

            {/* Deposit Requests */}
            <Card>
              <CardHeader>
                <CardTitle>Yêu cầu nạp tiền</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Người dùng</TableHead>
                      <TableHead>Số tiền</TableHead>
                      <TableHead>Ngân hàng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposits.map((deposit: any) => (
                      <TableRow key={deposit._id}>
                        <TableCell className="font-medium">{deposit.username}</TableCell>
                        <TableCell>{deposit.amount.toLocaleString()}đ</TableCell>
                        <TableCell>
                          {deposit.bankInfo?.name ? (
                            <div>
                              <div className="font-medium">{deposit.bankInfo.name}</div>
                              <div className="text-sm text-gray-500">{deposit.bankInfo.accountNumber}</div>
                            </div>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            deposit.status === 'CHO XU LY' ? 'secondary' : 
                            deposit.status === 'DA DUYET' ? 'default' : 
                            'destructive'
                          }>
                            {deposit.status === 'CHO XU LY' ? 'Chờ xử lý' : 
                             deposit.status === 'DA DUYET' ? 'Đã duyệt' : 
                             deposit.status === 'TU CHOI' ? 'Đã từ chối' : 
                             deposit.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(deposit.createdAt).toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell>
                          {deposit.status === 'CHO XU LY' && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => handleProcessDeposit(deposit._id, 'approve')}
                              >
                                Duyệt
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleProcessDeposit(deposit._id, 'reject')}
                              >
                                Từ chối
                              </Button>
                            </div>
                          )}
                          {deposit.status === 'DA DUYET' && (
                            <Badge variant="default">Đã duyệt</Badge>
                          )}
                          {deposit.status === 'TU CHOI' && (
                            <Badge variant="destructive">Đã từ chối</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Banks Tab */}
        {activeTab === 'banks' && (
          <div className="space-y-6">
            {/* Add Bank Form */}
            <Card>
              <CardHeader>
                <CardTitle>Thêm ngân hàng mới</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankName">Tên ngân hàng</Label>
                    <Input
                      id="bankName"
                      placeholder="VD: Vietcombank"
                      value={newBank.name}
                      onChange={(e) => setNewBank({...newBank, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountNumber">Số tài khoản</Label>
                    <Input
                      id="accountNumber"
                      placeholder="Số tài khoản"
                      value={newBank.accountNumber}
                      onChange={(e) => setNewBank({...newBank, accountNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountHolder">Chủ tài khoản</Label>
                    <Input
                      id="accountHolder"
                      placeholder="Tên chủ tài khoản"
                      value={newBank.accountHolder}
                      onChange={(e) => setNewBank({...newBank, accountHolder: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="branch">Chi nhánh</Label>
                    <Input
                      id="branch"
                      placeholder="Chi nhánh (tùy chọn)"
                      value={newBank.branch}
                      onChange={(e) => setNewBank({...newBank, branch: e.target.value})}
                    />
                  </div>
                </div>
                <Button onClick={handleAddBank} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm ngân hàng
                </Button>
              </CardContent>
            </Card>

            {/* Banks List */}
            <Card>
              <CardHeader>
                <CardTitle>Danh sách ngân hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên ngân hàng</TableHead>
                      <TableHead>Số tài khoản</TableHead>
                      <TableHead>Chủ tài khoản</TableHead>
                      <TableHead>Chi nhánh</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {banks.map((bank: any) => (
                      <TableRow key={bank._id}>
                        <TableCell className="font-medium">{bank.name}</TableCell>
                        <TableCell>{bank.accountNumber}</TableCell>
                        <TableCell>{bank.accountHolder}</TableCell>
                        <TableCell>{bank.branch || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={bank.status === 'active' ? 'default' : 'secondary'}>
                            {bank.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditBank(bank)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteBank(bank)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Predictions Tab */}
        {activeTab === 'predictions' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dự đoán phiên giao dịch</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Quản lý dự đoán phiên giao dịch</h3>
                  <p className="text-gray-600 mb-4">
                    Xem trước và quản lý kết quả của 30 phiên giao dịch tiếp theo
                  </p>
                  <Button 
                    onClick={() => router.push('/admin/predictions')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Mở trang dự đoán
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <History className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">Lịch sử lệnh đặt</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">Theo dõi toàn bộ lệnh đặt của người dùng</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4 space-y-4">
                {/* Search filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-gray-700 font-medium text-sm">Tên tài khoản:
                      <input
                        type="text"
                        placeholder="Nhập tên tài khoản..."
                        value={searchOrderUsername}
                        onChange={e => setSearchOrderUsername(e.target.value)}
                        className="ml-2 w-full border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="text-gray-700 font-medium text-sm">Phiên giao dịch:
                      <input
                        type="text"
                        placeholder="Nhập mã phiên..."
                        value={searchOrderSessionId}
                        onChange={e => setSearchOrderSessionId(e.target.value)}
                        className="ml-2 w-full border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="text-gray-700 font-medium text-sm">Ngày đặt lệnh:
                      <input
                        type="date"
                        value={searchOrderDate}
                        onChange={e => setSearchOrderDate(e.target.value)}
                        className="ml-2 w-full border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </label>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchOrderUsername('');
                        setSearchOrderSessionId('');
                        setSearchOrderDate('');
                        setOrdersPage(1);
                      }}
                      className="px-4 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                </div>
                
                {/* Results info */}
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Tìm thấy {ordersTotal} lệnh đặt
                  </div>
                  <div className="text-sm text-gray-600">
                    Trang {ordersPage} / {ordersTotalPages}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableRow className="hover:bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">Username</TableHead>
                      <TableHead className="font-semibold text-gray-700">Phiên</TableHead>
                      <TableHead className="font-semibold text-gray-700">Loại lệnh</TableHead>
                      <TableHead className="font-semibold text-gray-700">Số tiền</TableHead>
                      <TableHead className="font-semibold text-gray-700">Lợi nhuận</TableHead>
                      <TableHead className="font-semibold text-gray-700">Trạng thái</TableHead>
                      <TableHead className="font-semibold text-gray-700">Thời gian đặt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order: any, idx: number) => (
                      <TableRow key={order._id || idx} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{order.username}</TableCell>
                        <TableCell className="font-mono text-sm">{order.sessionId}</TableCell>
                        <TableCell>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.direction === 'UP' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                            {order.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-blue-700">{order.amount.toLocaleString()}đ</span>
                        </TableCell>
                        <TableCell>
                          {order.profit > 0 ? (
                            <span className="font-bold text-green-600">+{order.profit.toLocaleString()}đ</span>
                          ) : order.profit < 0 ? (
                            <span className="font-bold text-red-600">{order.profit.toLocaleString()}đ</span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {order.status === 'completed' && order.result === 'win' && (
                            <span className="rounded-full px-3 py-1 text-xs font-semibold bg-green-500 text-white">Thắng</span>
                          )}
                          {order.status === 'completed' && order.result === 'lose' && (
                            <span className="rounded-full px-3 py-1 text-xs font-semibold bg-red-500 text-white">Thua</span>
                          )}
                          {order.status === 'pending' && (
                            <span className="rounded-full px-3 py-1 text-xs font-semibold bg-yellow-500 text-white">Đang xử lý</span>
                          )}
                          {order.status === 'completed' && !order.result && (
                            <span className="rounded-full px-3 py-1 text-xs font-semibold bg-gray-500 text-white">Hoàn thành</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(order.createdAt).toLocaleString('vi-VN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {ordersTotalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOrdersPage(Math.max(1, ordersPage - 1))}
                      disabled={ordersPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Trước
                    </button>
                    
                    {Array.from({ length: Math.min(5, ordersTotalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(ordersTotalPages - 4, ordersPage - 2)) + i;
                      if (pageNum > ordersTotalPages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setOrdersPage(pageNum)}
                          className={`px-3 py-1 border rounded text-sm ${
                            pageNum === ordersPage
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => setOrdersPage(Math.min(ordersTotalPages, ordersPage + 1))}
                      disabled={ordersPage === ordersTotalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Session Results Management */}
        {activeTab === 'session-results' && (
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
        )}

        {/* Password Reset Modal */}
        <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-yellow-600" />
                Đổi mật khẩu người dùng
              </DialogTitle>
              <DialogDescription>
                Đổi mật khẩu cho {userToResetPassword?.username}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword">Mật khẩu mới</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Nhập mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isResettingPassword}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isResettingPassword}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPasswordModal(false)}
                disabled={isResettingPassword}
              >
                Hủy
              </Button>
              <Button
                onClick={confirmResetPassword}
                disabled={isResettingPassword || !newPassword || !confirmPassword}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                {isResettingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang đổi mật khẩu...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Đổi mật khẩu
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation Modal */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Xác nhận xóa người dùng
              </DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa người dùng <strong>{userToDelete?.username}</strong>? Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Hủy
              </Button>
              <Button
                onClick={confirmDeleteUser}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa người dùng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User View/Edit Modal */}
        <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                {editingUser ? `Thông tin người dùng: ${editingUser.username}` : 'Xem thông tin người dùng'}
              </DialogTitle>
              <DialogDescription>
                Xem và chỉnh sửa thông tin chi tiết của người dùng
              </DialogDescription>
            </DialogHeader>
            
            {editingUser && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Tên đăng nhập</Label>
                    <Input
                      id="username"
                      value={editingUser.username || ''}
                      onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                      placeholder="Tên đăng nhập"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editingUser.email || ''}
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                      placeholder="Email"
                    />
                  </div>
                </div>

                {/* Role and Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role">Vai trò</Label>
                    <Select
                      value={editingUser.role || 'user'}
                      onValueChange={(value) => setEditingUser({...editingUser, role: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn vai trò" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Người dùng</SelectItem>
                        <SelectItem value="admin">Quản trị viên</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Trạng thái tài khoản</Label>
                    <Select
                      value={editingUser.status?.active ? 'active' : 'inactive'}
                      onValueChange={(value) => setEditingUser({
                        ...editingUser, 
                        status: {...editingUser.status, active: value === 'active'}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Hoạt động</SelectItem>
                        <SelectItem value="inactive">Bị khóa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Balance Information */}
                <div>
                  <Label htmlFor="availableBalance">Số dư khả dụng (VNĐ)</Label>
                  <Input
                    id="availableBalance"
                    type="text"
                    value={editingUser.balance?.available || 0}
                    onChange={(e) => {
                      // Lấy giá trị từ input và loại bỏ tất cả ký tự không phải số
                      const rawValue = e.target.value.replace(/[^0-9]/g, '');
                      
                      // Chuyển đổi thành số
                      const numberValue = rawValue ? parseInt(rawValue, 10) : 0;
                      
                      // Cập nhật state với giá trị số
                      setEditingUser({
                        ...editingUser, 
                        balance: {...editingUser.balance, available: numberValue}
                      });
                    }}
                    onKeyPress={(e) => {
                      // Chỉ cho phép số và các phím điều hướng
                      const allowedKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
                      if (!allowedKeys.includes(e.key) && !/^[0-9]$/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    placeholder="0"
                    className="font-mono"
                    inputMode="numeric"
                    autoComplete="off"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Nhập số tiền (chỉ số, không cần dấu phẩy)
                  </p>
                </div>

                {/* Bank Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Thông tin ngân hàng</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bankName">Tên ngân hàng</Label>
                      <Input
                        id="bankName"
                        value={editingUser.bank?.name || ''}
                        onChange={(e) => setEditingUser({
                          ...editingUser, 
                          bank: {...editingUser.bank, name: e.target.value}
                        })}
                        placeholder="Tên ngân hàng"
                      />
                    </div>
                    <div>
                      <Label htmlFor="accountNumber">Số tài khoản</Label>
                      <Input
                        id="accountNumber"
                        value={editingUser.bank?.accountNumber || ''}
                        onChange={(e) => setEditingUser({
                          ...editingUser, 
                          bank: {...editingUser.bank, accountNumber: e.target.value}
                        })}
                        placeholder="Số tài khoản"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="accountHolder">Chủ tài khoản</Label>
                      <Input
                        id="accountHolder"
                        value={editingUser.bank?.accountHolder || ''}
                        onChange={(e) => setEditingUser({
                          ...editingUser, 
                          bank: {...editingUser.bank, accountHolder: e.target.value}
                        })}
                        placeholder="Tên chủ tài khoản"
                      />
                    </div>
                  </div>
                </div>

                {/* CCCD Images */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">Hình ảnh CCCD/CMND</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* CCCD Front */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <Label className="text-sm font-medium text-gray-700">Mặt trước CCCD</Label>
                      </div>
                      <div className="relative group">
                        {editingUser.verification?.cccdFront ? (
                          <div className="relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl">
                            <img
                              src={editingUser.verification.cccdFront}
                              alt="CCCD Mặt trước"
                              className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => window.open(editingUser.verification.cccdFront, '_blank')}
                                  className="bg-white/90 backdrop-blur-sm text-gray-800 hover:bg-white transition-all duration-200 shadow-lg"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Xem
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm('Bạn có chắc muốn xóa hình mặt trước CCCD?')) {
                                      setEditingUser({
                                        ...editingUser,
                                        verification: {
                                          ...editingUser.verification,
                                          cccdFront: ''
                                        }
                                      });
                                    }
                                  }}
                                  className="bg-red-500/90 backdrop-blur-sm hover:bg-red-600 transition-all duration-200 shadow-lg"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Xóa
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-56 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 transition-all duration-300 hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100">
                            <div className="text-center text-gray-500">
                              <div className="p-3 bg-gray-200 rounded-full w-fit mx-auto mb-3">
                                <CreditCard className="h-6 w-6" />
                              </div>
                              <p className="text-sm font-medium">Chưa có hình mặt trước</p>
                              <p className="text-xs text-gray-400 mt-1">Tải lên để xem</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CCCD Back */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <Label className="text-sm font-medium text-gray-700">Mặt sau CCCD</Label>
                      </div>
                      <div className="relative group">
                        {editingUser.verification?.cccdBack ? (
                          <div className="relative overflow-hidden rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl">
                            <img
                              src={editingUser.verification.cccdBack}
                              alt="CCCD Mặt sau"
                              className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => window.open(editingUser.verification.cccdBack, '_blank')}
                                  className="bg-white/90 backdrop-blur-sm text-gray-800 hover:bg-white transition-all duration-200 shadow-lg"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Xem
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm('Bạn có chắc muốn xóa hình mặt sau CCCD?')) {
                                      setEditingUser({
                                        ...editingUser,
                                        verification: {
                                          ...editingUser.verification,
                                          cccdBack: ''
                                        }
                                      });
                                    }
                                  }}
                                  className="bg-red-500/90 backdrop-blur-sm hover:bg-red-600 transition-all duration-200 shadow-lg"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Xóa
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-56 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 transition-all duration-300 hover:border-green-300 hover:bg-gradient-to-br hover:from-green-50 hover:to-green-100">
                            <div className="text-center text-gray-500">
                              <div className="p-3 bg-gray-200 rounded-full w-fit mx-auto mb-3">
                                <CreditCard className="h-6 w-6" />
                              </div>
                              <p className="text-sm font-medium">Chưa có hình mặt sau</p>
                              <p className="text-xs text-gray-400 mt-1">Tải lên để xem</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Upload New CCCD Images */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Upload className="h-5 w-5 text-green-600" />
                      </div>
                      <h4 className="text-lg font-medium text-gray-800">Tải lên hình CCCD mới</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="cccdFrontUpload" className="text-sm font-medium text-gray-700">
                          Tải lên mặt trước CCCD
                        </Label>
                        <div className="relative">
                          <Input
                            id="cccdFrontUpload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Set loading state
                                const uploadButton = document.getElementById('cccdFrontUploadBtn');
                                const originalText = uploadButton?.textContent;
                                if (uploadButton) {
                                  uploadButton.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div> Đang tải lên...';
                                  uploadButton.setAttribute('disabled', 'true');
                                }

                                try {
                                  const formData = new FormData();
                                  formData.append('file', file);
                                  formData.append('type', 'cccd');
                                  formData.append('userId', editingUser._id);
                                  
                                  const response = await fetch('/api/admin/upload-cccd', {
                                    method: 'POST',
                                    headers: {
                                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                                    },
                                    body: formData
                                  });
                                  
                                  if (response.ok) {
                                    const result = await response.json();
                                    if (result.success) {
                                      setEditingUser({
                                        ...editingUser,
                                        verification: {
                                          ...editingUser.verification,
                                          cccdFront: result.url
                                        }
                                      });
                                      toast({
                                        title: '✅ Thành công',
                                        description: 'Đã tải lên hình mặt trước CCCD',
                                      });
                                    } else {
                                      toast({
                                        title: '❌ Lỗi',
                                        description: result.message || 'Không thể tải lên hình ảnh',
                                        variant: 'destructive',
                                      });
                                    }
                                  } else {
                                    toast({
                                      title: '❌ Lỗi',
                                      description: 'Không thể tải lên hình ảnh',
                                      variant: 'destructive',
                                    });
                                  }
                                } catch (error) {
                                  toast({
                                    title: '❌ Lỗi',
                                    description: 'Có lỗi xảy ra khi tải lên',
                                    variant: 'destructive',
                                  });
                                } finally {
                                  // Reset button state
                                  if (uploadButton) {
                                    uploadButton.innerHTML = originalText || 'Chọn file';
                                    uploadButton.removeAttribute('disabled');
                                  }
                                  // Reset input
                                  e.target.value = '';
                                }
                              }
                            }}
                          />
                          <label
                            htmlFor="cccdFrontUpload"
                            id="cccdFrontUploadBtn"
                            className="flex items-center justify-center gap-2 w-full h-12 px-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all duration-200 cursor-pointer group"
                          >
                            <Upload className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                            <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
                              Chọn file mặt trước
                            </span>
                          </label>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor="cccdBackUpload" className="text-sm font-medium text-gray-700">
                          Tải lên mặt sau CCCD
                        </Label>
                        <div className="relative">
                          <Input
                            id="cccdBackUpload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Set loading state
                                const uploadButton = document.getElementById('cccdBackUploadBtn');
                                const originalText = uploadButton?.textContent;
                                if (uploadButton) {
                                  uploadButton.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div> Đang tải lên...';
                                  uploadButton.setAttribute('disabled', 'true');
                                }

                                try {
                                  const formData = new FormData();
                                  formData.append('file', file);
                                  formData.append('type', 'cccd');
                                  formData.append('userId', editingUser._id);
                                  
                                  const response = await fetch('/api/admin/upload-cccd', {
                                    method: 'POST',
                                    headers: {
                                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                                    },
                                    body: formData
                                  });
                                  
                                  if (response.ok) {
                                    const result = await response.json();
                                    if (result.success) {
                                      setEditingUser({
                                        ...editingUser,
                                        verification: {
                                          ...editingUser.verification,
                                          cccdBack: result.url
                                        }
                                      });
                                      toast({
                                        title: '✅ Thành công',
                                        description: 'Đã tải lên hình mặt sau CCCD',
                                      });
                                    } else {
                                      toast({
                                        title: '❌ Lỗi',
                                        description: result.message || 'Không thể tải lên hình ảnh',
                                        variant: 'destructive',
                                      });
                                    }
                                  } else {
                                    toast({
                                      title: '❌ Lỗi',
                                      description: 'Không thể tải lên hình ảnh',
                                      variant: 'destructive',
                                    });
                                  }
                                } catch (error) {
                                  toast({
                                    title: '❌ Lỗi',
                                    description: 'Có lỗi xảy ra khi tải lên',
                                    variant: 'destructive',
                                  });
                                } finally {
                                  // Reset button state
                                  if (uploadButton) {
                                    uploadButton.innerHTML = originalText || 'Chọn file';
                                    uploadButton.removeAttribute('disabled');
                                  }
                                  // Reset input
                                  e.target.value = '';
                                }
                              }
                            }}
                          />
                          <label
                            htmlFor="cccdBackUpload"
                            id="cccdBackUploadBtn"
                            className="flex items-center justify-center gap-2 w-full h-12 px-4 border-2 border-dashed border-green-300 rounded-lg bg-green-50 hover:bg-green-100 transition-all duration-200 cursor-pointer group"
                          >
                            <Upload className="h-4 w-4 text-green-600 group-hover:text-green-700" />
                            <span className="text-sm font-medium text-green-600 group-hover:text-green-700">
                              Chọn file mặt sau
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Trạng thái xác minh</h3>
                  <div>
                    <Label htmlFor="verificationStatus">Trạng thái xác minh</Label>
                    <Select
                      value={editingUser.verification?.verified ? 'verified' : 'pending'}
                      onValueChange={(value) => setEditingUser({
                        ...editingUser, 
                        verification: {...editingUser.verification, verified: value === 'verified'}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="verified">Đã xác minh</SelectItem>
                        <SelectItem value="pending">Đang xác minh</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Thông tin bổ sung</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="createdAt">Ngày tạo tài khoản</Label>
                      <Input
                        id="createdAt"
                        value={editingUser.createdAt ? new Date(editingUser.createdAt).toLocaleString('vi-VN') : 'N/A'}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastLogin">Lần đăng nhập cuối</Label>
                      <Input
                        id="lastLogin"
                        value={editingUser.lastLogin ? new Date(editingUser.lastLogin).toLocaleString('vi-VN') : 'N/A'}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                }}
              >
                Hủy
              </Button>
              <Button
                onClick={handleEditUser}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="mr-2 h-4 w-4" />
                Cập nhật thông tin
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bank Edit Modal */}
        <Dialog open={showBankModal} onOpenChange={setShowBankModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                {editingBank ? 'Chỉnh sửa ngân hàng' : 'Thêm ngân hàng mới'}
              </DialogTitle>
              <DialogDescription>
                {editingBank ? 'Chỉnh sửa thông tin ngân hàng' : 'Thêm thông tin ngân hàng mới'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editBankName">Tên ngân hàng</Label>
                <Input
                  id="editBankName"
                  placeholder="VD: Vietcombank"
                  value={editingBank?.name || ''}
                  onChange={(e) => setEditingBank({...editingBank, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="editAccountNumber">Số tài khoản</Label>
                <Input
                  id="editAccountNumber"
                  placeholder="Số tài khoản"
                  value={editingBank?.accountNumber || ''}
                  onChange={(e) => setEditingBank({...editingBank, accountNumber: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="editAccountHolder">Chủ tài khoản</Label>
                <Input
                  id="editAccountHolder"
                  placeholder="Tên chủ tài khoản"
                  value={editingBank?.accountHolder || ''}
                  onChange={(e) => setEditingBank({...editingBank, accountHolder: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="editBranch">Chi nhánh</Label>
                <Input
                  id="editBranch"
                  placeholder="Chi nhánh (tùy chọn)"
                  value={editingBank?.branch || ''}
                  onChange={(e) => setEditingBank({...editingBank, branch: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowBankModal(false);
                  setEditingBank(null);
                }}
              >
                Hủy
              </Button>
              <Button
                onClick={handleUpdateBank}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="mr-2 h-4 w-4" />
                {editingBank ? 'Cập nhật' : 'Thêm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bank Delete Confirmation Modal */}
        <Dialog open={showBankDeleteConfirm} onOpenChange={setShowBankDeleteConfirm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Xác nhận xóa ngân hàng
              </DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa ngân hàng <strong>{bankToDelete?.name}</strong>? Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowBankDeleteConfirm(false)}
              >
                Hủy
              </Button>
              <Button
                onClick={confirmDeleteBank}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa ngân hàng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

