'use client';
import { useState } from 'react';

export default function AddLongKnowledgeForm() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch('/api/knowledge/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content }),
            });

            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                setTitle('');
                setContent('');
            } else {
                setMessage({ type: 'error', text: data.error || 'Có lỗi xảy ra' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Không thể kết nối đến máy chủ' });
        }

        setLoading(false);
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Thêm Kiến Thức Mới</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tiêu đề</label>
                    <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Nhập tiêu đề cho kiến thức"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                        style={{ color: 'black' }}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Nội dung</label>
                    <textarea
                        rows={10}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Dán đoạn văn bản dài vào đây..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        required
                        style={{ color: 'black' }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50"
                >
                    {loading ? 'Đang xử lý...' : 'Thêm kiến thức'}
                </button>

                {message && (
                    <div
                        className={`mt-4 p-3 rounded-md ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                    >
                        <p style={{ color: 'black' }}>{message.text}</p>
                    </div>
                )}
            </form>
        </div>
    );
}
