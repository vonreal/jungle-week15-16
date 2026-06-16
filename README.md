# CareerBuddy

개발자가 자신의 역량을 파악하고, JD를 분석해 맞춤 포트폴리오 전략을 세울 수 있도록 돕는 AI 커리어 코치 서비스입니다.

## Stack

- Frontend: React + Vite
- Backend: FastAPI + SQLAlchemy + Alembic
- DB: PostgreSQL + pgvector
- RAG/Agent: LangChain + LangGraph
- MCP: MCP Python SDK stdio tool server
- Deployment: AWS EC2 + Docker Compose
- CI/CD: GitHub Actions workflow draft는 아직 커밋하지 않음

## Quick Start

```bash
cp .env.example .env
# .env의 POSTGRES_PASSWORD, DATABASE_URL, DOCKER_DATABASE_URL, SECRET_KEY를 로컬 값으로 변경하세요.
docker compose up -d --build
docker compose exec backend alembic upgrade head
```

서비스:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- OpenAPI: http://localhost:8000/docs

초기 스킬 데이터:

```bash
curl -X POST http://localhost:8000/api/v1/skills/seed
```

## Implemented Scope

- FastAPI 프로젝트 구조
- React 프로젝트 구조
- PostgreSQL + pgvector 스키마와 Alembic 초기 마이그레이션
- JWT 회원가입/로그인
- 게시물 CRUD, 댓글, 태그, 페이징, 검색 API
- skills 시딩, 내 스탯 입력/조회, 레이더 차트 UI
- 문서 업로드와 규칙 기반 경험 추출
- JD 링크/텍스트/이미지 입력 API
- MCP Python SDK 기반 채용공고 링크 크롤링 도구(`fetch_job_posting`)
- JD 요구사항 추출, 갭 요약, 경험 3분류
- pgvector 기반 RAG 저장/검색 경계
- LangGraph Agent 기반 포트폴리오 추천 경계

## Environment

DB 접속 문자열, 비밀번호, API 키는 코드에 넣지 않고 `.env`에서만 읽습니다. 실제 `.env`는 git에 올리지 않고, 커밋에는 placeholder가 담긴 `.env.example`만 포함합니다.

```bash
POSTGRES_PASSWORD=replace-with-local-password
DATABASE_URL=postgresql+asyncpg://careerbuddy:replace-with-local-password@localhost:5432/careerbuddy
DOCKER_DATABASE_URL=postgresql+asyncpg://careerbuddy:replace-with-local-password@db:5432/careerbuddy
SECRET_KEY=<replace-with-a-long-random-string>
OPENAI_API_KEY=
LLM_MODEL=gpt-4.1-mini
EMBEDDING_MODEL=text-embedding-3-small
```

키가 없으면 백엔드는 로컬 개발을 위해 규칙 기반 fallback을 반환합니다.
