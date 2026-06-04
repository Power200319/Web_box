import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type User = {
  id: number
  username: string
  email: string
}

type MediaType = 'text' | 'image' | 'video'

type MediaItem = {
  id: number
  title: string
  body_text: string
  media_type: MediaType
  cloudinary_url: string
  original_filename: string
  bytes: number
  created_at: string
}

type AuthMode = 'login' | 'register'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000/api'

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('web_persion_token') || '')
  const [user, setUser] = useState<User | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mediaType, setMediaType] = useState<MediaType>('text')
  const [title, setTitle] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [filter, setFilter] = useState<'all' | MediaType>('all')
  const [items, setItems] = useState<MediaItem[]>([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const authHeaders = useMemo(
    () => {
      const headers = new Headers()
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
    [token],
  )

  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE_URL}/auth/me/`, { headers: authHeaders })
      .then(async (response) => {
        if (!response.ok) throw new Error('Session expired')
        return response.json()
      })
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('web_persion_token')
        setToken('')
        setUser(null)
      })
  }, [authHeaders, token])

  useEffect(() => {
    if (!token) return
    loadMedia()
  }, [filter, token])

  async function apiFetch(path: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, options)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.detail || 'Request failed')
    }
    return data
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setStatus('')

    try {
      const data = await apiFetch(`/auth/${authMode}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })
      localStorage.setItem('web_persion_token', data.token)
      setToken(data.token)
      setUser(data.user)
      setPassword('')
      setStatus(authMode === 'login' ? 'Signed in.' : 'Account created.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }

  async function loadMedia() {
    const query = filter === 'all' ? '' : `?type=${filter}`
    try {
      const data = await apiFetch(`/media/${query}`, { headers: authHeaders })
      setItems(data.items)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not load media')
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setStatus('')

    const formData = new FormData()
    formData.append('media_type', mediaType)
    formData.append('title', title)
    formData.append('body_text', bodyText)
    if (file) formData.append('file', file)

    try {
      await apiFetch('/media/', {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      })
      setTitle('')
      setBodyText('')
      setFile(null)
      await loadMedia()
      setStatus('Saved.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function deleteItem(id: number) {
    setBusy(true)
    setStatus('')
    try {
      await apiFetch(`/media/${id}/`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      setItems((current) => current.filter((item) => item.id !== id))
      setStatus('Deleted.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout/`, {
        method: 'POST',
        headers: authHeaders,
      }).catch(() => undefined)
    }
    localStorage.removeItem('web_persion_token')
    setToken('')
    setUser(null)
    setItems([])
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Web Persion</p>
          <h1>Media store</h1>
        </div>
        {user && (
          <div className="userbar">
            <span>{user.username}</span>
            <button type="button" className="ghost-button" onClick={logout}>
              Sign out
            </button>
          </div>
        )}
      </header>

      {!user ? (
        <section className="auth-layout" aria-label="Authentication">
          <form className="panel auth-panel" onSubmit={handleAuth}>
            <div className="mode-switch" role="tablist" aria-label="Auth mode">
              <button
                type="button"
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => setAuthMode('register')}
              >
                Register
              </button>
            </div>
            <label>
              Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
              />
            </label>
            {authMode === 'register' && (
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </label>
            )}
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </label>
            <button className="primary-button" type="submit" disabled={busy}>
              {authMode === 'login' ? 'Login' : 'Create account'}
            </button>
          </form>
          <aside className="panel info-panel">
            <h2>Store text, images, and video</h2>
            <p>
              Files upload to Cloudinary, item records save in Neon PostgreSQL,
              and this app is ready for Vercel plus Render deployment.
            </p>
          </aside>
        </section>
      ) : (
        <section className="workspace">
          <form className="panel editor-panel" onSubmit={handleUpload}>
            <div className="panel-head">
              <h2>New item</h2>
              <div className="type-switch" role="tablist" aria-label="Media type">
                {(['text', 'image', 'video'] as MediaType[]).map((type) => (
                  <button
                    type="button"
                    key={type}
                    className={mediaType === type ? 'active' : ''}
                    onClick={() => {
                      setMediaType(type)
                      setFile(null)
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <label>
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={180}
                required
              />
            </label>
            <label>
              Text
              <textarea
                value={bodyText}
                onChange={(event) => setBodyText(event.target.value)}
                rows={mediaType === 'text' ? 8 : 4}
                required={mediaType === 'text'}
              />
            </label>
            {mediaType !== 'text' && (
              <label>
                File
                <input
                  type="file"
                  accept={mediaType === 'image' ? 'image/*' : 'video/*'}
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  required
                />
              </label>
            )}
            <button className="primary-button" type="submit" disabled={busy}>
              Save item
            </button>
          </form>

          <section className="library">
            <div className="library-head">
              <h2>Library</h2>
              <div className="filter-switch" role="tablist" aria-label="Filter media">
                {(['all', 'text', 'image', 'video'] as const).map((type) => (
                  <button
                    type="button"
                    key={type}
                    className={filter === type ? 'active' : ''}
                    onClick={() => setFilter(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="items-grid">
              {items.map((item) => (
                <article className="media-card" key={item.id}>
                  <div className="media-preview">
                    {item.media_type === 'image' && (
                      <img src={item.cloudinary_url} alt={item.title} />
                    )}
                    {item.media_type === 'video' && (
                      <video src={item.cloudinary_url} controls preload="metadata" />
                    )}
                    {item.media_type === 'text' && <p>{item.body_text}</p>}
                  </div>
                  <div className="media-meta">
                    <span>{item.media_type}</span>
                    <time dateTime={item.created_at}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </time>
                  </div>
                  <h3>{item.title}</h3>
                  {item.media_type !== 'text' && item.body_text && <p>{item.body_text}</p>}
                  <button
                    type="button"
                    className="ghost-button danger"
                    onClick={() => deleteItem(item.id)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </article>
              ))}
              {items.length === 0 && (
                <div className="empty-state">
                  <h3>No items yet</h3>
                  <p>Create the first item from the form.</p>
                </div>
              )}
            </div>
          </section>
        </section>
      )}

      {status && <p className="status">{status}</p>}
    </main>
  )
}

export default App
