"""
Satya Healthcare - Seed Script
Creates initial data for testing and demo
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os
import random
from dotenv import load_dotenv
from pathlib import Path
import hashlib

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Password hash for "admin123"
PASSWORD_HASH = "$2b$12$3GLVlVb/awSpFucz8cUw5ua7OI7qTxtceXILR0RtW1fvoiJofN.e2"


async def seed_database():
    """Seed the database with initial data."""
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'satya_healthcare')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("Starting database seed...")
    
    # Clear existing data
    await db.tenants.delete_many({})
    await db.users.delete_many({})
    await db.providers.delete_many({})
    await db.authorizations.delete_many({})
    await db.claims_paid.delete_many({})
    await db.recommendations.delete_many({})
    await db.tenant_configs.delete_many({})
    
    print("Cleared existing data")
    
    # Create Satya tenant (platform admin)
    satya_tenant = {
        "id": "satya-tenant-001",
        "name": "Satya Healthcare (Admin)",
        "cnpj": "00.000.000/0001-00",
        "email": "admin@satya.com",
        "phone": "(11) 99999-0000",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tenants.insert_one(satya_tenant)
    
    # Create demo operator tenant
    demo_tenant = {
        "id": "demo-tenant-001",
        "name": "Operadora Saúde Total",
        "cnpj": "12.345.678/0001-00",
        "email": "contato@saudetotal.com",
        "phone": "(11) 3333-4444",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tenants.insert_one(demo_tenant)
    
    print("Created tenants")
    
    # Create Satya admin user
    satya_admin = {
        "id": "satya-admin-001",
        "tenant_id": "satya-tenant-001",
        "email": "admin@satya.com",
        "name": "Admin Satya",
        "role": "satya_admin",
        "password_hash": PASSWORD_HASH,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(satya_admin)
    
    # Create demo operator admin
    operator_admin = {
        "id": "operator-admin-001",
        "tenant_id": "demo-tenant-001",
        "email": "admin@saudetotal.com",
        "name": "Maria Silva",
        "role": "operator_admin",
        "password_hash": PASSWORD_HASH,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(operator_admin)
    
    # Create demo operator user
    operator_user = {
        "id": "operator-user-001",
        "tenant_id": "demo-tenant-001",
        "email": "usuario@saudetotal.com",
        "name": "João Santos",
        "role": "operator_user",
        "password_hash": PASSWORD_HASH,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(operator_user)
    
    print("Created users")
    
    # Create providers - Multiple providers per specialty/city combination for better recommendations
    specialties = ["Cardiologia", "Ortopedia", "Oftalmologia"]
    cities = ["São Paulo", "Rio de Janeiro"]
    states = {"São Paulo": "SP", "Rio de Janeiro": "RJ"}
    
    provider_templates = [
        "Hospital", "Clínica", "Centro Médico", "Instituto", "Ambulatório"
    ]
    
    providers = []
    provider_counter = 0
    
    # Create 3-4 providers for each specialty/city combination
    for specialty in specialties:
        for city in cities:
            num_providers = random.randint(3, 4)
            for i in range(num_providers):
                provider_counter += 1
                template = provider_templates[i % len(provider_templates)]
                name = f"{template} {specialty.split()[0]} {city.split()[0]} {i+1}"
                
                provider = {
                    "id": f"provider-{provider_counter:03d}",
                    "tenant_id": "demo-tenant-001",
                    "name": name,
                    "cnpj": f"{10+provider_counter}.{100+i}.000/0001-{provider_counter:02d}",
                    "specialty": specialty,
                    "city": city,
                    "state": states[city],
                    "address": f"Av. Principal, {100 + provider_counter * 10}",
                    "phone": f"(11) 9{random.randint(1000, 9999)}-{random.randint(1000, 9999)}",
                    "is_eligible": True,  # All providers eligible for demo
                    "quality_score": round(random.uniform(6.5, 9.5), 1),
                    "average_cost": round(random.uniform(1000, 4000), 2),
                    "total_cases": random.randint(50, 200),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                providers.append(provider)
    
    await db.providers.insert_many(providers)
    print(f"Created {len(providers)} providers")
    
    # Create claims paid (historical data) - ensure sufficient data per provider/specialty/city
    procedures = [
        ("10101012", "Consulta em consultório"),
        ("20201014", "Eletrocardiograma"),
        ("30301016", "Raio-X de tórax"),
        ("40104018", "Cirurgia cardíaca"),
        ("50105020", "Ressonância magnética"),
    ]
    
    plans = [("PLAN001", "Plano Básico"), ("PLAN002", "Plano Plus"), ("PLAN003", "Plano Premium")]
    
    claims = []
    claim_counter = 0
    
    # Create at least 15 claims per provider to ensure min_cases threshold (10) is met
    for provider in providers:
        num_claims = random.randint(15, 30)  # Each provider gets 15-30 claims
        base_cost = random.uniform(800, 2500)  # Base cost varies by provider
        
        for j in range(num_claims):
            claim_counter += 1
            procedure = random.choice(procedures)
            plan = random.choice(plans)
            
            # Add some variation to cost
            variation = random.uniform(0.85, 1.15)
            paid = round(base_cost * variation, 2)
            gloss = round(random.uniform(0, paid * 0.08), 2) if random.random() > 0.75 else 0
            
            claim = {
                "id": f"claim-{claim_counter:04d}",
                "tenant_id": "demo-tenant-001",
                "claim_number": f"CLM{2024}{claim_counter:05d}",
                "provider_id": provider["id"],
                "beneficiary_hash": hashlib.sha256(f"BEN{claim_counter}".encode()).hexdigest()[:16],
                "plan_code": plan[0],
                "plan_name": plan[1],
                "specialty": provider["specialty"],
                "city": provider["city"],
                "state": provider["state"],
                "items": [{
                    "procedure_code": procedure[0],
                    "procedure_name": procedure[1],
                    "quantity": 1,
                    "authorized_value": paid + gloss,
                    "paid_value": paid,
                    "gloss_value": gloss
                }],
                "total_authorized": paid + gloss,
                "total_paid": paid,
                "total_gloss": gloss,
                "payment_date": (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 300))).isoformat(),
                "service_date": (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 300))).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            claims.append(claim)
    
    await db.claims_paid.insert_many(claims)
    print(f"Created {len(claims)} paid claims")
    
    # Create authorizations - ensure they match existing provider specialties/cities for recommendation engine
    authorizations = []
    for i in range(20):
        # Pick a provider to base the authorization on - this ensures matching specialty/city/plan
        base_provider = providers[i % len(providers)]
        procedure = random.choice(procedures)
        plan = random.choice(plans)
        
        auth = {
            "id": f"auth-{i+1:04d}",
            "tenant_id": "demo-tenant-001",
            "guide_number": f"GUIA{2024}{i+1:05d}",
            "beneficiary_hash": hashlib.sha256(f"BEN{i}".encode()).hexdigest()[:16],
            "beneficiary_name_hash": hashlib.sha256(f"NAME{i}".encode()).hexdigest()[:16],
            "plan_code": plan[0],
            "plan_name": plan[1],
            "specialty": base_provider["specialty"],  # Match provider specialty
            "city": base_provider["city"],  # Match provider city
            "state": base_provider["state"],
            "items": [{
                "procedure_code": procedure[0],
                "procedure_name": procedure[1],
                "quantity": 1,
                "unit_price": round(random.uniform(1500, 4000), 2),
                "total_price": round(random.uniform(1500, 4000), 2)
            }],
            "status": "pending",  # All start as pending
            "estimated_cost": round(random.uniform(2000, 5000), 2),
            "created_by": "operator-user-001",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(0, 30))).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        authorizations.append(auth)
    
    await db.authorizations.insert_many(authorizations)
    print(f"Created {len(authorizations)} authorizations")
    
    # Create tenant config with relaxed settings for demo
    tenant_config = {
        "id": "config-001",
        "tenant_id": "demo-tenant-001",
        "similarity_config": {
            "same_procedure": False,  # Relaxed - don't require exact procedure match
            "same_specialty": True,
            "same_city": True,
            "same_plan": False,  # Relaxed - don't require exact plan match
            "time_window_months": 12,
            "procedure_weight": 0.4,
            "specialty_weight": 0.2,
            "city_weight": 0.2,
            "plan_weight": 0.2
        },
        "cost_config": {
            "calculation_method": "median",
            "time_window_months": 12,
            "min_cases": 5,  # Lower threshold for demo
            "outlier_removal": True,
            "outlier_percentile": 5.0
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tenant_configs.insert_one(tenant_config)
    
    print("Created tenant config")
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("tenant_id")
    await db.tenants.create_index("cnpj", unique=True)
    await db.providers.create_index([("tenant_id", 1), ("specialty", 1), ("city", 1)])
    await db.authorizations.create_index([("tenant_id", 1), ("status", 1)])
    await db.claims_paid.create_index([("tenant_id", 1), ("provider_id", 1), ("specialty", 1)])
    
    print("Created indexes")
    
    client.close()
    
    print("\n" + "="*50)
    print("SEED COMPLETE!")
    print("="*50)
    print("\nLogin credentials:")
    print("-" * 30)
    print("Satya Admin:")
    print("  Email: admin@satya.com")
    print("  Password: admin123")
    print("-" * 30)
    print("Operator Admin:")
    print("  Email: admin@saudetotal.com")
    print("  Password: admin123")
    print("-" * 30)
    print("Operator User:")
    print("  Email: usuario@saudetotal.com")
    print("  Password: admin123")
    print("="*50)


if __name__ == "__main__":
    asyncio.run(seed_database())
