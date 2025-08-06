import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import cloudinary from '@/lib/cloudinary';
import { getMongoDb } from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    // Xác thực admin
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user || !user.userId) {
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }

    // Kiểm tra quyền admin
    const db = await getMongoDb();
    if (!db) {
      return NextResponse.json({ message: 'Không thể kết nối database' }, { status: 500 });
    }

    const admin = await db.collection('users').findOne({ _id: new ObjectId(user.userId) });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });
    }

    // Xử lý form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const userId = formData.get('userId') as string;

    if (!file) {
      return NextResponse.json({ message: 'Không tìm thấy file' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ message: 'Thiếu ID người dùng' }, { status: 400 });
    }

    // Xác thực loại tài liệu
    if (type !== 'cccd') {
      return NextResponse.json({ message: 'Loại tài liệu không hợp lệ' }, { status: 400 });
    }

    // Kiểm tra loại file
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Chỉ chấp nhận file ảnh' }, { status: 400 });
    }

    // Kiểm tra kích thước file (giới hạn 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: 'Kích thước file không được vượt quá 5MB' }, { status: 400 });
    }

    try {
      // Upload lên Cloudinary
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const publicId = `cccd/admin-${userId}-${Date.now()}`;

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'cccd',
            public_id: publicId,
            resource_type: 'image',
            overwrite: true,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });

      const fileUrl = (uploadResult as any).secure_url;

      return NextResponse.json({
        success: true,
        url: fileUrl,
        message: 'Tải lên thành công'
      });

    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ 
        success: false,
        message: 'Lỗi khi tải lên file' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Lỗi server' 
    }, { status: 500 });
  }
} 