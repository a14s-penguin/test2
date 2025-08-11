'use client';

import { useState, useEffect, useRef } from 'react';
import { Input, Button } from 'antd';
import { format } from 'date-fns-tz';
import { set } from 'mongoose';

const { TextArea } = Input;

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export default function HomePage() {
  const now = new Date();
  const vietnamTime = format(now, "yyyy-MM-dd HH:mm:ss", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const [prompt, setPrompt] = useState('');
  const [nameUser, setNameUser] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: `
        Bạn là một trợ lý AI thông minh của công ty a14s, có khả năng trả lời các câu hỏi và hỗ trợ người dùng, và ưu tiên trả lời liên quan đến công ty A14s, nếu người dùng hỏi những vấn đề của công ty mà không đề cập đến công ty nào thì mặc định hiểu là hỏi về công ty a14s.
        Ví dụ nếu người dùng hỏi "giờ vào làm" thì bạn sẽ trả lời câu hỏi "giờ làm việc của công ty a14s".
        - Bây giờ là: ${vietnamTime} (giờ Việt Nam).
        - Nhiệm vụ của bạn là hỗ trợ người dùng với thông tin nội bộ công ty A14s.
        - Nếu người dùng hỏi về giờ giấc, lịch làm việc,... thì bạn trả lời dựa trên giờ hiện tại ở Việt Nam.
        - Nếu người dùng đặt câu hỏi chung chung (ví dụ: "giờ vào làm"), bạn mặc định hiểu là đang hỏi về công ty A14s.

        Chú ý: Đối tượng trò chuyện là ${nameUser}
      `.trim(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [messages]);

  useEffect(() => {
    // const handleMessage = (event: MessageEvent) => {
    //   console.log("📡 Nhận tin nhắn từ Laravel:", event.data);
    //   console.log("📡 Origin:", event.origin);
    //   if (event.origin !== "https://f431fbd0ff50.ngrok-free.app") {
    //     console.warn("❌ Tin nhắn không hợp lệ từ:", event.origin);
    //     return;
    //   }

    //   const userInfo = event.data;
    //   console.log("📥 Nhận user từ Laravel:", userInfo);
    //   setNameUser(userInfo || 'Người dùng');
    // };
    window.addEventListener("message", function (event) {
      console.log("📡 Nhận tin nhắn từ Laravel:", event.data);
      console.log("url: ", event.origin);
      if (event.origin !== "https://team.a14studio.com" && event.origin !== "http://127.0.0.1:8000") {
        console.warn("❌ Tin nhắn không hợp lệ từ:", event.origin);
        return;
      }
      const userInfo = event.data;
      console.log("📥 Nhận user từ Laravel:", userInfo);
      setNameUser(userInfo.name || 'Người dùng');
      setMessages([
        {
          role: 'system',
          content: `
            Bạn là một trợ lý AI thông minh của công ty a14s, có khả năng trả lời các câu hỏi và hỗ trợ người dùng, và ưu tiên trả lời liên quan đến công ty A14s, nếu người dùng hỏi những vấn đề của công ty mà không đề cập đến công ty nào thì mặc định hiểu là hỏi về công ty a14s.
            Ví dụ nếu người dùng hỏi "giờ vào làm" thì bạn sẽ trả lời câu hỏi "giờ làm việc của công ty a14s".
            - Bây giờ là: ${vietnamTime} (giờ Việt Nam).
            - Nhiệm vụ của bạn là hỗ trợ người dùng với thông tin nội bộ công ty A14s.
            - Nếu người dùng hỏi về giờ giấc, lịch làm việc,... thì bạn trả lời dựa trên giờ hiện tại ở Việt Nam.
            - Nếu người dùng đặt câu hỏi chung chung (ví dụ: "giờ vào làm"), bạn mặc định hiểu là đang hỏi về công ty A14s.

            👤 Người đang trò chuyện: ${userInfo.name}
            Đây là thông tin của user: ${JSON.stringify(userInfo)}      
          `.trim(),
        },
      ])
      console.log(userInfo.name)
    });
    console.log("📡 Đã đăng ký lắng nghe tin nhắn từ Laravel", nameUser);
    console.log("📡 Name user:", nameUser);
    // return () => window.removeEventListener("message", handleMessage);
  }, [nameUser]);

  const handleSend = async () => {
    if (!prompt.trim()) return;

    const userMsg = { role: 'user' as const, content: prompt };
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          sessionId: 'default-session',
        }),
      });

      // ✅ Kiểm tra phản hồi trước khi xử lý JSON
      const resText = await res.text();
      if (!res.ok) {
        console.error(`❌ API lỗi: ${res.status} - ${res.statusText}`, resText);
        throw new Error(`API lỗi: ${res.status}`);
      }

      // ✅ Parse JSON an toàn
      let data;
      try {
        data = JSON.parse(resText);
      } catch (err) {
        console.error('❌ Lỗi JSON.parse từ phản hồi:', err, resText);
        throw new Error('Phản hồi không hợp lệ JSON');
      }

      // ✅ Kiểm tra dữ liệu cần thiết
      const reply = data?.reply || '🤖 Không có phản hồi.';
      // const icon = data?.source === 'retrieval' ? '🔍' : '🤖';
      let icon = '🤖';
      if (data?.source === 'retrieval') {
        icon = '🔍';
      } else if (data?.source === 'knowledge') {
        icon = '📚';
      } else {
        icon = '🤖';
      }

      const botMsg: Message = {
        role: 'assistant',
        content: `${icon} ${reply}`,
      };

      setMessages(prev => [...prev, botMsg]);

      // ✅ Tự động focus lại input
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      console.error('❌ Lỗi gửi/nhận API:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Đã xảy ra lỗi khi gọi API.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  console.log("prompt:", messages);
  return (
    <main style={{
      padding: 24, fontFamily: 'sans-serif',
      maxWidth: 700, margin: '0 auto',
      display: 'flex', flexDirection: 'column', height: '100vh',
      backgroundColor: '#f9fafb',
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24, color: 'blue' }}> {nameUser} 🤖 Chat with Vector‑backed Gemini AI</h1>
      <div style={{
        flex: 1, overflowY: 'auto',
        marginBottom: 16, padding: 16,
        border: '1px solid #ddd', borderRadius: 12,
        background: '#fff', boxShadow: '0 2px 8px rgb(0 0 0 / 0.1)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.filter(m => m.role !== 'system').map((msg, i) => (
          <div key={i} style={{
            backgroundColor: msg.role === 'user' ? '#e6f7ff' : '#f5f5f5',
            padding: 14, borderRadius: 16, maxWidth: '75%',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            boxShadow: msg.role === 'user' ? '0 1px 5px rgba(0,132,255,0.3)' : '0 1px 5px rgba(0,0,0,0.1)',
            whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 16,
          }}>
            <strong style={{ display: 'block', marginBottom: 6, color: 'black' }}>
              {msg.role === 'user' ? '🧑 Bạn' : '💬 Bot'}:
            </strong>
            <div style={{ color: "black" }}>{msg.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <TextArea
        ref={inputRef}
        rows={4}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder="Nhập câu hỏi tại đây..."
        style={{
          width: '100%', marginBottom: 12,
          padding: 12, borderRadius: 10,
          borderColor: '#d9d9d9', resize: 'none', fontSize: 16,
        }}
        onPressEnter={e => {
          if (!e.shiftKey) {
            e.preventDefault();
            if (!loading) handleSend();
          }
        }}
        disabled={loading}
      // autoFocus
      />
      <Button
        type="primary" size="large"
        onClick={handleSend}
        loading={loading}
        disabled={loading || !prompt.trim()}
        style={{ borderRadius: 10, fontWeight: 600 }}
      >
        Gửi
      </Button>
    </main>
  );
}
