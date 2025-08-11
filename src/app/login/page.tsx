'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {

    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        })

        if (res.ok) {
            router.push('/user')
        } else {
            try {
                const data = await res.json()
                setError(data.message || 'Đăng nhập thất bại')
            } catch (error) {
                // Nếu response không phải JSON (vd: HTML error page), show lỗi chung
                setError('Đăng nhập thất bại. Vui lòng thử lại.')
            }
        }

    }

    return (
        <div style={{ padding: 32, maxWidth: 400, margin: 'auto' }}>
            <h1>Đăng nhập</h1>
            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ display: 'block', marginBottom: 8, width: '100%' }}
                />
                <input
                    type="password"
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ display: 'block', marginBottom: 8, width: '100%' }}
                />
                <button type="submit">Đăng nhập</button>
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </form>
        </div>
    )
}
