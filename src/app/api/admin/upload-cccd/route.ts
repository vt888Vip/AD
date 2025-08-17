import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    // Xác thực admin
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Bạn cần đăng nhập' }, { status: 401 });
    }

    const { userId, isValid } = await verifyToken(token);
    if (!isValid || !userId) {
      return NextResponse.json({ message: 'Token không hợp lệ' }, { status: 401 });
    }

    // Kiểm tra quyền admin
    const db = await getMongoDb();
    const admin = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ message: 'Không có quyền truy cập' }, { status: 403 });
    }

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const type = formData.get('type') as string;
    const targetUserId = formData.get('userId') as string;

    if (!image || !type || !targetUserId) {
      return NextResponse.json({ message: 'Thiếu thông tin cần thiết' }, { status: 400 });
    }

    // Validate file type
    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Chỉ chấp nhận file ảnh' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (image.size > 5 * 1024 * 1024) {
      return NextResponse.json({ message: 'File ảnh không được lớn hơn 5MB' }, { status: 400 });
    }

    // Validate type
    if (!['front', 'back'].includes(type)) {
      return NextResponse.json({ message: 'Loại ảnh không hợp lệ' }, { status: 400 });
    }

    // Kiểm tra user tồn tại
    const targetUser = await db.collection('users').findOne({ _id: new ObjectId(targetUserId) });
    if (!targetUser) {
      return NextResponse.json({ message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Tạo thư mục uploads nếu chưa tồn tại
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'cccd');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Tạo tên file unique
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = image.name.split('.').pop();
    const fileName = `cccd_${targetUserId}_${type}_${timestamp}_${randomString}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    // Convert file to buffer and save
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Tạo URL cho ảnh
    const imageUrl = `/uploads/cccd/${fileName}`;

    // Cập nhật thông tin CCCD trong database
    await db.collection('users').updateOne(
      { _id: new ObjectId(targetUserId) },
      { 
        $set: { 
          [`verification.cccd${type === 'front' ? 'Front' : 'Back'}`]: imageUrl,
          updatedAt: new Date()
        } 
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Upload ảnh thành công',
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('Error uploading CCCD image:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi upload ảnh' },
      { status: 500 }
    );
  }
} 