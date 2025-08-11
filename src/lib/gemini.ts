// src/lib/gemini.ts

const API_KEY = process.env.GEMINI_API_KEY;
const API_URL = 'https://gemini.googleapis.com/v1/chat:complete'; // Thay bằng đúng endpoint Gemini

function sanitizeTextForEmbedding(text: string): string {
    return text.trim().replace(/\s+/g, ' ');
}

export async function getEmbedding(text: string): Promise<number[]> {
    const sanitized = sanitizeTextForEmbedding(text);

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY!,
        },
        body: JSON.stringify({
            model: 'models/embedding-001',
            content: {
                parts: [{ text: sanitized }],
            },
        }),
    });

    const resText = await response.text();
    // console.log('API response text:', resText);

    try {
        const data = JSON.parse(resText);
        // console.log("data", data?.embedding.values);
        return data?.embedding?.values ?? [];
    } catch (error) {
        console.error('❌ Lỗi parse JSON:', error);
        throw new Error('API response không phải JSON hợp lệ');
    }
}

export async function generateResponse(prompt: string) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
            model: 'gemini-1.5-chat-bison',
            messages: [{ role: 'user', content: prompt }],
        }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No reply';
}
