# Bugfix Requirements Document

## Introduction

This document specifies the requirements for fixing a critical security vulnerability in the SelfX Retail multi-tenant application: the absence of proper Row-Level Security (RLS) implementation. The application currently lacks systematic tenant isolation at the database query level, creating a risk of cross-tenant data leakage where Tenant A could potentially access Tenant B's sensitive data through manipulated API requests or query exploits.

The fix implements comprehensive tenant isolation using multiple security layers: Eloquent global scopes for automatic query filtering, middleware for session-based tenant context enforcement, and PostgreSQL Row-Level Security policies as a database-level safeguard.

**Severity**: CRITICAL - Potential GDPR violations, data breach exposure, and complete loss of multi-tenant data integrity.

**Affected Scope**: 80+ database tables with tenant_id columns across 18 modules (Identity, Tenancy, POS, Inventory, Orders, Payments, Customers, Catalog, Billing, Notifications, Promotions, Reporting, Storefront, Platform, Plans, Printing, Audit, AI).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an Eloquent query is executed on a tenant-scoped model (e.g., `Sale::where('id', $id)->first()`) THEN the system executes the query without automatic tenant_id filtering, allowing potential access to data from any tenant

1.2 WHEN a raw DB query is executed (e.g., `DB::table('sales')->where('id', $id)->first()`) THEN the system executes the query without tenant context validation, bypassing all tenant isolation

1.3 WHEN an API request is processed with a manipulated tenant_id in the session or authentication token THEN the system does not validate that the authenticated user belongs to that tenant, allowing unauthorized tenant switching

1.4 WHEN a Staff user makes a query within their authenticated session THEN the system does not automatically scope the query to their tenant, requiring manual tenant_id filtering in every controller and service method

1.5 WHEN a join query spans multiple tenant-scoped tables (e.g., `sales` JOIN `customers`) THEN the system does not enforce tenant_id consistency across joined tables, allowing data correlation attacks

1.6 WHEN a database-level constraint violation occurs (e.g., accessing cross-tenant foreign keys) THEN PostgreSQL does not enforce row-level security policies because no RLS policies exist

1.7 WHEN a subquery is executed within a larger query THEN the system does not automatically apply tenant scoping to the subquery, creating a bypass mechanism

1.8 WHEN an aggregate query is executed (e.g., `COUNT(*)`, `SUM()`) across tenant-scoped data THEN the system does not restrict the aggregation to the current tenant's data

1.9 WHEN a bulk operation is performed (e.g., `update()`, `delete()`) on a tenant-scoped model THEN the system does not automatically restrict the operation to the current tenant, allowing mass data manipulation across tenants

1.10 WHEN a developer writes a new query without explicit tenant_id filtering THEN the system does not prevent the query from executing, allowing accidental security violations

1.11 WHEN a scheduled command or background job accesses tenant data (e.g., `AggregateDailyMetrics`) THEN the system does not enforce tenant context, requiring manual tenant iteration in every command

1.12 WHEN audit logs are queried for cross-tenant activity monitoring THEN the system allows platform admins to view all tenant data without proper audit trails of who accessed what

### Expected Behavior (Correct)

2.1 WHEN an Eloquent query is executed on a tenant-scoped model THEN the system SHALL automatically apply a global scope that adds `WHERE tenant_id = {current_tenant_id}` to the query without developer intervention

2.2 WHEN a raw DB query is executed on a tenant-scoped table THEN the system SHALL log a security warning and recommend using Eloquent models with automatic scoping, or require explicit tenant_id filtering with session validation

2.3 WHEN an API request is processed THEN the system SHALL validate through middleware that the tenant_id in the session matches the tenant_id associated with the authenticated user's StaffProfile, rejecting mismatches with a 403 Forbidden error

2.4 WHEN a Staff user makes a query within their authenticated session THEN the system SHALL automatically retrieve the tenant_id from the user's StaffProfile and apply it to all tenant-scoped queries through a global scope

2.5 WHEN a join query spans multiple tenant-scoped tables THEN the system SHALL automatically add tenant_id equality constraints to all join conditions (e.g., `AND sales.tenant_id = customers.tenant_id = {current_tenant_id}`)

2.6 WHEN any database operation is attempted on a tenant-scoped table THEN PostgreSQL SHALL enforce row-level security policies that restrict `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations to rows matching `current_setting('app.current_tenant_id')`

2.7 WHEN a subquery is executed within a larger query THEN the system SHALL automatically propagate the tenant scope to all nested subqueries through query builder integration

2.8 WHEN an aggregate query is executed THEN the system SHALL automatically restrict the aggregation to the current tenant's data through the global scope before computing the result

2.9 WHEN a bulk operation is performed THEN the system SHALL automatically add tenant_id constraints to the WHERE clause, ensuring only the current tenant's records are affected

2.10 WHEN a developer writes a new query on a tenant-scoped model THEN the system SHALL automatically apply tenant filtering through the global scope, making cross-tenant access impossible by default

2.11 WHEN a scheduled command or background job accesses tenant data THEN the system SHALL require explicit tenant context setup (e.g., `Tenant::acting($tenantId, fn() => ...)`) and provide helper methods for safe multi-tenant iteration

2.12 WHEN audit logs are queried THEN the system SHALL enforce tenant-scoped access for tenant users and log all platform admin access to tenant data in a separate privileged access audit trail

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a Platform Super Admin queries the `tenants` table or other platform-level tables without tenant_id columns THEN the system SHALL CONTINUE TO allow unrestricted access for platform administration without applying tenant scoping

3.2 WHEN a Platform Super Admin explicitly bypasses tenant scoping for cross-tenant reporting or analytics THEN the system SHALL CONTINUE TO provide `withoutGlobalScope(TenantScope::class)` functionality with proper authorization checks

3.3 WHEN a public API endpoint serves the online storefront (e.g., product listings) THEN the system SHALL CONTINUE TO use `Store::resolvePublic($slug)` to determine the correct tenant context without requiring authentication

3.4 WHEN seeder scripts populate shared reference data (e.g., printing templates with `tenant_id = NULL`) THEN the system SHALL CONTINUE TO allow NULL tenant_id values for global resources that are not tenant-specific

3.5 WHEN cross-tenant relationships exist by design (e.g., `Tenant` to `Organization` hierarchy) THEN the system SHALL CONTINUE TO allow these relationships without applying tenant scoping to organization-level queries

3.6 WHEN a test suite creates multi-tenant test data THEN the system SHALL CONTINUE TO support explicit tenant_id assignment in factories and allow test cases to switch tenant context for isolation testing

3.7 WHEN existing API response structures include tenant_id fields THEN the system SHALL CONTINUE TO return these fields in responses without modification to maintain backward compatibility

3.8 WHEN raw queries are necessary for performance (e.g., complex reporting joins) THEN the system SHALL CONTINUE TO allow raw queries with explicit tenant_id filtering after logging a security audit event

3.9 WHEN Eloquent models use soft deletes (`deleted_at`) THEN the system SHALL CONTINUE TO apply soft delete scoping in combination with tenant scoping without conflicts

3.10 WHEN database migrations add new tenant-scoped tables THEN the system SHALL CONTINUE TO use the existing migration patterns while automatically applying RLS policies through a helper function

3.11 WHEN billing operations aggregate data across tenants (e.g., platform revenue reporting) THEN the system SHALL CONTINUE TO allow platform-level aggregations with proper authorization through platform admin authentication

3.12 WHEN WebSocket connections or real-time features broadcast tenant-specific events THEN the system SHALL CONTINUE TO use existing authorization logic while adding tenant_id validation to channel access control
