import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const users = await prisma.user.findMany()
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const user = await prisma.user.create({
      data: {
        email,
        password,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (err) {
    console.error('Create user error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, email, password } = body
    if (!email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const user = await prisma.user.update({
      where: { id: id },
      data: {
        email: email,
        password: password,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (err) {
    console.error('Update user error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}