"""
Satya Healthcare - Recommendation Engine
AI-powered provider recommendation system
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
import statistics
import os
from models import (
    Authorization, ClaimPaid, Provider, Recommendation, 
    RecommendationItemBase, RecommendationStatus, TenantConfig,
    SimilarityConfig, CostConfig
)
from motor.motor_asyncio import AsyncIOMotorDatabase
from emergentintegrations.llm.chat import LlmChat, UserMessage
import logging

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """Engine for generating provider recommendations based on historical data."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.llm_key = os.environ.get("EMERGENT_LLM_KEY")
    
    async def get_tenant_config(self, tenant_id: str) -> TenantConfig:
        """Get tenant-specific configuration or defaults."""
        config = await self.db.tenant_configs.find_one(
            {"tenant_id": tenant_id}, {"_id": 0}
        )
        if config:
            return TenantConfig(**config)
        return TenantConfig(tenant_id=tenant_id)
    
    async def find_similar_claims(
        self, 
        authorization: Authorization,
        config: SimilarityConfig,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """Find similar historical claims based on configuration."""
        
        # Build match criteria
        match_criteria = {"tenant_id": authorization.tenant_id}
        
        if config.same_specialty:
            match_criteria["specialty"] = authorization.specialty
        
        if config.same_city:
            match_criteria["city"] = authorization.city
        
        if config.same_plan:
            match_criteria["plan_code"] = authorization.plan_code
        
        # Time window filter
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=config.time_window_months * 30)
        match_criteria["payment_date"] = {"$gte": cutoff_date.isoformat()}
        
        # Get procedure codes from authorization
        procedure_codes = [item.procedure_code for item in authorization.items]
        
        if config.same_procedure and procedure_codes:
            match_criteria["items.procedure_code"] = {"$in": procedure_codes}
        
        claims = await self.db.claims_paid.find(
            match_criteria, {"_id": 0}
        ).to_list(limit)
        
        return claims
    
    def calculate_provider_stats(
        self, 
        claims: List[Dict[str, Any]],
        cost_config: CostConfig
    ) -> Dict[str, Dict[str, Any]]:
        """Calculate cost statistics per provider."""
        
        provider_data = {}
        
        for claim in claims:
            provider_id = claim.get("provider_id")
            if not provider_id:
                continue
            
            if provider_id not in provider_data:
                provider_data[provider_id] = {
                    "costs": [],
                    "total_cases": 0,
                    "total_paid": 0,
                    "total_gloss": 0
                }
            
            provider_data[provider_id]["costs"].append(claim.get("total_paid", 0))
            provider_data[provider_id]["total_cases"] += 1
            provider_data[provider_id]["total_paid"] += claim.get("total_paid", 0)
            provider_data[provider_id]["total_gloss"] += claim.get("total_gloss", 0)
        
        # Calculate statistics
        result = {}
        for provider_id, data in provider_data.items():
            if data["total_cases"] < cost_config.min_cases:
                continue
            
            costs = data["costs"]
            
            # Remove outliers if configured
            if cost_config.outlier_removal and len(costs) > 10:
                lower = statistics.quantiles(costs, n=100)[int(cost_config.outlier_percentile) - 1]
                upper = statistics.quantiles(costs, n=100)[99 - int(cost_config.outlier_percentile)]
                costs = [c for c in costs if lower <= c <= upper]
            
            if not costs:
                continue
            
            # Calculate statistics
            if cost_config.calculation_method == "median":
                typical_cost = statistics.median(costs)
            else:
                typical_cost = statistics.mean(costs)
            
            quartiles = statistics.quantiles(costs, n=4) if len(costs) >= 4 else [typical_cost, typical_cost, typical_cost]
            
            result[provider_id] = {
                "median_cost": typical_cost,
                "p25_cost": quartiles[0],
                "p75_cost": quartiles[2] if len(quartiles) > 2 else quartiles[0],
                "case_count": data["total_cases"],
                "total_paid": data["total_paid"],
                "gloss_rate": data["total_gloss"] / data["total_paid"] if data["total_paid"] > 0 else 0
            }
        
        return result
    
    async def get_eligible_providers(
        self, 
        tenant_id: str,
        specialty: str,
        city: str,
        plan_code: str
    ) -> Dict[str, Dict[str, Any]]:
        """Get providers eligible for the network."""
        
        providers = await self.db.providers.find(
            {
                "tenant_id": tenant_id,
                "specialty": specialty,
                "city": city,
                "is_eligible": True
            },
            {"_id": 0}
        ).to_list(100)
        
        return {p["id"]: p for p in providers}
    
    def calculate_score(
        self,
        cost: float,
        max_cost: float,
        quality_score: float,
        distance_km: Optional[float] = None,
        gloss_rate: float = 0
    ) -> float:
        """Calculate recommendation score (lower is better)."""
        
        # Normalize cost (0-100)
        cost_score = (cost / max_cost * 100) if max_cost > 0 else 50
        
        # Quality score (0-100, inverted since higher quality is better)
        quality_component = (100 - quality_score * 10)
        
        # Distance penalty (0-20)
        distance_penalty = min((distance_km or 0) / 50 * 20, 20)
        
        # Gloss penalty (high gloss rate = bad)
        gloss_penalty = gloss_rate * 50
        
        # Final score (lower is better)
        score = cost_score * 0.5 + quality_component * 0.2 + distance_penalty * 0.15 + gloss_penalty * 0.15
        
        return round(score, 2)
    
    async def generate_ai_explanation(
        self,
        authorization: Authorization,
        recommendations: List[RecommendationItemBase]
    ) -> str:
        """Generate AI explanation for recommendations using GPT-5.2."""
        
        if not self.llm_key or not recommendations:
            return ""
        
        try:
            # Build context for AI
            procedures = ", ".join([item.procedure_name for item in authorization.items])
            
            top_providers = recommendations[:3]
            provider_info = "\n".join([
                f"- {r.provider_name}: Custo mediano R${r.median_cost:.2f}, {r.case_count} casos, "
                f"economia estimada R${r.estimated_savings:.2f}"
                for r in top_providers
            ])
            
            prompt = f"""Você é um consultor de saúde. Analise esta recomendação de prestadores para uma autorização médica.

Procedimentos solicitados: {procedures}
Especialidade: {authorization.specialty}
Cidade: {authorization.city}
Plano: {authorization.plan_name}

Top 3 Prestadores Recomendados:
{provider_info}

Forneça uma explicação concisa (máximo 3 frases) em português do porquê estas são as melhores opções considerando custo-benefício, qualidade e economia para a operadora."""

            chat = LlmChat(
                api_key=self.llm_key,
                session_id=f"recommendation-{authorization.id}",
                system_message="Você é um assistente especializado em análise de custos de saúde."
            ).with_model("openai", "gpt-5.2")
            
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            return response if isinstance(response, str) else str(response)
            
        except Exception as e:
            logger.error(f"Error generating AI explanation: {e}")
            return ""
    
    async def generate_recommendation(
        self,
        authorization: Authorization,
        user_id: str
    ) -> Recommendation:
        """Generate provider recommendations for an authorization."""
        
        # Get tenant config
        config = await self.get_tenant_config(authorization.tenant_id)
        
        # Find similar claims
        similar_claims = await self.find_similar_claims(
            authorization, 
            config.similarity_config
        )
        
        # Calculate provider statistics
        provider_stats = self.calculate_provider_stats(
            similar_claims, 
            config.cost_config
        )
        
        # Get eligible providers
        eligible_providers = await self.get_eligible_providers(
            authorization.tenant_id,
            authorization.specialty,
            authorization.city,
            authorization.plan_code
        )
        
        # Build recommendation items
        recommendation_items = []
        max_cost = max([s["median_cost"] for s in provider_stats.values()]) if provider_stats else 0
        
        # Calculate estimated cost from authorization
        estimated_cost = authorization.estimated_cost or sum(
            item.total_price or 0 for item in authorization.items
        )
        
        for provider_id, stats in provider_stats.items():
            provider = eligible_providers.get(provider_id)
            if not provider:
                # Try to get provider from database even if not in eligible list
                provider_doc = await self.db.providers.find_one(
                    {"id": provider_id, "tenant_id": authorization.tenant_id},
                    {"_id": 0}
                )
                if provider_doc:
                    provider = provider_doc
                else:
                    continue
            
            score = self.calculate_score(
                stats["median_cost"],
                max_cost,
                provider.get("quality_score", 5),
                provider.get("distance_km"),
                stats.get("gloss_rate", 0)
            )
            
            # Calculate estimated savings
            savings = max(0, estimated_cost - stats["median_cost"])
            
            item = RecommendationItemBase(
                provider_id=provider_id,
                provider_name=provider.get("name", ""),
                specialty=provider.get("specialty", ""),
                city=provider.get("city", ""),
                median_cost=round(stats["median_cost"], 2),
                p25_cost=round(stats["p25_cost"], 2),
                p75_cost=round(stats["p75_cost"], 2),
                case_count=stats["case_count"],
                distance_km=provider.get("distance_km"),
                is_eligible=provider.get("is_eligible", True),
                quality_score=provider.get("quality_score", 5),
                estimated_savings=round(savings, 2),
                score=score,
                justification=f"Baseado em {stats['case_count']} casos similares nos últimos meses."
            )
            
            recommendation_items.append(item)
        
        # Sort by score and assign ranks
        recommendation_items.sort(key=lambda x: x.score)
        for i, item in enumerate(recommendation_items):
            item.rank = i + 1
        
        # Limit to top 5
        recommendation_items = recommendation_items[:5]
        
        # Generate AI explanation
        ai_explanation = await self.generate_ai_explanation(
            authorization, 
            recommendation_items
        )
        
        # Create recommendation
        recommendation = Recommendation(
            tenant_id=authorization.tenant_id,
            authorization_id=authorization.id,
            status=RecommendationStatus.GENERATED,
            items=recommendation_items,
            ai_explanation=ai_explanation,
            created_by=user_id
        )
        
        return recommendation
