# 🚨 Production Rollback PR (Validate)

> **Title format:** `[Prod] Rollback to vX.X.X (from vX.X.X)`

> Instructions for rollback:
>
> 1. Remove `# {"$imagepolicy": "flux-system:frontend:tag"}` from the file `k8s/overlays/production/kustomization.yaml`
> 2. Set the desired version manually in `k8s/overlays/production/kustomization.yaml`
> 3. Merge changes to main

> Notes: Only do this on the **production** k8 file unless you intentionally want to revert staging as well. Typically you should only need to rollback on production.

> When you are ready to resume normal prod release, simply add the `# {"$imagepolicy": "flux-system:frontend:tag"}` back to the file, and run npm version as usual

## 📦 Rollback type

_Select one._

- [ ] Rollback to the previous version
- [ ] Rollback to a specific older version (not the immediate previous)

## 🧾 Versions

- **Rollback from**: vX.X.X
- **Rollback to**: vX.X.X

## 📋 Reason for rollback

-
-
-

## ✅ Rollback checklist

- [ ] Deployment/rollout reverted in the production k8 file
- [ ] Confirmed production is healthy after rollback
- [ ] Follow-up issue(s) created for root cause + forward fix
- [ ] Title follows: `[Prod] Rollback to vX.X.X (from vX.X.X)`

---

_Use this template for production rollbacks. For other PR types, use a different template._
