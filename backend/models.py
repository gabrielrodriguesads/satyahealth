"""
Satya Healthcare - MongoDB Models
Multi-tenant SaaS for Healthcare Provider Recommendations
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


def generate_uuid() -> str:
    return str(uuid.uuid4())


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


# Enums
class UserRole(str, Enum):
    SATYA_ADMIN = "satya_admin"
    OPERATOR_ADMIN = "operator_admin"
    OPERATOR_USER = "operator_user"
    AUDITOR = "auditor"


class AuthorizationStatus(str, Enum):
    PENDING = "pending"
    RECOMMENDED = "recommended"
    APPROVED = "approved"
    REJECTED = "rejected"


class IntegrationStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"


class RecommendationStatus(str, Enum):
    GENERATED = "generated"
    SELECTED = "selected"
    OVERRIDDEN = "overridden"
    EXPIRED = "expired"


# Base Models
class TenantBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_uuid)
    name: str
    cnpj: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)


class TenantCreate(BaseModel):
    name: str
    cnpj: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None


class Tenant(TenantBase):
    pass


# User Models
class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_uuid)
    tenant_id: str
    email: str
    name: str
    role: UserRole
    is_active: bool = True
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)


class UserCreate(BaseModel):
    tenant_id: str
    email: str
    name: str
    password: str
    role: UserRole = UserRole.OPERATOR_USER


class UserLogin(BaseModel):
    email: str
    password: str


class User(UserBase):
    pass


class UserWithToken(BaseModel):
    user: User
    token: str


# Provider Models
class ProviderBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_uuid)
    tenant_id: str
    name: str
    cnpj: str
    specialty: str
    city: str
    state: str
    address: Optional[str] = None
    phone: Optional[str] = None
    is_eligible: bool = True
    quality_score: float = 0.0
    average_cost: float = 0.0
    total_cases: int = 0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)


class ProviderCreate(BaseModel):
    name: str
    cnpj: str
    specialty: str
    city: str
    state: str
    address: Optional[str] = None
    phone: Optional[str] = None


class Provider(ProviderBase):
    pass


# Authorization (Guia TISS) Models
class AuthorizationItemBase(BaseModel):
    procedure_code: str
    procedure_name: str
    quantity: int = 1
    unit_price: Optional[float] = None
    total_price: Optional[float] = None


class AuthorizationBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_uuid)
    tenant_id: str
    guide_number: str
    beneficiary_hash: str  # Pseudonymized beneficiary ID
    beneficiary_name_hash: str  # Pseudonymized name
    plan_code: str
    plan_name: str
    specialty: str
    city: str
    state: str
    items: List[AuthorizationItemBase] = []
    status: AuthorizationStatus = AuthorizationStatus.PENDING
    requested_provider_id: Optional[str] = None
    selected_provider_id: Optional[str] = None
    recommendation_id: Optional[str] = None
    estimated_cost: float = 0.0
    created_by: str
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)


class AuthorizationCreate(BaseModel):
    guide_number: str
    beneficiary_hash: str
    beneficiary_name_hash: str
    plan_code: str
    plan_name: str
    specialty: str
    city: str
    state: str
    items: List[AuthorizationItemBase] = []
    requested_provider_id: Optional[str] = None
    estimated_cost: float = 0.0


class Authorization(AuthorizationBase):
    pass


# Claim Paid (Contas Médicas Pagas) Models
class ClaimPaidItemBase(BaseModel):
    procedure_code: str
    procedure_name: str
    quantity: int = 1
    authorized_value: float = 0.0
    paid_value: float = 0.0
    gloss_value: float = 0.0


class ClaimPaidBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_uuid)
    tenant_id: str
    claim_number: str
    authorization_id: Optional[str] = None
    provider_id: str
    beneficiary_hash: str
    plan_code: str
    plan_name: str
    specialty: str
    city: str
    state: str
    items: List[ClaimPaidItemBase] = []
    total_authorized: float = 0.0
    total_paid: float = 0.0
    total_gloss: float = 0.0
    payment_date: datetime
    service_date: datetime
    created_at: datetime = Field(default_factory=get_utc_now)


class ClaimPaidCreate(BaseModel):
    claim_number: str
    authorization_id: Optional[str] = None
    provider_id: str
    beneficiary_hash: str
    plan_code: str
    plan_name: str
    specialty: str
    city: str
    state: str
    items: List[ClaimPaidItemBase] = []
    total_authorized: float = 0.0
    total_paid: float = 0.0
    total_gloss: float = 0.0
    payment_date: datetime
    service_date: datetime


class ClaimPaid(ClaimPaidBase):
    pass


# Recommendation Models
class RecommendationItemBase(BaseModel):
    provider_id: str
    provider_name: str
    specialty: str
    city: str
    median_cost: float
    p25_cost: float
    p75_cost: float
    case_count: int
    distance_km: Optional[float] = None
    is_eligible: bool = True
    quality_score: float = 0.0
    estimated_savings: float = 0.0
    score: float = 0.0
    rank: int = 0
    justification: str = ""


class RecommendationBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_uuid)
    tenant_id: str
    authorization_id: str
    status: RecommendationStatus = RecommendationStatus.GENERATED
    items: List[RecommendationItemBase] = []
    selected_provider_id: Optional[str] = None
    selection_reason: Optional[str] = None
    override_reason: Optional[str] = None
    ai_explanation: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=get_utc_now)
    selected_at: Optional[datetime] = None


class RecommendationCreate(BaseModel):
    authorization_id: str


class Recommendation(RecommendationBase):
    pass


# Network Eligibility
class NetworkEligibilityBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_uuid)
    tenant_id: str
    provider_id: str
    plan_code: str
    city: str
    state: str
    is_eligible: bool = True
    effective_from: datetime
    effective_to: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_utc_now)


class NetworkEligibility(NetworkEligibilityBase):
    pass


# Tenant Configuration
class SimilarityConfig(BaseModel):
    same_procedure: bool = True
    same_specialty: bool = True
    same_city: bool = True
    same_plan: bool = True
    time_window_months: int = 12
    procedure_weight: float = 0.4
    specialty_weight: float = 0.2
    city_weight: float = 0.2
    plan_weight: float = 0.2


class CostConfig(BaseModel):
    calculation_method: str = "median"  # median or average
    time_window_months: int = 12
    min_cases: int = 10
    outlier_removal: bool = True
    outlier_percentile: float = 5.0  # Remove top/bottom 5%


class TenantConfigBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_uuid)
    tenant_id: str
    similarity_config: SimilarityConfig = Field(default_factory=SimilarityConfig)
    cost_config: CostConfig = Field(default_factory=CostConfig)
    created_at: datetime = Field(default_factory=get_utc_now)
    updated_at: datetime = Field(default_factory=get_utc_now)


class TenantConfig(TenantConfigBase):
    pass


# Integration Models
class IntegrationSourceBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_uuid)
    tenant_id: str
    name: str
    source_type: str  # csv, api
    config: Dict[str, Any] = {}
    field_mapping: Dict[str, str] = {}
    status: IntegrationStatus = IntegrationStatus.ACTIVE
    last_sync: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_utc_now)


class IntegrationSource(IntegrationSourceBase):
    pass


class IntegrationJobBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_uuid)
    tenant_id: str
    source_id: str
    status: str = "pending"  # pending, running, completed, failed
    records_processed: int = 0
    records_failed: int = 0
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=get_utc_now)


class IntegrationJob(IntegrationJobBase):
    pass


# Audit Log
class AuditLogBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=generate_uuid)
    tenant_id: Optional[str] = None
    user_id: str
    action: str
    entity_type: str
    entity_id: str
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = Field(default_factory=get_utc_now)


class AuditLog(AuditLogBase):
    pass


# Dashboard Statistics
class DashboardStats(BaseModel):
    total_authorizations: int = 0
    pending_authorizations: int = 0
    total_recommendations: int = 0
    recommendations_followed: int = 0
    adherence_rate: float = 0.0
    total_savings: float = 0.0
    average_savings_per_case: float = 0.0
    top_procedures: List[Dict[str, Any]] = []
    top_providers: List[Dict[str, Any]] = []


# CSV Import Models
class CSVImportResult(BaseModel):
    success: bool
    records_imported: int = 0
    records_failed: int = 0
    errors: List[str] = []
