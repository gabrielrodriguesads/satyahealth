"""
Satya Healthcare - Main FastAPI Application
Multi-tenant SaaS for Healthcare Provider Recommendations
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os
import logging
import csv
import io
import hashlib

from models import (
    Tenant, TenantCreate, User, UserCreate, UserLogin, UserWithToken, UserRole,
    Provider, ProviderCreate, Authorization, AuthorizationCreate, AuthorizationStatus,
    ClaimPaid, ClaimPaidCreate, Recommendation, RecommendationCreate, RecommendationStatus,
    TenantConfig, SimilarityConfig, CostConfig, AuditLog, DashboardStats, CSVImportResult,
    NetworkEligibility, IntegrationSource, IntegrationJob
)
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, require_roles, require_tenant_access
)
from recommendation_engine import RecommendationEngine

# Setup
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'satya_healthcare')]

# FastAPI app
app = FastAPI(
    title="Satya Healthcare API",
    description="Sistema Inteligente de Indicação de Rede para Operadoras de Saúde",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize recommendation engine
recommendation_engine = RecommendationEngine(db)


# Helper functions
def serialize_doc(doc: dict) -> dict:
    """Remove MongoDB _id from document."""
    if doc and "_id" in doc:
        del doc["_id"]
    return doc


async def log_audit(
    tenant_id: Optional[str],
    user_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    old_value: dict = None,
    new_value: dict = None
):
    """Log audit trail."""
    audit = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value=old_value,
        new_value=new_value
    )
    doc = audit.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.audit_logs.insert_one(doc)


def pseudonymize(value: str) -> str:
    """Create pseudonymized hash of a value."""
    return hashlib.sha256(value.encode()).hexdigest()[:16]


# ============== Health Check ==============
@api_router.get("/")
async def root():
    return {"message": "Satya Healthcare API", "version": "1.0.0"}


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# ============== Authentication ==============
@api_router.post("/auth/register", response_model=UserWithToken)
async def register(user_data: UserCreate):
    """Register a new user."""
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Check if tenant exists
    tenant = await db.tenants.find_one({"id": user_data.tenant_id})
    if not tenant:
        raise HTTPException(status_code=400, detail="Operadora não encontrada")
    
    # Create user
    user = User(
        tenant_id=user_data.tenant_id,
        email=user_data.email,
        name=user_data.name,
        role=user_data.role
    )
    
    # Store with hashed password
    user_doc = user.model_dump()
    user_doc["password_hash"] = get_password_hash(user_data.password)
    user_doc["created_at"] = user_doc["created_at"].isoformat()
    user_doc["updated_at"] = user_doc["updated_at"].isoformat()
    
    await db.users.insert_one(user_doc)
    
    # Create token
    token = create_access_token({
        "user_id": user.id,
        "tenant_id": user.tenant_id,
        "role": user.role,
        "email": user.email
    })
    
    await log_audit(user.tenant_id, user.id, "create", "user", user.id)
    
    return UserWithToken(user=user, token=token)


@api_router.post("/auth/login", response_model=UserWithToken)
async def login(credentials: UserLogin):
    """Login user."""
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not verify_password(credentials.password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not user_doc.get("is_active", True):
        raise HTTPException(status_code=401, detail="Usuário inativo")
    
    user = User(**serialize_doc(user_doc))
    
    token = create_access_token({
        "user_id": user.id,
        "tenant_id": user.tenant_id,
        "role": user.role,
        "email": user.email
    })
    
    return UserWithToken(user=user, token=token)


@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info."""
    user_doc = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return User(**user_doc)


# ============== Tenants (Satya Admin) ==============
@api_router.post("/tenants", response_model=Tenant)
async def create_tenant(
    tenant_data: TenantCreate,
    current_user: dict = Depends(require_roles(UserRole.SATYA_ADMIN))
):
    """Create a new tenant (operator)."""
    # Check if CNPJ exists
    existing = await db.tenants.find_one({"cnpj": tenant_data.cnpj})
    if existing:
        raise HTTPException(status_code=400, detail="CNPJ já cadastrado")
    
    tenant = Tenant(**tenant_data.model_dump())
    doc = tenant.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    
    await db.tenants.insert_one(doc)
    
    # Create default config
    config = TenantConfig(tenant_id=tenant.id)
    config_doc = config.model_dump()
    config_doc["created_at"] = config_doc["created_at"].isoformat()
    config_doc["updated_at"] = config_doc["updated_at"].isoformat()
    await db.tenant_configs.insert_one(config_doc)
    
    await log_audit(None, current_user["user_id"], "create", "tenant", tenant.id)
    
    return tenant


