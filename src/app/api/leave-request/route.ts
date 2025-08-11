// app/api/leave-request/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        // Check if the request is a POST request
        const body = await req.json()
        const { date, name, reason } = body

        if (!date || !name || !reason) {
            return NextResponse.json({ error: 'Missing required fields: date, name, reason' }, { status: 400 })
        }

        const leave = await prisma.leave.create({
            data: {
                date: new Date(date),
                name,
                reason,
            },
        })

        return NextResponse.json({
            success: true,
            message: 'Đơn nghỉ phép đã được gửi! Người nghỉ: ' + name + ', Ngày nghỉ: ' + date + ', Lý do: ' + reason,
            data: leave,
        })

    } catch (error) {
        console.error('Error processing request:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function GET(req: Request) {
    try {
        // Check if the request is a GET request
        const url = new URL(req.url)
        const name = url.searchParams.get('name')

        if (!name) {
            return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
        }

        const leaveRequests = await prisma.leave.findMany({
            where: { name },
            orderBy: { date: 'desc' },
        })

        return NextResponse.json({
            success: true,
            data: leaveRequests,
        })

    } catch (error) {
        console.error('Error processing request:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const body = await req.json()
        const { name, date } = body;
        if (!name || !date) {
            return NextResponse.json({ error: 'Missing required fields: name, date' }, { status: 400 })
        }
        const leaveRequest = await prisma.leave.deleteMany({
            where: {
                name,
                date: new Date(date),
            },
        })
        if (leaveRequest.count === 0) {
            return NextResponse.json({ error: 'No leave request found for the given name and date' }, { status: 404 })
        }
        return NextResponse.json({
            success: true,
            message: 'Đơn nghỉ phép đã được xóa! Người nghỉ: ' + name + ', Ngày nghỉ: ' + date,
        })
    }
    catch (error) {
        console.error('Error processing request:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}