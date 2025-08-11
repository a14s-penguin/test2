import { getEmbedding } from './gemini';
import { prisma } from './prisma';

export const saveMessageWithEmbedding = async (
    role: 'user' | 'system' | 'assistant',
    content: string,
    sessionId = 'default-session'
) => {
    console.log('🟢 saveMessageWithEmbedding bắt đầu:', role);
    const embedding =
        role === 'user' || role === 'system'
            ? await getEmbedding(content)
            : [];

    console.log('📌 Vai trò:', role);
    console.log('📌 Content:', content.slice(0, 50));
    console.log('📌 Độ dài embedding:', embedding.length);

    await prisma.message.create({
        data: {
            role,
            content,
            embedding,
            sessionId,
        },
    });
};