@api_router.get("/tenants", response_model=List[Tenant])
async def list_tenants(current_user: dict = Depends(require_roles(UserRole.SATYA_ADMIN))):
    """List all tenants."""
    tenants = await db.tenants.find({}, {"_id": 0}).to_list(100)
    return [Tenant(**t) for t in tenants]


@api_router.get("/tenants/{tenant_id}", response_model=Tenant)
async def get_tenant(tenant_id: str, current_user: dict = Depends(get_current_user)):
    """Get tenant details."""
    require_tenant_access(current_user, tenant_id)
    
    tenant = await db.tenants.find_one({"id": tenant_id}, {"_id": 0})
    if not tenant:
        raise HTTPException(status_code=404, detail="Operadora não encontrada")
    return Tenant(**tenant)


# ============== Users (Operator Admin) ==============
@api_router.get("/users", response_model=List[User])
async def list_users(current_user: dict = Depends(get_current_user)):
    """List users in tenant."""
    query = {}
    if current_user["role"] != UserRole.SATYA_ADMIN:
        query["tenant_id"] = current_user["tenant_id"]
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(100)
    return [User(**u) for u in users]


@api_router.put("/users/{user_id}/status")
async def toggle_user_status(
    user_id: str,
    is_active: bool,
    current_user: dict = Depends(require_roles(UserRole.SATYA_ADMIN, UserRole.OPERATOR_ADMIN))
):
    """Toggle user active status."""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    require_tenant_access(current_user, user["tenant_id"])
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": is_active, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True}


# ============== Providers ==============
@api_router.post("/providers", response_model=Provider)
async def create_provider(
    provider_data: ProviderCreate,
    current_user: dict = Depends(require_roles(UserRole.SATYA_ADMIN, UserRole.OPERATOR_ADMIN))
):
    """Create a new provider."""
    provider = Provider(
        tenant_id=current_user["tenant_id"],
        **provider_data.model_dump()
    )
    doc = provider.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    
    await db.providers.insert_one(doc)
    await log_audit(current_user["tenant_id"], current_user["user_id"], "create", "provider", provider.id)
    
    return provider


