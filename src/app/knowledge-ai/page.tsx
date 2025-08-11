'use client'

import React, { useEffect, useState } from 'react'
import { Button, Table, Space, Input, Modal, Form, Row, Select, Image, Upload, notification, InputNumber, } from "antd";
import { title } from 'process';
import { useRouter } from 'next/navigation'

type Knowledge = {
    id: string
    subTitle: string
    content: string
}

export default function KnowledgeClient() {
    const [knowledge, setKnowledge] = useState<Knowledge[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)

    const [id, setId] = useState('')
    const [subTitle, setSubTitle] = useState('')
    const [content, setContent] = useState('')
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [title, setTitle] = useState('nerver use')
    const [editingKnowledge, setEditingKnowledge] = useState<Knowledge | null>(null)
    const router = useRouter()

    const fetchKnowledge = async () => {
        try {
            const res = await fetch('/api/knowledge/add')
            const data = await res.json()
            console.log(data);
            setKnowledge(data)
        } catch (error) {
            console.error(error)
            setMessage({ type: 'error', text: 'Lỗi khi tải danh sách kiến thức' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchKnowledge()
    }, [])

    const handleSubmit = async (e: React.FormEvent, mode: 'UPDATE' | 'POST') => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        console.log('Submitting knowledge:', { subTitle, content, title });
        console.log('Mode:', mode);

        if (mode == 'POST' && (title || content)) {
            try {
                const res = await fetch('/api/knowledge/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, content }),
                });

                const data = await res.json();
                if (res.ok) {
                    setMessage({ type: 'success', text: data.message });
                    setTitle('nerver use');
                    setContent('');
                } else {
                    setTitle('nerver use');
                    setMessage({ type: 'error', text: data.error || 'Có lỗi xảy ra' });
                }
            } catch (err) {
                setTitle('nerver use');
                setMessage({ type: 'error', text: 'Không thể kết nối đến máy chủ' });
            }
        }
        else if (mode == 'UPDATE' && (subTitle || content)) {
            try {
                const res = await fetch('/api/knowledge/add', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingKnowledge?.id, subTitle, content }),
                });

                const data = await res.json();
                if (res.ok) {
                    setMessage({ type: 'success', text: data.message });
                    setEditingKnowledge(null);
                    setSubTitle('');
                    setContent('');
                } else {
                    setMessage({ type: 'error', text: data.error || 'Có lỗi xảy ra' });
                }
            } catch (err) {
                setMessage({ type: 'error', text: 'Không thể kết nối đến máy chủ' });
            }
        } else {
            setTitle('nerver use');
            console.log('no action')
        }
        setShowModal(false);
        fetchKnowledge();
        setLoading(false);
    };

    useEffect(() => {
        fetchKnowledge()
    }, [])

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Danh sách Kiến thức</h1>
            <Button type="primary" onClick={() => setShowModal(true)}>Thêm Kiến thức</Button>

            <Table dataSource={knowledge} loading={loading} rowKey="id">
                {/* <Table.Column title="ID" dataIndex="id" key="id" /> */}
                <Table.Column title="Tiêu đề phụ" dataIndex="subTitle" key="subTitle" />
                <Table.Column title="Nội dung" dataIndex="content" key="content" />
                <Table.Column
                    title="Hành động"
                    key="action"
                    render={(text, record) => (
                        <Space size="middle">
                            <Button onClick={() => {
                                setEditingKnowledge(record);
                                setSubTitle(record.subTitle);
                                setContent(record.content);
                                setShowModal(true);
                            }}>Sửa</Button>
                        </Space>
                    )}
                />
                <Table.Column
                    title="Xoá"
                    key="delete"
                    render={(text, record) => (
                        <Space size="middle">
                            <Button danger onClick={async () => {
                                try {
                                    const res = await fetch(`/api/knowledge/add`, {
                                        method: 'DELETE',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ id: record.id }),
                                    });

                                    if (!res.ok) {
                                        throw new Error('Xoá kiến thức thất bại');
                                    }

                                    notification.success({ message: 'Thành công', description: 'Kiến thức đã được xoá.' });
                                    fetchKnowledge();
                                } catch (error) {
                                    notification.error({ message: 'Lỗi', description: error.message });
                                }
                            }}>Xoá</Button>
                        </Space>
                    )}
                />
            </Table>

            <Modal
                title={editingKnowledge ? "Sửa Kiến thức" : "Thêm Kiến thức"}
                open={showModal}
                onCancel={() => setShowModal(false)}
                footer={null}
            >
                <Form
                    layout="vertical"
                    onFinish={async (values) => {
                        try {
                            const res = await fetch('/api/knowledge/add', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(values),
                            });

                            if (!res.ok) {
                                throw new Error('Lỗi khi thêm/sửa kiến thức');
                            }

                            notification.success({ message: 'Thành công', description: 'Kiến thức đã được lưu.' });
                            setShowModal(false);
                            fetchKnowledge();
                        } catch (error) {
                            notification.error({ message: 'Lỗi', description: error.message });
                        }
                    }}
                >
                    <Form.Item label="Tiêu đề phụ" name="subTitle" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề phụ!' }]}>
                        <Input value={subTitle} onChange={(e) => setSubTitle(e.target.value)} />
                    </Form.Item>
                    <Form.Item label="Nội dung" name="content" rules={[{ required: true, message: 'Vui lòng nhập nội dung!' }]}>
                        <Input.TextArea value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
                    </Form.Item>
                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            onClick={(e) => handleSubmit(e, editingKnowledge ? 'UPDATE' : 'POST')}
                        >
                            {editingKnowledge ? "Cập nhật" : "Thêm"}
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div >
    );

}