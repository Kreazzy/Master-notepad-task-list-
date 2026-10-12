import { NotepadPlaybook } from '../types';
import { parseNotepadTextToSteps } from '../utils/parser';

interface RawSample {
  id: string;
  title: string;
  fileName: string;
  category: string;
  runCount: number;
  updatedAt: string;
  rawText: string;
}

const RAW_SAMPLES: RawSample[] = [
  {
    id: 'playbook-prod-deploy',
    title: 'Production Release & Zero-Downtime Cutover',
    fileName: 'production_release_cutover.txt',
    category: 'Deployment',
    runCount: 14,
    updatedAt: '2026-10-11T18:30:00Z',
    rawText: `Pre-Flight Verification:
[x] 1. Verify staging smoke test suite passes with \`npm run test:e2e\`
[x] 2. Confirm git working tree is clean and on release branch via \`git status -sb\`
[x] 3. Create annotated release tag using \`git tag -a v2.8.0 -m "Release v2.8.0"\`

Database & Migration:
[ ] 4. Take pre-migration snapshot of primary database with \`gcloud sql backups create --instance=prod-db-01\`
[ ] 5. Apply pending schema migrations in dry-run mode first: \`npx prisma migrate deploy\`

Rollout & Health Check:
[ ] 6. Trigger production container rollout via \`kubectl rollout restart deployment/api-gateway -n prod\`
[ ] 7. Monitor rollout completion status with \`kubectl rollout status deployment/api-gateway -n prod\`
[ ] 8. Verify live health endpoint returns HTTP 200 using \`curl -I https://api.internal.service/healthz\``,
  },
  {
    id: 'playbook-ssl-renewal',
    title: 'Nginx TLS Certificate Renewal & Reload',
    fileName: 'nginx_tls_cert_renewal.txt',
    category: 'Infrastructure',
    runCount: 6,
    updatedAt: '2026-10-10T14:15:00Z',
    rawText: `Certificate Generation:
[ ] 1. SSH into edge reverse-proxy bastion host: \`ssh ops@edge-proxy-01.internal\`
[ ] 2. Run Certbot dry-run validation before live renewal: \`sudo certbot renew --dry-run\`
[ ] 3. Execute live certificate renewal across all domains: \`sudo certbot renew --quiet\`

Verification & Service Reload:
[ ] 4. Test Nginx configuration syntax for errors with \`sudo nginx -t\`
[ ] 5. Gracefully reload Nginx worker processes without dropping connections: \`sudo systemctl reload nginx\`
[ ] 6. Inspect new certificate expiration date via \`echo | openssl s_client -connect localhost:443 2>/dev/null | openssl x509 -noout -dates\``,
  },
  {
    id: 'playbook-db-restore',
    title: 'Local Dev Environment & Seed Bootstrap',
    fileName: 'local_dev_bootstrap.txt',
    category: 'Onboarding',
    runCount: 22,
    updatedAt: '2026-10-11T09:40:00Z',
    rawText: `Environment Setup:
[x] 1. Copy template environment variables file using \`cp .env.example .env.local\`
[x] 2. Install locked workspace dependencies via \`npm ci\`
[x] 3. Start local Postgres and Redis containers in detached mode: \`docker compose up -d postgres redis\`
[x] 4. Seed baseline fixture accounts and catalog data with \`npm run db:seed\`
[x] 5. Launch local development server on port 3000: \`npm run dev\``,
  },
  {
    id: 'playbook-incident-triage',
    title: 'High-Latency Incident Triage SOP',
    fileName: 'incident_triage_sop.txt',
    category: 'Operations',
    runCount: 9,
    updatedAt: '2026-10-09T21:10:00Z',
    rawText: `Immediate Diagnostics:
[x] 1. Check active container CPU and memory saturation via \`kubectl top pods -n prod --sort-by=cpu\`
[ ] 2. Inspect last 100 error log lines from ingress controller: \`kubectl logs -n prod -l app=api-gateway --tail=100\`
[ ] 3. Query active slow queries running longer than 5 seconds in PostgreSQL: \`psql -c "SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC;"\`

Mitigation & Recovery:
[ ] 4. Scale horizontal pod replicas from 4 to 8 during traffic spike: \`kubectl scale deployment/api-gateway -n prod --replicas=8\`
[ ] 5. Clear stale upstream cache keys if lock contention is observed: \`redis-cli -h cache.internal FLUSHDB ASYNC\`
[ ] 6. Record incident timeline and root cause summary in postmortem notepad`,
  },
  {
    id: 'playbook-weekly-backup-audit',
    title: 'Weekly Storage Integrity & Backup Audit',
    fileName: 'weekly_backup_audit.txt',
    category: 'Security',
    runCount: 31,
    updatedAt: '2026-10-08T11:00:00Z',
    rawText: `Audit Steps:
[ ] 1. List latest encrypted archive snapshots in cold storage bucket: \`aws s3 ls s3://corp-prod-backups/daily/ --human-readable\`
[ ] 2. Download most recent snapshot checksum manifest: \`aws s3 cp s3://corp-prod-backups/daily/latest.sha256 ./latest.sha256\`
[ ] 3. Verify SHA-256 archive integrity against manifest with \`sha256sum -c latest.sha256\`
[ ] 4. Rotate expired 90-day access tokens in IAM console and update vault secret
[ ] 5. Sign off weekly compliance log entry`,
  },
];

export function getInitialPlaybooks(): NotepadPlaybook[] {
  return RAW_SAMPLES.map((sample) => {
    const parsed = parseNotepadTextToSteps(sample.rawText);
    return {
      id: sample.id,
      title: sample.title,
      fileName: sample.fileName,
      category: sample.category,
      steps: parsed.steps,
      runCount: sample.runCount,
      updatedAt: sample.updatedAt,
    };
  });
}
