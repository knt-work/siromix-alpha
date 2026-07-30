# Platform Foundation Operations

Install Node 24.7.0, pnpm 10.15.1, Python 3.12.11, uv 0.8.14, Docker Engine/Desktop, Compose v2, and Git. Windows PowerShell and CI/Linux are supported; WSL is optional.

Copy `.env.example` to `.env` and supply secrets locally without committing them. Run:

```text
pnpm doctor
pnpm bootstrap
pnpm dev
pnpm health
pnpm db:migrate
pnpm db:validate
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm lint
pnpm typecheck
pnpm build
pnpm readiness
pnpm stop
```

`dev` starts PostgreSQL/pgvector, Temporal and its UI, MinIO, ClamAV, applies migrations, and starts the web, API, and document/AI worker as owned background processes. `stop` terminates those owned processes and the Compose project idempotently. Local URLs are API `http://localhost:3001`, web `http://localhost:3000`, worker health `http://localhost:3002/ready`, Temporal UI `http://localhost:8233`, and MinIO console `http://localhost:9001`.

Run `pnpm performance` for the AC-022 cached-start benchmark. The harness first checks the required CPU and memory profile and requires `SIROMIX_REFERENCE_SSD=1` as explicit confirmation that the workspace and Docker data use SSD storage. Ineligible machines produce a machine-readable report and never report a pass.

Reset is test-only: set `SIROMIX_ENV=test` and an exact `SIROMIX_TEST_TARGET=test-...`, then run `pnpm reset:test`. It never deletes development or production targets.

Deploy immutable images and migration/contract bundles built from one commit. Apply expand migrations, deploy compatible API/workers, deploy web, verify readiness, then enable traffic. Rollback replaces application artifacts and uses a forward corrective migration; never automatically run destructive down migrations.

`pnpm artifacts` builds BuildKit OCI images with SBOM and SLSA provenance attestations, writes content-addressed references plus deterministic migration/contract bundles to `artifacts/`, and blocks critical fixed container vulnerabilities. `pnpm audit --audit-level high` is the dependency gate. CI signs the bundle/provenance subjects with GitHub artifact attestations only for trusted pushes to `main`; pull requests have read-only permissions and cannot attest or promote.

Before rollout, provide the externally managed runtime versions and run `pnpm deployment:verify`. The command rejects source commit, configuration, migration compatibility, contract, task-queue, or digest mismatches. Promotion must use each `manifest.json` `name:tag@sha256:...` reference unchanged. Configuration and secrets remain external to the image.

Rollout is expand migration → API → workers → web, with readiness checked after every application component and traffic enabled only after all checks pass. On partial failure, stop traffic promotion and redeploy the prior manifest’s image digests. Do not reverse the database migration. If the expanded schema needs correction, produce and validate a new forward-correction migration artifact; cleanup migrations remain deferred until the compatibility window closes.

If startup fails, run `pnpm doctor`, then `pnpm health`. Port collisions, Docker daemon failures, incompatible tools, unhealthy dependencies, and migration incompatibility are explicit nonzero failures. No command requires production credentials.
