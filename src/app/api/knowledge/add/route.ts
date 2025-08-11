// import { splitTextIntoChunks } from '@/lib/split';
// import { NextResponse } from 'next/server';
// import { getEmbedding } from '@/lib/gemini';
// import { prisma } from '@/lib/prisma';

// export async function POST(req: Request) {
//     const { content, title } = await req.json();

//     if (!content || !title) {
//         return NextResponse.json({ error: 'Missing content or title' }, { status: 400 });
//     }

//     const chunks = splitTextIntoChunks(content);

//     const created = [];

//     for (const chunk of chunks) {
//         const botEmbedding = await getEmbedding(chunk).catch(() => []);

//         const record = await prisma.knowledge.create({
//             data: {
//                 title,
//                 content: chunk,
//                 embedding: botEmbedding,
//             },
//         });
//         created.push(record);
//     }

//     return NextResponse.json({ message: `${created.length} knowledge chunks added` });
// }

import { NextResponse } from 'next/server';
import { smartSplitWithGemini } from '@/lib/geminiChunker';
import { PrismaClient } from '@prisma/client';
import { getEmbedding } from '@/lib/gemini';

export const prisma = new PrismaClient();

export async function GET() {
    const knowledge = await prisma.knowledge.findMany()
    return NextResponse.json(knowledge)
}

export async function POST(req: Request) {
    const { content, title } = await req.json();

    if (!content || !title) {
        return NextResponse.json({ error: 'Missing content or title' }, { status: 400 });
    }

    let chunks;
    try {
        chunks = await smartSplitWithGemini(content);
    } catch (err) {
        console.error('Gemini chunking error:', err);
        return NextResponse.json({ error: 'Failed to split content using Gemini' }, { status: 500 });
    }

    const created = [];

    for (const { subTitle, content: chunkContent } of chunks) {
        // console.log('Chunk content:', chunkContent);
        const embedding = await getEmbedding(chunkContent).catch(() => []);

        const record = await prisma.knowledge.create({
            data: {
                // title,
                subTitle,
                content: chunkContent,
                embedding,
            },
        });

        created.push(record);
    }

    return NextResponse.json({ message: `${created.length} chunks added with subtitles.` });
}

export async function PUT(req: Request) {
    const { id, content, title, subTitle } = await req.json();

    if (!id || !content) {
        return NextResponse.json({ error: 'Thiếu id hoặc content' }, { status: 400 });
    }

    try {
        const embedding = await getEmbedding(content).catch(() => []);

        const updated = await prisma.knowledge.update({
            where: { id },
            data: {
                content,
                embedding,
                subTitle: subTitle ?? undefined,
                // Nếu bạn có title trong model, mở dòng này
                // title: title ?? undefined,
            },
        });

        return NextResponse.json({
            message: 'Đã cập nhật thành công.',
            updated,
        });
    } catch (err) {
        console.error('Lỗi khi update knowledge:', err);
        return NextResponse.json({ error: 'Cập nhật thất bại' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const { id } = await req.json();

    if (!id) {
        return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    }

    try {
        await prisma.knowledge.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Đã xóa thành công.' });
    } catch (err) {
        console.error('Lỗi khi xóa knowledge:', err);
        return NextResponse.json({ error: 'Xóa thất bại' }, { status: 500 });
    }
}