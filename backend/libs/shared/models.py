from pydantic import BaseModel, Field
from typing import Generic, TypeVar, Optional, Any
from datetime import datetime
from uuid import uuid4

T = TypeVar("T")


class TenantContext(BaseModel):
    tenant_id: str
    db_url: str
    schema_name: str


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Optional[dict[str, Any]] = None


class EventMessage(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: str
    tenant_id: str
    payload: dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
