# Satya Healthcare - PRD (Product Requirements Document)

## Problem Statement
Sistema Inteligente de Indicação de Rede para Operadoras de Saúde - SaaS multi-tenant para operadoras de plano de saúde que analisa autorizações médicas (Guias TISS) e recomenda prestadores elegíveis com menor custo histórico baseado em contas médicas pagas.

## Core Requirements
- Multi-tenant architecture with tenant_id isolation
- JWT-based authentication with RBAC
- Provider recommendation engine based on historical claims
- GPT-5.2 AI integration for explainable recommendations
- CSV import for providers and claims
- Dashboard with economy metrics

## User Personas
1. **Satya Admin** - Platform administrator, manages all operators
2. **Operator Admin** - Operator administrator, manages users, providers, configs
3. **Operator User** - Authorization analyst, creates guides, selects providers
4. **Auditor** - Reviews decisions and recommendations

## What's Been Implemented (2026-02-25)

### Backend (FastAPI + MongoDB)
- [x] Multi-tenant data models (Tenant, User, Provider, Authorization, ClaimPaid, Recommendation)
- [x] JWT authentication with role-based access control
- [x] Recommendation engine with similarity matching and cost calculation
- [x] GPT-5.2 integration for AI explanations
- [x] CSV import endpoints for providers and claims
- [x] Dashboard statistics API
- [x] Audit logging
- [x] Tenant configuration management

### Frontend (React + Tailwind + Shadcn UI)
- [x] Login/Register pages
- [x] Dashboard with economy charts
- [x] Authorizations management (list, create, generate recommendation)
- [x] Recommendations list and detail view with provider cards
- [x] **NEW: Side-by-side provider comparison feature**
  - Checkbox selection for up to 4 providers
  - Floating comparison bar with quick actions
  - Full comparison sheet with metrics:
    - Cost comparison with best/worst indicators
    - Savings comparison with percentage
    - Cases count with progress bars
    - Quality score with star ratings
    - Eligibility status
  - AI recommendation summary
  - Direct selection from comparison view
- [x] Providers management with eligibility toggle
- [x] Tenants management (Satya Admin only)
- [x] Users management
- [x] CSV Import page
- [x] Analytics page with charts
- [x] Settings page (recommendation engine config)
- [x] Audit logs page

### Database Seed
- Demo tenant: "Operadora Saúde Total"
- 21 providers (3-4 per specialty/city)
- 452 historical paid claims
- 20 authorizations

## Login Credentials
- Satya Admin: admin@satya.com / admin123
- Operator Admin: admin@saudetotal.com / admin123
- Operator User: usuario@saudetotal.com / admin123

## Prioritized Backlog

### P0 (MVP Complete)
- [x] Core authentication
- [x] Authorization management
- [x] Recommendation generation
- [x] Provider management

### P1 (Phase 2)
- [ ] Real API integrations (TISS)
- [ ] Advanced analytics with drill-down
- [ ] Email notifications
- [ ] Multi-language support

### P2 (Phase 3)
- [ ] Machine learning model for cost prediction
- [ ] Dynamic recommendation based on real-time data
- [ ] White-label theming per tenant
- [ ] Mobile responsive improvements

## Next Tasks
1. Add network eligibility rules by plan/region
2. Implement gloss alerts for high-gloss providers
3. Add beneficiary journey tracking
4. Export reports to PDF/Excel
5. Add financial simulation before selection