@api_router.get("/providers", response_model=List[Provider])
async def list_providers(
    specialty: Optional[str] = None,
    city: Optional[str] = None,
    is_eligible: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """List providers."""
    query = {"tenant_id": current_user["tenant_id"]}
    
    if specialty:
        query["specialty"] = specialty
    if city:
        query["city"] = city
    if is_eligible is not None:
        query["is_eligible"] = is_eligible
    
    providers = await db.providers.find(query, {"_id": 0}).to_list(500)
    return [Provider(**p) for p in providers]


@api_router.get("/providers/{provider_id}", response_model=Provider)
async def get_provider(provider_id: str, current_user: dict = Depends(get_current_user)):
    """Get provider details."""
    provider = await db.providers.find_one(
        {"id": provider_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    if not provider:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    return Provider(**provider)


@api_router.put("/providers/{provider_id}/eligibility")
async def update_provider_eligibility(
    provider_id: str,
    is_eligible: bool,
    current_user: dict = Depends(require_roles(UserRole.SATYA_ADMIN, UserRole.OPERATOR_ADMIN))
):
    """Update provider eligibility."""
    result = await db.providers.update_one(
        {"id": provider_id, "tenant_id": current_user["tenant_id"]},
        {"$set": {"is_eligible": is_eligible, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prestador não encontrado")
    
    return {"success": True}


# ============== Authorizations ==============
@api_router.post("/authorizations", response_model=Authorization)
async def create_authorization(
    auth_data: AuthorizationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new authorization (Guia TISS)."""
    auth = Authorization(
        tenant_id=current_user["tenant_id"],
        created_by=current_user["user_id"],
        **auth_data.model_dump()
    )
    doc = auth.model_dump()
    doc["items"] = [item.model_dump() for item in auth.items]
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    
    await db.authorizations.insert_one(doc)
    await log_audit(current_user["tenant_id"], current_user["user_id"], "create", "authorization", auth.id)
    
    return auth


@api_router.get("/authorizations", response_model=List[Authorization])
async def list_authorizations(
    status: Optional[AuthorizationStatus] = None,
    specialty: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """List authorizations."""
    query = {"tenant_id": current_user["tenant_id"]}
    
    if status:
        query["status"] = status
    if specialty:
        query["specialty"] = specialty
    
    authorizations = await db.authorizations.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    return [Authorization(**a) for a in authorizations]


@api_router.get("/authorizations/{auth_id}", response_model=Authorization)
async def get_authorization(auth_id: str, current_user: dict = Depends(get_current_user)):
    """Get authorization details."""
    auth = await db.authorizations.find_one(
        {"id": auth_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    if not auth:
        raise HTTPException(status_code=404, detail="Autorização não encontrada")
    return Authorization(**auth)


# ============== Claims Paid ==============
@api_router.post("/claims", response_model=ClaimPaid)
async def create_claim(
    claim_data: ClaimPaidCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new paid claim."""
    claim = ClaimPaid(
        tenant_id=current_user["tenant_id"],
        **claim_data.model_dump()
    )
    doc = claim.model_dump()
    doc["items"] = [item.model_dump() for item in claim.items]
    doc["created_at"] = doc["created_at"].isoformat()
    doc["payment_date"] = doc["payment_date"].isoformat()
    doc["service_date"] = doc["service_date"].isoformat()
    
    await db.claims_paid.insert_one(doc)
    
    return claim


@api_router.get("/claims", response_model=List[ClaimPaid])
async def list_claims(
    provider_id: Optional[str] = None,
    specialty: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    current_user: dict = Depends(get_current_user)
):
    """List paid claims."""
    query = {"tenant_id": current_user["tenant_id"]}
    
    if provider_id:
        query["provider_id"] = provider_id
    if specialty:
        query["specialty"] = specialty
    
    claims = await db.claims_paid.find(
        query, {"_id": 0}
    ).sort("payment_date", -1).limit(limit).to_list(limit)
    
    return [ClaimPaid(**c) for c in claims]


# ============== Recommendations ==============
@api_router.post("/recommendations", response_model=Recommendation)
async def generate_recommendation(
    rec_data: RecommendationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Generate recommendation for an authorization."""
    # Get authorization
    auth = await db.authorizations.find_one(
        {"id": rec_data.authorization_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    if not auth:
        raise HTTPException(status_code=404, detail="Autorização não encontrada")
    
    authorization = Authorization(**auth)
    
    # Generate recommendation
    recommendation = await recommendation_engine.generate_recommendation(
        authorization,
        current_user["user_id"]
    )
    
    # Save recommendation
    doc = recommendation.model_dump()
    doc["items"] = [item.model_dump() for item in recommendation.items]
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.recommendations.insert_one(doc)
    
    # Update authorization
    await db.authorizations.update_one(
        {"id": rec_data.authorization_id},
        {
            "$set": {
                "status": AuthorizationStatus.RECOMMENDED,
                "recommendation_id": recommendation.id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    await log_audit(
        current_user["tenant_id"], 
        current_user["user_id"], 
        "generate_recommendation", 
        "recommendation", 
        recommendation.id
    )
    
    return recommendation


@api_router.get("/recommendations", response_model=List[Recommendation])
async def list_recommendations(
    status: Optional[RecommendationStatus] = None,
    limit: int = Query(default=50, le=200),
    current_user: dict = Depends(get_current_user)
):
    """List recommendations."""
    query = {"tenant_id": current_user["tenant_id"]}
    
    if status:
        query["status"] = status
    
    recommendations = await db.recommendations.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [Recommendation(**r) for r in recommendations]


@api_router.get("/recommendations/{rec_id}", response_model=Recommendation)
async def get_recommendation(rec_id: str, current_user: dict = Depends(get_current_user)):
    """Get recommendation details."""
    rec = await db.recommendations.find_one(
        {"id": rec_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Recomendação não encontrada")
    return Recommendation(**rec)


@api_router.post("/recommendations/{rec_id}/select")
async def select_provider(
    rec_id: str,
    provider_id: str,
    reason: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Select a provider from recommendation."""
    rec = await db.recommendations.find_one(
        {"id": rec_id, "tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Recomendação não encontrada")
    
    # Check if provider is in recommendation
    rec_obj = Recommendation(**rec)
    provider_in_rec = any(item.provider_id == provider_id for item in rec_obj.items)
    
    status = RecommendationStatus.SELECTED if provider_in_rec else RecommendationStatus.OVERRIDDEN
    
    await db.recommendations.update_one(
        {"id": rec_id},
        {
            "$set": {
                "status": status,
                "selected_provider_id": provider_id,
                "selection_reason": reason,
                "override_reason": reason if not provider_in_rec else None,
                "selected_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Update authorization
    await db.authorizations.update_one(
        {"id": rec_obj.authorization_id},
        {
            "$set": {
                "status": AuthorizationStatus.APPROVED,
                "selected_provider_id": provider_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    await log_audit(
        current_user["tenant_id"],
        current_user["user_id"],
        "select_provider",
        "recommendation",
        rec_id,
        new_value={"provider_id": provider_id, "reason": reason}
    )
    
    return {"success": True, "status": status}


# ============== Tenant Configuration ==============
@api_router.get("/config", response_model=TenantConfig)
async def get_config(current_user: dict = Depends(get_current_user)):
    """Get tenant configuration."""
    config = await db.tenant_configs.find_one(
        {"tenant_id": current_user["tenant_id"]},
        {"_id": 0}
    )
    if not config:
        return TenantConfig(tenant_id=current_user["tenant_id"])
    return TenantConfig(**config)


@api_router.put("/config")
async def update_config(
    similarity_config: Optional[SimilarityConfig] = None,
    cost_config: Optional[CostConfig] = None,
    current_user: dict = Depends(require_roles(UserRole.SATYA_ADMIN, UserRole.OPERATOR_ADMIN))
):
    """Update tenant configuration."""
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if similarity_config:
        update_data["similarity_config"] = similarity_config.model_dump()
    if cost_config:
        update_data["cost_config"] = cost_config.model_dump()
    
    await db.tenant_configs.update_one(
        {"tenant_id": current_user["tenant_id"]},
        {"$set": update_data},
        upsert=True
    )
    
    return {"success": True}


# ============== Dashboard Statistics ==============
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics."""
    tenant_id = current_user["tenant_id"]
    
    # Total authorizations
    total_auths = await db.authorizations.count_documents({"tenant_id": tenant_id})
    pending_auths = await db.authorizations.count_documents(
        {"tenant_id": tenant_id, "status": AuthorizationStatus.PENDING}
    )
    
    # Recommendations stats
    total_recs = await db.recommendations.count_documents({"tenant_id": tenant_id})
    recs_followed = await db.recommendations.count_documents(
        {"tenant_id": tenant_id, "status": RecommendationStatus.SELECTED}
    )
    
    adherence_rate = (recs_followed / total_recs * 100) if total_recs > 0 else 0
    
    # Calculate savings
    pipeline = [
        {"$match": {"tenant_id": tenant_id, "status": RecommendationStatus.SELECTED}},
        {"$unwind": "$items"},
        {"$match": {"$expr": {"$eq": ["$items.provider_id", "$selected_provider_id"]}}},
        {"$group": {"_id": None, "total_savings": {"$sum": "$items.estimated_savings"}}}
    ]
    
    savings_result = await db.recommendations.aggregate(pipeline).to_list(1)
    total_savings = savings_result[0]["total_savings"] if savings_result else 0
    
    avg_savings = total_savings / recs_followed if recs_followed > 0 else 0
    
    # Top procedures by volume
    proc_pipeline = [
        {"$match": {"tenant_id": tenant_id}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.procedure_code",
            "name": {"$first": "$items.procedure_name"},
            "count": {"$sum": 1},
            "total_cost": {"$sum": "$items.total_price"}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_procedures = await db.authorizations.aggregate(proc_pipeline).to_list(5)
    
    # Top providers by savings
    prov_pipeline = [
        {"$match": {"tenant_id": tenant_id, "status": RecommendationStatus.SELECTED}},
        {"$unwind": "$items"},
        {"$match": {"$expr": {"$eq": ["$items.provider_id", "$selected_provider_id"]}}},
        {"$group": {
            "_id": "$items.provider_id",
            "name": {"$first": "$items.provider_name"},
            "savings": {"$sum": "$items.estimated_savings"},
            "cases": {"$sum": 1}
        }},
        {"$sort": {"savings": -1}},
        {"$limit": 5}
    ]
    top_providers = await db.recommendations.aggregate(prov_pipeline).to_list(5)
    
    return DashboardStats(
        total_authorizations=total_auths,
        pending_authorizations=pending_auths,
        total_recommendations=total_recs,
        recommendations_followed=recs_followed,
        adherence_rate=round(adherence_rate, 1),
        total_savings=round(total_savings, 2),
        average_savings_per_case=round(avg_savings, 2),
        top_procedures=[{"code": p["_id"], "name": p.get("name", ""), "count": p["count"]} for p in top_procedures],
        top_providers=[{"id": p["_id"], "name": p.get("name", ""), "savings": p["savings"], "cases": p["cases"]} for p in top_providers]
    )


# ============== CSV Import ==============
@api_router.post("/import/providers", response_model=CSVImportResult)
async def import_providers_csv(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles(UserRole.SATYA_ADMIN, UserRole.OPERATOR_ADMIN))
):
    """Import providers from CSV."""
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    imported = 0
    failed = 0
    errors = []
    
    for row in reader:
        try:
            provider = Provider(
                tenant_id=current_user["tenant_id"],
                name=row.get("name", ""),
                cnpj=row.get("cnpj", ""),
                specialty=row.get("specialty", ""),
                city=row.get("city", ""),
                state=row.get("state", ""),
                address=row.get("address"),
                phone=row.get("phone")
            )
            doc = provider.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            doc["updated_at"] = doc["updated_at"].isoformat()
            await db.providers.insert_one(doc)
            imported += 1
        except Exception as e:
            failed += 1
            errors.append(str(e)[:100])
    
    return CSVImportResult(
        success=failed == 0,
        records_imported=imported,
        records_failed=failed,
        errors=errors[:10]
    )


@api_router.post("/import/claims", response_model=CSVImportResult)
async def import_claims_csv(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles(UserRole.SATYA_ADMIN, UserRole.OPERATOR_ADMIN))
):
    """Import paid claims from CSV."""
    content = await file.read()
    decoded = content.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    imported = 0
    failed = 0
    errors = []
    
    for row in reader:
        try:
            claim = ClaimPaid(
                tenant_id=current_user["tenant_id"],
                claim_number=row.get("claim_number", ""),
                provider_id=row.get("provider_id", ""),
                beneficiary_hash=pseudonymize(row.get("beneficiary_id", "")),
                plan_code=row.get("plan_code", ""),
                plan_name=row.get("plan_name", ""),
                specialty=row.get("specialty", ""),
                city=row.get("city", ""),
                state=row.get("state", ""),
                total_authorized=float(row.get("total_authorized", 0)),
                total_paid=float(row.get("total_paid", 0)),
                total_gloss=float(row.get("total_gloss", 0)),
                payment_date=datetime.fromisoformat(row.get("payment_date", datetime.now(timezone.utc).isoformat())),
                service_date=datetime.fromisoformat(row.get("service_date", datetime.now(timezone.utc).isoformat()))
            )
            doc = claim.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            doc["payment_date"] = doc["payment_date"].isoformat()
            doc["service_date"] = doc["service_date"].isoformat()
            await db.claims_paid.insert_one(doc)
            imported += 1
        except Exception as e:
            failed += 1
            errors.append(str(e)[:100])
    
    return CSVImportResult(
        success=failed == 0,
        records_imported=imported,
        records_failed=failed,
        errors=errors[:10]
    )


# ============== Audit Logs ==============
@api_router.get("/audit-logs")
async def list_audit_logs(
    entity_type: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    current_user: dict = Depends(require_roles(UserRole.SATYA_ADMIN, UserRole.OPERATOR_ADMIN))
):
    """List audit logs."""
    query = {}
    if current_user["role"] != UserRole.SATYA_ADMIN:
        query["tenant_id"] = current_user["tenant_id"]
    if entity_type:
        query["entity_type"] = entity_type
    
    logs = await db.audit_logs.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return logs


# Include router
app.include_router(api_router)


@app.on_event("startup")
async def startup_event():
    """Initialize database indexes."""
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("tenant_id")
    await db.tenants.create_index("cnpj", unique=True)
    await db.providers.create_index([("tenant_id", 1), ("specialty", 1), ("city", 1)])
    await db.authorizations.create_index([("tenant_id", 1), ("status", 1)])
    await db.claims_paid.create_index([("tenant_id", 1), ("provider_id", 1), ("specialty", 1)])
    await db.recommendations.create_index([("tenant_id", 1), ("authorization_id", 1)])
    
    logger.info("Database indexes created")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
