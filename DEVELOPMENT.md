# Development Notes

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Database Migrations

새 모델을 추가한 뒤:

```bash
cd backend
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

## Production Deployment

GitHub repository secrets:

- `AWS_EC2_HOST`
- `AWS_EC2_USER`
- `AWS_EC2_SSH_KEY`

`main` 브랜치에 push 또는 merge되면 `.github/workflows/deploy.yml`이 EC2에 프로젝트를 업로드하고 `docker compose up -d --build`를 실행합니다.

