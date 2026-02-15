# Incident Runbook — Hemisphere Learning App

## On-Call Responsibilities

The on-call engineer is responsible for:
1. Acknowledging alerts within 15 minutes
2. Triaging and categorising the incident (P0–P3)
3. Communicating status to stakeholders
4. Coordinating resolution or escalation
5. Writing a post-incident review for P0/P1 incidents

---

## Incident Severity Levels

| Level | Definition | Response Time | Example |
|-------|-----------|---------------|---------|
| P0 | Total service outage; data loss risk | 15 minutes | API down, DB unreachable |
| P1 | Major feature broken; significant user impact | 1 hour | Auth failures, session data loss |
| P2 | Degraded performance or partial feature failure | 4 hours | Slow queries, 3rd-party OAuth flaky |
| P3 | Minor issues, cosmetic bugs | Next business day | UI misalignment, non-critical error logs |

---

## Initial Response Steps

### 1. Acknowledge
- Acknowledge the PagerDuty / alerting notification
- Post in `#incidents` Slack channel: "Investigating [brief description] — [your name] on it"

### 2. Triage
Check the following in order:

```bash
# Check API health
curl https://api.hemisphere.app/health

# Check recent error logs (example: Railway / Fly.io)
railway logs --tail 100

# Check database connectivity
pnpm --filter @hemisphere/db db:ping

# Check active alert thresholds
# (Datadog / Grafana dashboard — see bookmarks in #dev-ops)
```

### 3. Identify Impact
- How many users are affected?
- Is data at risk of being lost or corrupted?
- Is the issue isolated to one region / feature?

### 4. Communicate
For P0/P1:
- Post status update in `#incidents` every 15 minutes until resolved
- Update status page (statuspage.io or equivalent) within 30 minutes
- Notify PM / CEO if user-facing for > 30 minutes

---

## Common Scenarios and Remediation

### API is down (P0)
1. Check host provider dashboard for infra issues
2. Review recent deploys: `git log --oneline -10`
3. If caused by a bad deploy: roll back immediately
   ```bash
   # Example rollback on Railway
   railway rollback
   ```
4. Check environment variables are set correctly (JWT_SECRET, DATABASE_URL)

### Database connection failures (P0)
1. Check database host status page
2. Verify `DATABASE_URL` environment variable is correct
3. Check connection pool exhaustion in logs
4. Restart API instances if connection pool is stuck

### Auth / JWT errors spiking (P1)
1. Check if `JWT_SECRET` env var changed recently
2. If rotated: existing access tokens will be invalid — users need to re-login
3. Rate limit false positives: check if a legitimate automation is being blocked
4. Review `apps/api/src/middleware/auth.ts` for recent changes

### High latency / slow queries (P2)
1. Check database slow query log
2. Look for missing indexes on frequently-queried columns
3. Check for N+1 query patterns in recent code changes
4. Scale up database or API instances if traffic spike

### Third-party OAuth failure (P2)
1. Check Google / Apple status pages
2. Verify JWKS endpoint is reachable:
   ```bash
   curl https://www.googleapis.com/oauth2/v3/certs
   curl https://appleid.apple.com/auth/keys
   ```
3. If JWKS endpoint down: OAuth logins will fail; email/password login still works
4. Communicate to users if OAuth is unavailable for > 30 minutes

---

## Rollback Procedures

### Application rollback
```bash
# View recent deployments
railway deployments list

# Roll back to previous deployment
railway rollback [deployment-id]
```

### Database rollback
```bash
# List recent migrations
pnpm --filter @hemisphere/db db:migrations:list

# Roll back last migration (CAUTION: may cause data loss)
pnpm --filter @hemisphere/db db:migrate:down
```

Always take a DB snapshot before rolling back migrations:
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Feature flag disable
All Phase 4+ features should be behind feature flags. To disable:
1. Navigate to the feature flag dashboard
2. Toggle the relevant flag to OFF
3. Verify the change takes effect within 5 minutes (no deploy required)

---

## Post-Incident Review (P0/P1 Required)

Within 48 hours of resolution, write a post-incident review covering:

1. **Timeline**: What happened and when?
2. **Root cause**: What was the underlying cause?
3. **Impact**: How many users affected, for how long?
4. **Detection**: How was the incident detected? Could it have been caught sooner?
5. **Resolution**: What fixed it?
6. **Action items**: What changes will prevent recurrence?

Post the review in the `#incidents` Slack channel and file it in `docs/incidents/`.

---

## Escalation Contacts

| Role | Contact | When to escalate |
|------|---------|-----------------|
| Engineering Lead | See team directory | P0 or unresolved P1 after 1 hour |
| PM | See team directory | P1 affecting beta cohort |
| Database Admin | See team directory | Data loss risk or schema emergencies |
