---
phase: 03-productionization
plan: "03"
subsystem: helm
tags: [helm, kubernetes, deployment, autoscaling, ingress, tls, secret-management]
dependency_graph:
  requires: ["03-01"]
  provides: ["helm-chart"]
  affects: ["kubernetes-deployment"]
tech_stack:
  added: []
  patterns:
    - "Helm chart with conditional resource creation (Secret, Ingress, HPA, PDB, ServiceAccount)"
    - "existingSecret pattern for CSI/ESO integration"
    - "envFrom with configMapRef + secretRef for environment injection"
key_files:
  created:
    - helm/Chart.yaml
    - helm/values.yaml
    - helm/templates/_helpers.tpl
    - helm/templates/deployment.yaml
    - helm/templates/service.yaml
    - helm/templates/configmap.yaml
    - helm/templates/secret.yaml
    - helm/templates/ingress.yaml
    - helm/templates/hpa.yaml
    - helm/templates/pdb.yaml
    - helm/templates/serviceaccount.yaml
  modified: []
decisions:
  - "existingSecret gates chart-created Secret (CSI/ESO pattern per D-41)"
  - "HPA uses autoscaling/v2 API with CPU Utilization metric"
  - "ConfigMap carries non-secret env vars (TRANSPORT, PORT, XRAY_REGION, XRAY_CREDENTIAL_MODE)"
  - "PDB enabled by default with minAvailable:1 for zero-downtime rolling updates"
metrics:
  duration_minutes: 3
  completed_date: "2026-03-25"
  tasks_completed: 2
  files_created: 11
  files_modified: 0
---

# Phase 03 Plan 03: Helm Chart Summary

**One-liner:** Production-ready Helm chart with existingSecret pattern, CPU-based HPA, TLS ingress, and envFrom split across ConfigMap + Secret for credential isolation.

## What Was Built

A complete Helm chart in the `helm/` directory enabling Kubernetes deployment of the xray-mcp HTTP server. The chart covers all production requirements: configurable replicas and resources, CPU-based autoscaling, TLS-capable ingress, flexible secret management (chart-created or external via CSI Secret Store / External Secrets Operator), pod disruption budget, and a dedicated service account.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Helm chart metadata, values, and helpers | 4a5513b | helm/Chart.yaml, helm/values.yaml, helm/templates/_helpers.tpl |
| 2 | Create all Helm template manifests | cc83f4d | helm/templates/deployment.yaml, service.yaml, configmap.yaml, secret.yaml, ingress.yaml, hpa.yaml, pdb.yaml, serviceaccount.yaml |

## Architecture Decisions

**existingSecret pattern (D-41):** When `existingSecret` is set, the `secret.yaml` template is skipped entirely (`{{- if not .Values.existingSecret }}`). The `xray-mcp.secretName` helper in `_helpers.tpl` returns the existing secret name so the Deployment's `envFrom.secretRef` always references the correct secret — whether chart-managed or externally provided.

**ConfigMap/Secret split:** Non-secret env vars (`TRANSPORT`, `PORT`, `XRAY_REGION`, `XRAY_CREDENTIAL_MODE`) live in the ConfigMap. Credentials (`XRAY_CLIENT_ID`, `XRAY_CLIENT_SECRET`) live in the Secret. Both are mounted via `envFrom` in the Deployment, keeping secrets out of ConfigMap.

**Conditional resources:** Secret, Ingress, HPA, PDB, and ServiceAccount are all gated by `values.yaml` flags, allowing the chart to be used in minimal configurations without creating unnecessary cluster resources.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all Helm templates wire to values.yaml defaults with no placeholder data.

## Self-Check: PASSED

- [x] helm/Chart.yaml exists and contains `name: xray-mcp`, `apiVersion: v2`, `appVersion: "0.1.0"`
- [x] helm/values.yaml exists and contains `existingSecret`, `targetCPUUtilizationPercentage: 70`, `targetPort: 3000`, `credentialMode: strict`
- [x] helm/templates/_helpers.tpl contains `xray-mcp.fullname`, `xray-mcp.secretName`, `xray-mcp.labels`
- [x] 8 YAML files exist in helm/templates/
- [x] deployment.yaml contains `containerPort: 3000`, `secretRef`, `configMapRef`, `livenessProbe`, `readinessProbe`
- [x] secret.yaml gated by `if not .Values.existingSecret` with `b64enc`
- [x] ingress.yaml gated by `if .Values.ingress.enabled` with `tls` support
- [x] hpa.yaml gated by `if .Values.autoscaling.enabled` with `targetCPUUtilizationPercentage`
- [x] pdb.yaml gated by `if .Values.pdb.enabled` with `minAvailable`
- [x] serviceaccount.yaml gated by `if .Values.serviceAccount.create`
- [x] Commits 4a5513b and cc83f4d exist in git log
