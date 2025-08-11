import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { getEmbedding } from '@/lib/gemini';
import { cosineSimilarity } from '@/lib/similarity';

const openai = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
});

function isRefusal(reply: string): boolean {
    const normalized = reply.toLowerCase();

    const patterns = [
        'tôi không có khả năng truy cập',
        'tôi không thể cung cấp thông tin thời gian thực',
        'bạn nên tham khảo',
        'tôi không có dữ liệu về',
        'hãy kiểm tra các nguồn tin tức',
        'tôi không có thông tin chính xác về',
        'vui lòng kiểm tra các nguồn đáng tin cậy',
        'xin lỗi, tôi chỉ hỗ trợ các vấn đề về lập trình',
        'tôi không thể cung cấp',
        'tôi xin lỗi',
        'tôi không biết',
        'không có phản hồi',
        'bạn cần hỗ trợ gì',
        'tôi cần thêm thông tin',
        '(giờ việt nam)',
    ];

    return patterns.some(p => normalized.includes(p));
}

export async function POST(req: Request) {
    const body = await req.json();
    const { messages, sessionId = 'default-session' } = body;

    if (!messages || !Array.isArray(messages)) {
        return NextResponse.json({ error: 'Sai định dạng messages' }, { status: 400 });
    }

    try {
        const lastUserMessage = messages[messages.length - 1];
        const userText = lastUserMessage.content;
        const userEmbedding = await getEmbedding(userText);

        // 🧠 STEP 0 — Intent Detection (ví dụ: nghỉ phép)
        const intentPrompt = `
            Bạn là một AI chuyên phân tích ý định người dùng. 
            
            Khi người dùng muốn đăng ký nghỉ phép, bạn cần trả về JSON như sau:

            {
            "intent": "CREATE_LEAVE_REQUEST",
                "params": {
                    "user_id": "12345", (sẽ tự lấy ở prompt không nhập)
                    "leave_type_id": "67890",
                    "duration": "single" (hoặc "second_half" hoặc "first_half"),
                    "leave_date": "2025-07-15",
                    "status": "pending" (mặc định luôn là pending không hỏi người dùng),
                    "reason": "Lý do nghỉ phép"
                }
            }

            Khi người dùng muốn xem lại đơn nghỉ phép đã gửi, bạn trả về:
            {
                "intent": "VIEW_LEAVE_REQUEST",
                "params": {
                    "name": "Alex"
                }
            }

            Khi người dùng muốn xóa đơn nghỉ phép, bạn trả về:
            {
                "intent": "DELETE_LEAVE_REQUEST",
                "params": {
                    "name": "Alex",
                    "date": "2025-07-15"
                }
            }

            Nếu không phải đăng ký nghỉ phép, chỉ trả về:
            { "intent": "OTHER" }

            Lưu ý: Lịch sử trò chuyện có thể chứa nhiều thông tin, nhưng bạn chỉ cần tập trung vào câu hỏi cuối cùng của người dùng.
            Đây là Lịch sử trò chuyện:
            ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

            Câu đầu vào: "${userText}"
        `;

        console.log('history for intent detection:', messages.map(m => `${m.role}: ${m.content}`).join('\n'));

        const intentRes = await openai.chat.completions.create({
            model: 'gemini-1.5-flash',
            messages: [
                { role: 'user', content: intentPrompt },
            ],
        });

        // console.log('Intent detection response:', intentRes);

        const intentRaw = intentRes.choices?.[0]?.message?.content?.trim() || '{}';

        try {
            // Loại bỏ markdown code block nếu AI trả về dạng đó
            const cleanIntentRaw = intentRaw
                .replace(/^```json\s*/, '')
                .replace(/\s*```$/, '');

            const parsedIntent = JSON.parse(cleanIntentRaw);

            if (parsedIntent?.intent === 'CREATE_LEAVE_REQUEST') {
                const { user_id, leave_type_id, leave_date, duration, reason, status } = parsedIntent.params || {};

                if (!user_id || !leave_type_id || !leave_date || !duration || !reason) {
                    return NextResponse.json({
                        reply: `📋 Bạn muốn đăng ký nghỉ phép. Vui lòng cung cấp đầy đủ thông tin: 

                            - Loại nghỉ phép (leave_type_id)
                            - Ngày nghỉ (leave_date)
                            - Loại nghỉ (duration: full_day, first_half, second_half)
                            - Lý do nghỉ (reason)

                            ⏳ Trạng thái mặc định: pending`
                        ,
                        source: 'missing-params',
                    });
                }

                console.log(user_id, leave_type_id, leave_date, duration, reason, status)
                const leaveRes = await fetch(`http://localhost:8000/api/bot-leave`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id, leave_type_id, leave_date, duration, reason, status }),
                });

                if (!leaveRes.ok) {
                    let leaveData = { message: 'Lỗi không xác định' };

                    try {
                        leaveData = await leaveRes.json();
                    } catch (e) {
                        console.error('❌ Không thể parse JSON từ response lỗi:', e);
                    }

                    console.error('❌ API nghỉ phép lỗi:', leaveData);

                    return NextResponse.json({
                        reply: `❌ ${leaveData.message || 'Không thể gửi yêu cầu nghỉ phép. Vui lòng thử lại sau.'}`,
                        source: 'leave-api-error',
                    });
                }

                const leaveData = await leaveRes.json();

                return NextResponse.json({
                    reply: `📅 ${leaveData.message || 'Đã gửi yêu cầu nghỉ phép thành công!'}`,
                    source: 'action-intent',
                });
            }

            // Xử lý intent VIEW_LEAVE_REQUEST
            if (parsedIntent?.intent === 'VIEW_LEAVE_REQUEST') {
                const { name } = parsedIntent.params || {};

                if (!name) {
                    return NextResponse.json({
                        reply: `📋 Bạn muốn xem đơn nghỉ phép. Vui lòng cung cấp tên người đăng ký.`,
                        source: 'missing-name',
                    });
                }

                const leaveRes = await fetch(`${process.env.BASE_URL}/api/leave-request?name=${encodeURIComponent(name)}`);

                if (!leaveRes.ok) {
                    const error = await leaveRes.text();
                    console.error('❌ API lấy đơn nghỉ phép lỗi:', error);

                    return NextResponse.json({
                        reply: `❌ Không thể lấy thông tin đơn nghỉ phép. Vui lòng thử lại sau.`,
                        source: 'leave-api-error',
                    });
                }

                const leaveData = await leaveRes.json();
                const leaves = leaveData.data;

                if (!Array.isArray(leaves) || leaves.length === 0) {
                    return NextResponse.json({
                        reply: `📭 Không tìm thấy đơn nghỉ phép nào cho ${leaveData.name || 'người dùng này'}.`,
                        source: 'view-intent',
                    });
                }

                leaves.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                const formattedList = leaves.map((leave, index) => {
                    const dateStr = new Date(leave.date).toLocaleDateString('vi-VN');
                    const reason = leave.reason?.trim() || 'Không rõ';
                    return `${index + 1}. 📆 Ngày: ${dateStr} | 📝 Lý do: ${reason}`;
                }).join('\n');

                return NextResponse.json({
                    reply: `📋 Danh sách đơn nghỉ phép của ${leaves[0].name}:\n${formattedList}`,
                    source: 'view-intent',
                });

            }

            // Xử lý intent DELETE_LEAVE_REQUEST
            if (parsedIntent?.intent === 'DELETE_LEAVE_REQUEST') {
                const { name, date } = parsedIntent.params || {};
                if (!name || !date) {
                    return NextResponse.json({
                        reply: `📋 Bạn muốn xóa đơn nghỉ phép. Vui lòng cung cấp đầy đủ thông tin:\n- Tên người đăng ký\n- Ngày nghỉ`,
                        source: 'missing-delete-params',
                    });
                }
                // Gọi API xóa đơn nghỉ phép
                const deleteRes = await fetch(`${process.env.BASE_URL}/api/leave-request`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, date }),
                });
                if (!deleteRes.ok) {
                    const error = await deleteRes.text();
                    console.error('❌ API xóa đơn nghỉ phép lỗi:', error);

                    return NextResponse.json({
                        reply: `❌ Không thể xóa đơn nghỉ phép. Vui lòng thử lại sau.`,
                        source: 'leave-api-error',
                    });
                }
                const deleteData = await deleteRes.json();
                return NextResponse.json({
                    reply: `🗑️ ${deleteData.message || 'Đã xóa đơn nghỉ phép thành công!'}`,
                    source: 'action-intent',
                });
            }
        } catch (err) {
            console.warn('❌ Không parse được intent JSON:', intentRaw, err);

            return NextResponse.json({
                reply: `⚠️ Lỗi hệ thống khi xử lý ý định. Vui lòng thử lại.`,
                source: 'intent-parse-error',
            });
        }

        // 🧠 STEP 1 — Search trong Knowledge
        const knowledgeRecords = await prisma.knowledge.findMany({
            where: {
                embedding: {
                    not: null,
                },
            },
        });

        // Tính similarity cho từng bản ghi
        const knowledgeMatches = knowledgeRecords
            .map((record) => {
                const vector = Array.isArray(record.embedding) ? (record.embedding as number[]) : [];
                const similarity = cosineSimilarity(userEmbedding, vector);
                return { ...record, similarity };
            })
            .filter(match => match.similarity > 0.80)
            .sort((a, b) => b.similarity - a.similarity);

        if (knowledgeMatches.length > 0) {
            const topKnowledge = knowledgeMatches.slice(0, 5);
            const context = topKnowledge.map((k, i) => `Mục ${i + 1}: ${k.content}`).join('\n\n');

            const prompt = `
                Bạn là một trợ lý thông minh. Dưới đây là một số thông tin liên quan đến câu hỏi của người dùng. 
                Hãy đọc kỹ và chọn ra những phần phù hợp nhất để tạo ra một câu trả lời chính xác, ngắn gọn và dễ hiểu. 
                Nếu không có thông tin nào liên quan, bạn có thể từ chối một cách lịch sự.

                Thông tin có sẵn:
                ${context}

                Câu hỏi của người dùng:
                "${lastUserMessage.content}"

                Hãy trả lời ngắn gọn, chính xác và chỉ dựa trên thông tin trên. Không thêm thông tin bên ngoài.
            `;

            const aiRes = await openai.chat.completions.create({
                model: 'gemini-1.5-flash',
                messages: [
                    {
                        role: 'system',
                        content: 'Bạn là một trợ lý AI chuyên hỗ trợ người dùng bằng cách chọn và tổng hợp thông tin có sẵn.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            });

            const reply = aiRes.choices?.[0]?.message?.content?.trim() || 'Không có phản hồi';

            if (!isRefusal(reply)) {
                return NextResponse.json({
                    reply,
                    source: 'knowledge',
                    similarity: topKnowledge[0].similarity,
                });
            }
        }

        // 2. Nếu không có kết quả Knowledge phù hợp, thì tìm trong messages đã lưu (như cũ)
        const storedMessages = await prisma.message.findMany({
            where: {
                role: 'assistant',
                embedding: {
                    not: null,
                },
            },
        });

        const matches = storedMessages
            .map((msg) => {
                const vector = Array.isArray(msg.embedding) ? (msg.embedding as number[]) : [];
                const similarity = cosineSimilarity(userEmbedding, vector);
                return { ...msg, similarity };
            })
            .filter(match => match.similarity > 0.75) // lấy những câu gần giống nhất
            .sort((a, b) => b.similarity - a.similarity);

        // console.log('Stored messages matches found:', matches.length);

        if (matches.length > 0) {
            // Ghép các câu trả lời cũ thành một context
            const topMessages = matches.slice(0, 5);
            const context = topMessages
                .map((m, idx) => `Phản hồi ${idx + 1}: ${m.content}`)
                .join('\n\n');

            const prompt = `
                Dưới đây là các phản hồi trước đây mà hệ thống từng sử dụng để trả lời các câu hỏi tương tự. 
                Hãy chọn câu trả lời phù hợp nhất hoặc tổng hợp lại để trả lời câu hỏi hiện tại một cách chính xác và rõ ràng.

                Các phản hồi có sẵn:
                ${context}

                Câu hỏi hiện tại:
                "${lastUserMessage.content}"

                Hãy trả lời ngắn gọn và đúng trọng tâm.
            `;

            const aiRes = await openai.chat.completions.create({
                model: 'gemini-1.5-flash',
                messages: [
                    {
                        role: 'system',
                        content: 'Bạn là một trợ lý AI, hãy chọn hoặc tổng hợp câu trả lời tốt nhất từ danh sách dưới.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            });

            const reply = aiRes.choices?.[0]?.message?.content?.trim() || 'Không có phản hồi';

            if (!isRefusal(reply)) {
                return NextResponse.json({
                    reply,
                    source: 'retrieval',
                });
            }
        }

        // 3. Gọi Gemini AI bên ngoài nếu không tìm được nội dung phù hợp
        const aiRes = await openai.chat.completions.create({
            model: 'gemini-1.5-flash',
            messages,
        });

        const reply = aiRes.choices?.[0]?.message?.content?.trim() || 'Không có phản hồi';

        if (isRefusal(reply)) {
            return NextResponse.json({
                reply,
                source: 'refused',
                note: 'Không lưu vào CSDL vì AI trả lời phủ định',
            });
        }

        const botEmbedding = await getEmbedding(reply).catch(() => []);

        await prisma.message.createMany({
            data: [
                {
                    role: lastUserMessage.role,
                    content: lastUserMessage.content,
                    sessionId,
                    embedding: userEmbedding,
                },
                {
                    role: 'assistant',
                    content: reply,
                    sessionId,
                    embedding: botEmbedding,
                },
            ],
        });

        return NextResponse.json({
            reply,
            source: 'gemini . sós',
        });

    } catch (error) {
        console.error('Lỗi Prisma/Gemini:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
