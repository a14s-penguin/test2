import { prisma } from './prisma';
import { getEmbedding } from './gemini';

export async function saveMessage(role: string, content: string, sessionId: string) {
    const embedding = await getEmbedding(content);

    const message = await prisma.message.create({
        data: {
            role,
            content,
            sessionId,
            embedding,
            createdAt: new Date(),
        },
    });

    return message;
}
