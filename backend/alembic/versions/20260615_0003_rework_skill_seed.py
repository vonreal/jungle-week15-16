"""Rework skill seed toward competency-based stats."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260615_0003"
down_revision = "20260615_0002"
branch_labels = None
depends_on = None


NEW_SKILLS = [
    ("CS", "자료구조", "배열, 해시, 트리, 그래프 등 기본 자료구조 활용 능력"),
    ("CS", "알고리즘", "탐색, 정렬, DP 등 문제 해결 패턴"),
    ("CS", "운영체제", "프로세스, 스레드, 메모리, 동시성 이해"),
    ("CS", "네트워크", "HTTP, TCP/IP, DNS, TLS 등 네트워크 기본기"),
    ("CS", "데이터베이스 기초", "정규화, 인덱스, 트랜잭션, 쿼리 실행 계획 이해"),
    ("언어", "Java", "타입, 객체지향, JVM 생태계 기반 구현 역량"),
    ("언어", "Python", "스크립팅, API, 데이터 처리 구현 역량"),
    ("언어", "JavaScript/TypeScript", "브라우저와 Node.js 기반 타입 안정 개발 역량"),
    ("언어", "SQL", "관계형 데이터 질의와 분석"),
    ("백엔드", "API 설계", "RESTful API, 에러 모델, 응답 계약 설계"),
    ("백엔드", "인증/인가", "세션, JWT, 권한 정책과 보안 흐름 구현"),
    ("백엔드", "데이터 모델링", "도메인 모델, 관계 설계, 마이그레이션 관리"),
    ("백엔드", "트랜잭션/동시성", "정합성, 락, 비동기 처리와 동시성 제어"),
    ("백엔드", "테스트 자동화", "단위, 통합, API 테스트 설계와 유지"),
    ("프론트엔드", "UI 컴포넌트 설계", "재사용 가능한 화면 컴포넌트와 상태 흐름 구성"),
    ("프론트엔드", "상태 관리", "클라이언트 상태, 서버 상태, 폼 상태 관리"),
    ("프론트엔드", "접근성/반응형", "키보드 접근성, 시맨틱 마크업, 반응형 레이아웃"),
    ("AI", "RAG 설계", "문서 청킹, 임베딩, 검색, 답변 생성 흐름 설계"),
    ("AI", "프롬프트/평가", "프롬프트 설계, 결과 평가, 품질 개선 루프"),
    ("AI", "Agent 워크플로우", "상태 기반 에이전트 흐름과 도구 호출 설계"),
    ("운영/협업", "Git 협업", "브랜치, PR, 리뷰 기반 협업 흐름"),
    ("운영/협업", "CI/CD", "자동 테스트, 빌드, 배포 파이프라인 구성"),
    ("운영/협업", "컨테이너", "이미지 빌드, 로컬/서버 실행 환경 구성"),
    ("운영/협업", "클라우드 배포", "서버 배포, 환경변수, 네트워크 설정"),
    ("운영/협업", "모니터링/장애 대응", "로그, 지표, 알림 기반 문제 추적과 복구"),
]

OLD_TO_NEW = {
    ("CS", "OS"): ("CS", "운영체제"),
    ("CS", "DB"): ("CS", "데이터베이스 기초"),
    ("언어", "JavaScript"): ("언어", "JavaScript/TypeScript"),
    ("언어", "TypeScript"): ("언어", "JavaScript/TypeScript"),
    ("언어", "C"): ("CS", "운영체제"),
    ("프레임워크", "Spring"): ("백엔드", "API 설계"),
    ("프레임워크", "Spring Boot"): ("백엔드", "API 설계"),
    ("프레임워크", "FastAPI"): ("백엔드", "API 설계"),
    ("프레임워크", "React"): ("프론트엔드", "UI 컴포넌트 설계"),
    ("프레임워크", "LangChain"): ("AI", "RAG 설계"),
    ("프레임워크", "LangGraph"): ("AI", "Agent 워크플로우"),
    ("도구", "GitHub"): ("운영/협업", "Git 협업"),
    ("도구", "Docker"): ("운영/협업", "컨테이너"),
    ("도구", "Kubernetes"): ("운영/협업", "컨테이너"),
    ("도구", "AWS EC2"): ("운영/협업", "클라우드 배포"),
    ("도구", "PostgreSQL"): ("백엔드", "데이터 모델링"),
    ("도구", "pgvector"): ("AI", "RAG 설계"),
}

OLD_SKILLS = [
    ("CS", "OS", "프로세스, 스레드, 메모리, 동시성 이해"),
    ("CS", "DB", "정규화, 인덱스, 트랜잭션, 쿼리 최적화"),
    ("언어", "JavaScript", "브라우저 및 Node.js 기반 개발 역량"),
    ("언어", "TypeScript", "정적 타입 기반 프론트엔드/백엔드 개발"),
    ("언어", "C", "시스템 프로그래밍 기본기"),
    ("프레임워크", "Spring", "Spring 기반 애플리케이션 개발"),
    ("프레임워크", "Spring Boot", "REST API와 운영형 백엔드 구성"),
    ("프레임워크", "FastAPI", "Python 기반 비동기 API 개발"),
    ("프레임워크", "React", "컴포넌트 기반 UI 개발"),
    ("프레임워크", "LangChain", "LLM 체인과 RAG 구성"),
    ("프레임워크", "LangGraph", "상태 기반 Agent 워크플로우 구성"),
    ("도구", "GitHub", "협업, PR, Actions 기반 개발 흐름"),
    ("도구", "Docker", "컨테이너 이미지와 Compose 기반 실행"),
    ("도구", "Kubernetes", "컨테이너 오케스트레이션 기본 운영"),
    ("도구", "AWS EC2", "EC2 기반 서버 배포와 운영"),
    ("도구", "PostgreSQL", "PostgreSQL 운영과 쿼리 최적화"),
    ("도구", "pgvector", "벡터 검색 기반 RAG 저장소 구성"),
]


def upgrade() -> None:
    bind = op.get_bind()
    for category, name, description in NEW_SKILLS:
        bind.execute(
            sa.text(
                """
                INSERT INTO skills (category, name, description)
                VALUES (:category, :name, :description)
                ON CONFLICT (category, name)
                DO UPDATE SET description = EXCLUDED.description
                """
            ),
            {"category": category, "name": name, "description": description},
        )

    for old_key, new_key in OLD_TO_NEW.items():
        _merge_skill(bind, old_key, new_key)


def downgrade() -> None:
    bind = op.get_bind()
    for category, name, description in OLD_SKILLS:
        bind.execute(
            sa.text(
                """
                INSERT INTO skills (category, name, description)
                VALUES (:category, :name, :description)
                ON CONFLICT (category, name)
                DO UPDATE SET description = EXCLUDED.description
                """
            ),
            {"category": category, "name": name, "description": description},
        )

    for old_key, new_key in reversed(list(OLD_TO_NEW.items())):
        _merge_skill(bind, new_key, old_key)


def _merge_skill(bind: sa.Connection, source: tuple[str, str], target: tuple[str, str]) -> None:
    source_id = bind.execute(
        sa.text("SELECT id FROM skills WHERE category = :category AND name = :name"),
        {"category": source[0], "name": source[1]},
    ).scalar_one_or_none()
    target_id = bind.execute(
        sa.text("SELECT id FROM skills WHERE category = :category AND name = :name"),
        {"category": target[0], "name": target[1]},
    ).scalar_one_or_none()
    if source_id is None or target_id is None or source_id == target_id:
        return

    bind.execute(
        sa.text(
            """
            DELETE FROM user_skills source
            USING user_skills target
            WHERE source.skill_id = :source_id
              AND target.skill_id = :target_id
              AND source.user_id = target.user_id
            """
        ),
        {"source_id": source_id, "target_id": target_id},
    )
    bind.execute(
        sa.text("UPDATE user_skills SET skill_id = :target_id WHERE skill_id = :source_id"),
        {"source_id": source_id, "target_id": target_id},
    )
    bind.execute(
        sa.text(
            "UPDATE post_stat_requirements SET skill_id = :target_id WHERE skill_id = :source_id"
        ),
        {"source_id": source_id, "target_id": target_id},
    )
    bind.execute(sa.text("DELETE FROM skills WHERE id = :source_id"), {"source_id": source_id})
