import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export type GeminiChunk = {
    subTitle: string;
    content: string;
};

export async function smartSplitWithGemini(content: string): Promise<GeminiChunk[]> {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Bạn là một trợ lý AI có nhiệm vụ phân tích nội dung văn bản sau và chia nó thành các đoạn nhỏ (chunk) có độ dài từ 100 đến 300 từ. 

Yêu cầu:
- Mỗi đoạn nên có tiêu đề phụ (subTitle) ngắn gọn, mô tả nội dung chính của đoạn.
- Giữ nguyên cấu trúc ngữ nghĩa và logic của văn bản.
- Trả về kết quả ở định dạng JSON như sau:
[
  { "subTitle": "Tiêu đề phụ 1", "content": "Nội dung đoạn 1" },
  { "subTitle": "Tiêu đề phụ 2", "content": "Nội dung đoạn 2" },
  ...
]

Văn bản:
${content}
`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    // Lọc chuỗi JSON ra khỏi kết quả
    const jsonStart = raw.indexOf('[');
    const jsonEnd = raw.lastIndexOf(']');
    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('Gemini response does not contain valid JSON array.');
    }

    const jsonText = raw.slice(jsonStart, jsonEnd + 1);

    try {
        const parsed: GeminiChunk[] = JSON.parse(jsonText);
        return parsed.filter(chunk => chunk.subTitle && chunk.content);
    } catch (e) {
        throw new Error('Failed to parse Gemini JSON: ' + e);
    }
}
