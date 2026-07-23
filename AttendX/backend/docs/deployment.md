# Deployment

## Environments
| Environment | URL | Branch | Auto-deploy |
|-------------|-----|--------|-------------|
| Development | localhost | any | No |
| Staging | | main | Yes |
| Production | | main (tagged) | Manual |

## Deploy Steps (Production)
1. Merge PR to `main`
2. Tag release: `git tag v1.x.x && git push --tags`
3. CI/CD pipeline runs
4. Monitor logs

## Rollback
```bash
# Example rollback command
git revert <commit-hash>
git push origin main
```

## Docker
```bash
docker compose up -d          # start
docker compose down           # stop
docker compose logs -f        # tail logs
```

## Health Checks
- [ ] API responds at /health
- [ ] DB connection verified
- [ ] Env variables loaded
