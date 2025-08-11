// lib/mongodb.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
    throw new Error('⚠️ Bạn cần đặt MONGODB_URI trong .env');
}

let isConnected = false;

export async function connectMongo() {
    if (isConnected) return;

    try {
        await mongoose.connect(MONGODB_URI);
        isConnected = true;
        console.log('✅ Đã kết nối MongoDB');
    } catch (error) {
        console.error('❌ Lỗi kết nối MongoDB:', error);
    }
}
