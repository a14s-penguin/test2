import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import jwt, { Secret, SignOptions } from 'jsonwebtoken'

export async function POST(req: Request) {
    const { email, password } = await req.json()

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return NextResponse.json({ message: 'Sai email hoặc mật khẩu' }, { status: 401 })
    }

    const secret: Secret = process.env.JWT_SECRET || "fallback_secret";

    const accessToken = jwt.sign(
        { id: user.id, email: user.email },
        secret,
        {
            expiresIn: (process.env.JWT_EXPIRES_IN || "15m") as SignOptions["expiresIn"],
        }
    );
    console.log("accessToken", accessToken);

    const refreshSecret: Secret =
        process.env.JWT_REFRESH_SECRET || "fallback_refresh_secret";

    const refreshToken = jwt.sign(
        { id: user.id },
        refreshSecret,
        {
            expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions["expiresIn"],
        }
    );

    const res = NextResponse.json({ success: true, user: user })
    res.cookies.set('token', accessToken, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 15,
    })
    res.cookies.set('refreshToken', refreshToken, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
    })

    return res
}
