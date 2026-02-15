# Monitoring — Hemisphere Learning App

This document describes the Grafana dashboards to create, alert thresholds to
configure, and the escalation path to follow when an alert fires.

For step-by-step incident response procedures see
[docs/INCIDENT-RUNBOOK.md](./INCIDENT-RUNBOOK.md).

---

## Architecture Overview

```
Hemisphere API  ──/metrics──▶  Prometheus  ──▶  Grafana dashboards
                                    │
                                    └──▶  Alertmanager  ──▶  PagerDuty / Slack
```

The API exposes a Prometheus text-format endpoint at `GET /metrics` with three
metric families:

| Metric | Type | Description |
|---|---|---|
| `http_requests_total{method,path,status}` | counter | Total HTTP requests, labelled by method, normalised path (first 2 segments), and status code. |
| `process_uptime_seconds` | gauge | Seconds since the API process started. |
| `nodejs_heap_used_bytes` | gauge | V8 heap memory in use at scrape time. |

Prometheus is configured to scrape the API every **15 seconds** (see
`infrastructure/prometheus.yml`).

---

## Grafana Dashboards

### 1. Request Rate

**Purpose:** Monitor overall API traffic volume.

**Panel:** Time-series graph

**PromQL:**
```promql
sum(rate(http_requests_total[1m])) by (path)
```

**Suggested thresholds:** none (informational); baseline traffic anomalies
surface relative to historical averages.

---

### 2. Error Rate

**Purpose:** Detect increases in 4xx/5xx responses.

**Panel:** Time-series graph + stat panel showing current %

**PromQL — error rate (%):**
```promql
100 * sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
```

**PromQL — client-error rate (4xx):**
```promql
100 * sum(rate(http_requests_total{status=~"4.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
```

**Alert threshold:** error rate (5xx) > 1% for 5 minutes → P1 alert.

---

### 3. p95 Latency

**Purpose:** Track tail latency to catch slow-responding routes.

> Note: The current `/metrics` implementation exposes request counts only.
> To compute latency percentiles, add a `http_request_duration_seconds`
> histogram in `recordMetric`. Until then, use the application-level timing
> available from `process_uptime_seconds` deltas or an ingress/load-balancer
> log exporter.

**Placeholder PromQL (once histogram is added):**
```promql
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, path)
)
```

**Alert threshold:** p95 latency > 500 ms for 5 minutes → P2 alert.

---

### 4. Heap Usage

**Purpose:** Detect memory leaks before they cause OOM crashes.

**Panel:** Time-series graph

**PromQL:**
```promql
nodejs_heap_used_bytes / 1024 / 1024
```
*(Displays MB for readability.)*

**Alert threshold:** heap used > 512 MB → P2 alert.

---

## Alert Thresholds Summary

| Alert | Severity | Threshold | Duration | Action |
|---|---|---|---|---|
| API 5xx error rate | P1 | > 1% of requests | 5 min sustained | Page on-call immediately |
| p95 response latency | P2 | > 500 ms | 5 min sustained | Investigate; page if growing |
| Heap memory used | P2 | > 512 MB | 5 min sustained | Check for memory leaks; restart if >768 MB |
| API instance down | P0 | 0 healthy replicas | 1 min | Page on-call immediately |
| Scrape target missing | P2 | Prometheus scrape fails | 10 min | Verify API health; check network policy |

---

## Configuring Alerts in Alertmanager

Add the following recording and alerting rules to a `prometheus-rules.yml` file
and mount it into the Prometheus container:

```yaml
groups:
  - name: hemisphere.api
    rules:
      - alert: HighErrorRate
        expr: |
          100 * sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m])) > 1
        for: 5m
        labels:
          severity: p1
        annotations:
          summary: "API 5xx error rate above 1%"
          description: "Current rate: {{ $value | printf \"%.2f\" }}%"

      - alert: HighHeapUsage
        expr: nodejs_heap_used_bytes > 536870912  # 512 MB
        for: 5m
        labels:
          severity: p2
        annotations:
          summary: "Node.js heap above 512 MB"
          description: "Heap: {{ $value | humanize1024 }}B"

      - alert: ApiInstanceDown
        expr: up{job="hemisphere-api"} == 0
        for: 1m
        labels:
          severity: p0
        annotations:
          summary: "Hemisphere API instance is down"
```

---

## On-Call Escalation Path

1. **Alert fires** → PagerDuty / Slack `#alerts` notification is sent.
2. **On-call engineer acknowledges** within the SLA for the severity level
   (P0: 15 min, P1: 1 hour — see [INCIDENT-RUNBOOK.md](./INCIDENT-RUNBOOK.md)).
3. **Triage** using the runbook steps: check `/health`, review logs, inspect
   Grafana dashboards for the relevant alert panel.
4. **Escalate** if the on-call engineer cannot resolve within the SLA:
   - P0 / unresolved P1 → Engineering Lead (see team directory).
   - P1 affecting beta cohort → PM (see team directory).
   - Data loss risk → Database Admin (see team directory).
5. **Post-incident review** required for P0/P1 within 48 hours; file in
   `docs/incidents/` and post in `#incidents` Slack channel.

Full escalation contacts and incident-severity definitions are in
[docs/INCIDENT-RUNBOOK.md](./INCIDENT-RUNBOOK.md).

---

## Grafana Setup Quick-Start

1. Open Grafana at `http://localhost:3003` (or your production URL).
2. Add a Prometheus data source pointing to `http://prometheus:9090`.
3. Create a new dashboard and add the panels described above using the PromQL
   queries provided.
4. Import the Prometheus community dashboard **Node.js Application Dashboard**
   (Grafana dashboard ID `11159`) as a starting point, then layer in
   hemisphere-specific panels.
5. Set dashboard refresh interval to **30s** for production monitoring.
