// src/lib/split.ts

export function splitTextIntoChunks(text: string, maxChunkLength = 300): string[] {
    const paragraphs = text.split(/\n\s*\n/);
    const chunks: string[] = [];

    for (const para of paragraphs) {
        if (para.length <= maxChunkLength) {
            chunks.push(para.trim());
        } else {
            // const sentences = para.split(/(?<=[.!?])\s+/);
            let chunk = '';
            for (const sentence of para) {
                if ((chunk + sentence).length > maxChunkLength) {
                    chunks.push(chunk.trim());
                    chunk = sentence;
                } else {
                    chunk += ' ' + sentence;
                }
            }
            if (chunk) chunks.push(chunk.trim());
        }
    }

    return chunks.filter(c => c.length > 20);
}
