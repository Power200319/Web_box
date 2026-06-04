# Web Persion Deployment

## Backend on Render

Create a new Web Service from the `backend` folder.

- Build command: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
- Start command: `gunicorn backend.wsgi:application`
- Health check path: `/api/health/`

Set these Render environment variables:

- `DEBUG=False`
- `SECRET_KEY=<generate-a-new-secret>`
- `ALLOWED_HOSTS=<your-render-service>.onrender.com`
- `CORS_ALLOWED_ORIGINS=https://<your-vercel-app>.vercel.app,http://localhost:5173`
- `CSRF_TRUSTED_ORIGINS=https://<your-render-service>.onrender.com`
- `DATABASE_URL=<your-neon-postgres-url>`
- `CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>`
- `CLOUDINARY_API_KEY=<your-cloudinary-api-key>`
- `CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>`

## Frontend on Vercel

Create a Vercel project from the `frontend` folder.

- Build command: `npm run build`
- Output directory: `dist`

Set this Vercel environment variable:

- `VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api`

## Local Development

Backend:

```powershell
cd backend
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173`.
