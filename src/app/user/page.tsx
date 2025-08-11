'use client'

import React, { useEffect, useState } from 'react'
import { Button, Table, Space, Input, Modal, Form, Row, Select, Image, Upload, notification, InputNumber, } from "antd";
import { title } from 'process';
import { useRouter } from 'next/navigation'

type User = {
    id: string
    email: string
    createdAt: string
}

export default function UsersClient() {

    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)

    const [id, setId] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [message, setMessage] = useState('')
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const router = useRouter()

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users')
            const data = await res.json()
            setUsers(data)
        } catch (error) {
            console.error(error)
            setMessage('Lỗi khi tải danh sách user')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const logout = async () => {
        const res = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        })

        if (!res.ok) {
            console.error('Đăng xuất thất bại')
        }
        router.push('/login')
    }

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setMessage('')
        if (!email || !password) {
            setMessage('Vui lòng nhập đủ email và mật khẩu')
            return
        }

        try {
            let res;
            if (editingUser) {
                res = await fetch(`/api/users`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, email, password }),
                })
                if (!res.ok) {
                    setMessage('Cập nhật user thất bại')
                    return
                }

            } else {
                res = await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                })
            }

            const data = await res.json()

            if (!res.ok) {
                setMessage(data.error || 'Thao tác thất bại')
                return
            }

            setMessage(editingUser ? 'Cập nhật thành công!' : 'Tạo user thành công!')
            setEmail('')
            setPassword('')
            setEditingUser(null)
            setShowModal(false)
            fetchUsers()
            setTimeout(() => {
                setMessage('');
            }, 5000);
        } catch (error) {
            setMessage('Lỗi server')
            console.error(error)
        }
    }


    if (loading) return <div>Loading...</div>

    const columns = [
        {
            title: "Email",
            dataIndex: "email",
            key: "email",
        },
        {
            title: "Created At",
            dataIndex: "createdAt",
            key: "createdAt",
        },
        {
            title: "Action",
            key: "action",
            render: (_: any, record: User) => (
                <Button
                    type="link"
                    onClick={() => {
                        setId(record.id)
                        setEmail(record.email)
                        setPassword('')
                        setEditingUser(record)
                        setShowModal(true)
                    }}
                >
                    Cập nhật user
                </Button>
            ),
        }
    ]

    return (
        <div>
            <button onClick={logout}>Đăng xuất</button>
            <h2>Danh sách users</h2>
            <button onClick={() => setShowModal(true)}>Tạo user mới</button>
            <br></br>
            <button onClick={() => setMessage("")} value={message}>{message && <p style={{ color: "red" }}>{message}</p>}</button>
            {showModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalStyle}>
                        <h3>Tạo user mới</h3>
                        <form onSubmit={handleSaveUser}>
                            <div>
                                <label>Email:</label><br />
                                <input
                                    style={{ width: "100%" }}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                // required
                                />
                            </div>

                            <div>
                                <label>Password:</label><br />
                                <input
                                    style={{ width: "100%" }}
                                    type="text"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                // required
                                />
                            </div>

                            <button type="submit" style={{ marginTop: '0.5rem' }}>
                                Tạo user
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                style={{ marginLeft: '15rem' }}
                            >
                                Hủy
                            </button>
                        </form>
                        {/* {message && <p style={{ color: "red" }}>{message}</p>} */}
                    </div>
                </div>
            )}
            <Table
                columns={columns}
                dataSource={users}
                rowKey="id"
            />
        </div>
    )
}

const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
}

const modalStyle: React.CSSProperties = {
    backgroundColor: 'gray',
    padding: 20,
    borderRadius: 8,
    maxWidth: 400,
    width: '90%',
    boxShadow: '0 2px 10px rgba(0,0,0)',
}
