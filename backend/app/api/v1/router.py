from fastapi import APIRouter

from app.api.v1.endpoints import auth, documents, jd, posts, recommendations, skills

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(posts.router, prefix="/posts", tags=["posts"])
api_router.include_router(skills.router, prefix="/skills", tags=["skills"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(jd.router, prefix="/jd", tags=["jd"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])
