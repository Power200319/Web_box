import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
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

type IconName =
  | 'archive'
  | 'fileText'
  | 'image'
  | 'lock'
  | 'logIn'
  | 'logOut'
  | 'play'
  | 'plus'
  | 'search'
  | 'trash'
  | 'upload'
  | 'user'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000/api'

const mediaTypes: MediaType[] = ['text', 'image', 'video']
const filters: Array<'all' | MediaType> = ['all', 'text', 'image', 'video']

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    archive: (
      <>
        <path d="M3 7h18" />
        <path d="M5 7l1 14h12l1-14" />
        <path d="M8 7V4h8v3" />
        <path d="M9 12h6" />
      </>
    ),
    fileText: (
      <>
        <path d="M7 3h7l5 5v13H7z" />
        <path d="M14 3v5h5" />
        <path d="M10 13h8" />
        <path d="M10 17h6" />
      </>
    ),
    image: (
      <>
        <path d="M5 5h14v14H5z" />
        <path d="M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
        <path d="M19 16l-4-4-7 7" />
      </>
    ),
    lock: (
      <>
        <path d="M7 10V8a5 5 0 0 1 10 0v2" />
        <path d="M6 10h12v10H6z" />
        <path d="M12 14v3" />
      </>
    ),
    logIn: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M14 4h5v16h-5" />
      </>
    ),
    logOut: (
      <>
        <path d="M14 17l5-5-5-5" />
        <path d="M19 12H8" />
        <path d="M10 4H5v16h5" />
      </>
    ),
    play: (
      <>
        <path d="M7 4v16l14-8z" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    search: (
      <>
        <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z" />
        <path d="M16 16l5 5" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h18" />
        <path d="M9 7V4h7v3" />
        <path d="M7 7l1 14h8l1-14" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4" />
        <path d="M7 9l5-5 5 5" />
        <path d="M5 18v3h14v-3" />
      </>
    ),
    user: (
      <>
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  }

  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

function mediaIcon(type: 'all' | MediaType): IconName {
  if (type === 'image') return 'image'
  if (type === 'video') return 'play'
  if (type === 'text') return 'fileText'
  return 'archive'
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('web_persion_token') || '')
  const [user, setUser] = useState<User | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [mediaType, setMediaType] = useState<MediaType>('text')
  const [title, setTitle] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [filter, setFilter] = useState<'all' | MediaType>('all')
  const [items, setItems] = useState<MediaItem[]>([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const authHeaders = useMemo(() => {
    const headers = new Headers()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return headers
  }, [token])

  const counts = useMemo(
    () => ({
      all: items.length,
      text: items.filter((item) => item.media_type === 'text').length,
      image: items.filter((item) => item.media_type === 'image').length,
      video: items.filter((item) => item.media_type === 'video').length,
    }),
    [items],
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
      const data = await apiFetch('/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      localStorage.setItem('web_persion_token', data.token)
      setToken(data.token)
      setUser(data.user)
      setPassword('')
      setStatus('Signed in.')
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

  if (!user) {
    return (
      <main className="login-screen">
        <section className="login-card" aria-label="Login">
          <div className="brand-block">
            <div className="brand-mark">
              <Icon name="archive" />
            </div>
            <p className="eyebrow">Web Persion</p>
            <h1>Secure media workspace</h1>
            <p className="lede">
              Manage text, image, and video records from one private dashboard.
            </p>
          </div>

          <form className="login-form" onSubmit={handleAuth}>
            <div className="form-title">
              <Icon name="lock" />
              <div>
                <h2>Team login</h2>
                <p>Registration is hidden for this workspace.</p>
              </div>
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
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button className="primary-button" type="submit" disabled={busy}>
              <Icon name="logIn" />
              Login
            </button>
          </form>
        </section>
        {status && <p className="status">{status}</p>}
      </main>
    )
  }

  return (
    <main className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Icon name="archive" />
          </div>
          <div>
            <strong>Web Persion</strong>
            <span>Media CMS</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Media filters">
          {filters.map((type) => (
            <button
              type="button"
              key={type}
              className={filter === type ? 'active' : ''}
              onClick={() => setFilter(type)}
            >
              <Icon name={mediaIcon(type)} />
              <span>{type}</span>
              <small>{counts[type]}</small>
            </button>
          ))}
        </nav>
      </aside>

      <section className="main-column">
        <header className="topbar">
          <div>
            <p className="eyebrow">Library</p>
            <h1>Media store</h1>
          </div>
          <div className="userbar">
            <span className="avatar" aria-hidden="true">
              {user.username.slice(0, 1).toUpperCase()}
            </span>
            <span>{user.username}</span>
            <button type="button" className="icon-button" onClick={logout} aria-label="Sign out">
              <Icon name="logOut" />
            </button>
          </div>
        </header>

        <section className="summary-row" aria-label="Media summary">
          {filters.map((type) => (
            <div className="summary-item" key={type}>
              <Icon name={mediaIcon(type)} />
              <span>{type}</span>
              <strong>{counts[type]}</strong>
            </div>
          ))}
        </section>

        <section className="workspace">
          <form className="editor-panel" onSubmit={handleUpload}>
            <div className="panel-head">
              <div>
                <p className="eyebrow">Create</p>
                <h2>New item</h2>
              </div>
              <div className="type-switch" role="tablist" aria-label="Media type">
                {mediaTypes.map((type) => (
                  <button
                    type="button"
                    key={type}
                    className={mediaType === type ? 'active' : ''}
                    onClick={() => {
                      setMediaType(type)
                      setFile(null)
                    }}
                    aria-label={`Create ${type}`}
                  >
                    <Icon name={mediaIcon(type)} />
                    <span>{type}</span>
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
              <label className="file-drop">
                <Icon name="upload" />
                <span>{file ? file.name : `Choose ${mediaType} file`}</span>
                <input
                  type="file"
                  accept={mediaType === 'image' ? 'image/*' : 'video/*'}
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  required
                />
              </label>
            )}
            <button className="primary-button" type="submit" disabled={busy}>
              <Icon name="plus" />
              Save item
            </button>
          </form>

          <section className="library">
            <div className="library-head">
              <div>
                <p className="eyebrow">Browse</p>
                <h2>{filter === 'all' ? 'All media' : `${filter} items`}</h2>
              </div>
              <div className="search-shell">
                <Icon name="search" />
                <span>{items.length} records</span>
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
                  <div className="media-content">
                    <div className="media-meta">
                      <span>
                        <Icon name={mediaIcon(item.media_type)} />
                        {item.media_type}
                      </span>
                      <time dateTime={item.created_at}>
                        {new Date(item.created_at).toLocaleDateString()}
                      </time>
                    </div>
                    <h3>{item.title}</h3>
                    {item.media_type !== 'text' && item.body_text && <p>{item.body_text}</p>}
                    <button
                      type="button"
                      className="text-button danger"
                      onClick={() => deleteItem(item.id)}
                      disabled={busy}
                    >
                      <Icon name="trash" />
                      Delete
                    </button>
                  </div>
                </article>
              ))}
              {items.length === 0 && (
                <div className="empty-state">
                  <Icon name="archive" />
                  <h3>No items yet</h3>
                  <p>Create the first item from the upload panel.</p>
                </div>
              )}
            </div>
          </section>
        </section>
      </section>

      {status && <p className="status">{status}</p>}
    </main>
  )
}

export default App
