# Hemisphere Beta Program — 4-Week Plan

## Overview
- Duration: 4 weeks
- Target cohort: 100–500 learners
- Goal: Validate learning effectiveness, UX quality, and system stability

## Week 1: Soft Launch (100 learners)
### Onboarding
- Invite via email with unique signup codes
- 5-minute onboarding flow: learning goals, subject preferences
- Welcome session: 10-minute guided Encounter with Darwin's Dangerous Idea

### Metrics to track
- D1/D3/D7 retention (learners returning after 1, 3, 7 days)
- Session completion rate
- Items per session average
- FSRS retrievability distribution

## Week 2: Expansion (200 learners) + Feedback Loop
### Structured feedback
- In-app micro-survey after session 3: "How was your experience?" (NPS + 2 open questions)
- Weekly async interview with 5% of cohort (5-minute Loom)

### Key review points
- HBS (Hemisphere Balance Score) distribution — are learners skewing LH or RH?
- Zombie item detection — which content modules have high failure rates?
- Session length distribution — are sessions too long/short?

## Week 3: Scale (500 learners) + Content Iteration
- Onboard 3 additional content modules based on beta feedback
- A/B test: encounter-first vs analysis-first session opening
- Fix critical bugs found in weeks 1-2

## Week 4: Pre-Launch Validation
### Exit criteria for launch
- [ ] D7 retention >= 30%
- [ ] Session completion rate >= 70%
- [ ] FSRS mean retrievability after 7 days >= 0.65
- [ ] No P0/P1 bugs in last 48 hours
- [ ] Lighthouse mobile >= 90

## Feedback Intake
| Channel | Frequency | Owner |
|---------|-----------|-------|
| In-app NPS | After session 3 | Automated |
| Weekly Loom | Weekly | PM |
| Discord server | Always-on | Community |
| GitHub issues (beta tag) | Async | Engineering |

## Rollback Plan
- Feature flags to disable any Phase 4 feature within 5 minutes
- DB snapshot before beta launch
- Incident runbook: `docs/INCIDENT-RUNBOOK.md`
