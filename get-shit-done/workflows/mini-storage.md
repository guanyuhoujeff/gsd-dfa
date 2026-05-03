<purpose>
Pick a storage type for one aggregate (or all aggregates in a bounded context) and write the native schema. Two-phase: Decision (with prompt set) then Specification (native language). Supports 11 storage families.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="validate_inputs">
**Resolve scope (per-aggregate vs per-context) and check prerequisites.**

```bash
SCOPE_TYPE=""
SCOPE_NAME=""
DDD_DIR=".planning/ddd"

# Determine scope from arguments
if echo "$ARGUMENTS" | grep -qE '\-\-context[= ]'; then
  SCOPE_TYPE="context"
  SCOPE_NAME=$(echo "$ARGUMENTS" | grep -oE '\-\-context[= ]+\S+' | sed 's/^--context[= ]*//')
else
  # First non-flag positional argument is the aggregate name
  SCOPE_TYPE="aggregate"
  SCOPE_NAME=$(echo "$ARGUMENTS" | awk '{for (i=1;i<=NF;i++) if ($i !~ /^--/) {print $i; exit}}')
fi

[ -z "$SCOPE_NAME" ] && { echo "Missing scope. Usage: /gsd-mini-storage <aggregate-name> | --context <name>"; exit 1; }

# Slug for filenames (lowercase, dashes, alnum-only) — matches mini-aggregate
# and mini-event-storm slug rules so all artifacts cross-reference cleanly.
SCOPE_SLUG=$(echo "$SCOPE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' _' '--' | sed 's/[^a-z0-9-]//g')
mkdir -p "$DDD_DIR"

# Validate scope exists. Look up aggregate file by SLUG, not raw name —
# /gsd-mini-aggregate writes AGGREGATE-{slug}.md, so case mismatches
# (`Order` vs `order`) must still resolve.
if [ "$SCOPE_TYPE" = "aggregate" ]; then
  AGGREGATE_FILE="$DDD_DIR/AGGREGATE-${SCOPE_SLUG}.md"
  if [ ! -f "$AGGREGATE_FILE" ]; then
    echo "Aggregate spec not found: $AGGREGATE_FILE"
    echo "Run /gsd-mini-aggregate $SCOPE_NAME first, or pass --context if you want per-context scope."
    exit 1
  fi
fi

STORAGE_FILE="$DDD_DIR/STORAGE-${SCOPE_SLUG}.md"
```

If `STORAGE_FILE` exists, ask whether to regenerate (default: no — let user diff manually).
</step>

<step name="parse_flags">
**Parse flags.**

```
AUTO_MODE=false
TEXT_MODE=false
WITH_OPS=false
PRESET_STORAGE=""

[[ "$ARGUMENTS" =~ --auto ]] && AUTO_MODE=true
[[ "$ARGUMENTS" =~ --text ]] && TEXT_MODE=true
[[ "$ARGUMENTS" =~ --with-ops ]] && WITH_OPS=true
PRESET_STORAGE=$(echo "$ARGUMENTS" | grep -oE '\-\-storage[= ]+\S+' | sed 's/^--storage[= ]*//')
```

**Text mode (`workflow.text_mode: true` in config or `--text` flag):** Set `TEXT_MODE=true` if `--text` is present in `$ARGUMENTS` OR `text_mode` from init JSON is `true`. When TEXT_MODE is active, replace every `AskUserQuestion` call below with a plain-text numbered list and ask the user to type their choice number. This is required for non-Claude runtimes (OpenAI Codex, Gemini CLI, etc.) where `AskUserQuestion` is not available.

If `PRESET_STORAGE` is set, **skip step 4** (decision) and jump to step 5 (specification).
</step>

<step name="load_context">
**Load aggregate / context inputs that inform the decision.**

If `SCOPE_TYPE=aggregate`:
- Read `AGGREGATE-{name}.md` — extract: members count, value objects, lifecycle states, concurrency model, invariants
- These influence: complexity (members count → schema flexibility need), concurrency (model → consistency need)

If `SCOPE_TYPE=context`:
- Read all `AGGREGATE-*.md` files whose `context:` frontmatter matches `SCOPE_NAME` (or whose context is "(unspecified)" and the user accepts at the prompt)
- The shared storage must accommodate the union of their needs

If `EVENT-STORM-{context}.md` exists, read it to surface query-pattern hints (read models, policies, external systems).
</step>

<step name="decision_phase" condition="PRESET_STORAGE is empty">
**Walk the user through the decision prompt set.**

Survey these dimensions. In `--auto`, AI infers from inputs and announces the choice. Otherwise AskUserQuestion or batch:

1. **Read/write ratio** — heavy read (10:1+), balanced, heavy write (>1:1)?
2. **Dominant query pattern** (pick all that apply):
   - PK lookup (single record by ID)
   - Range scan (e.g., last 100 by date)
   - Aggregation (group / sum / avg)
   - Graph traversal (multi-hop relationships)
   - Semantic search (vector similarity)
   - Full-text search (lexical / phrase / facet)
   - Time-series (metrics over time windows)
3. **Consistency requirement** — strong (linearizable / serializable), causal (read-your-writes), eventual?
4. **Scale** — data volume order (MB / GB / TB / PB), ops/sec order
5. **Latency budget** for the dominant query — under 10ms, under 100ms, under 1s, async OK?
6. **Existing infrastructure** — what databases/stores does the project already run? (Reusing infra usually wins ties.)
7. **Team familiarity** — strong with SQL / NoSQL / graph / search / vector / etc.?

**Decision matrix (heuristic — AI uses these to propose):**

| Dominant signal | Default storage | Why |
|-----------------|-----------------|-----|
| PK + balanced + strong + relational queries | relational | Default for most CRUD |
| Single-aggregate-document access + flexible schema | document | Aggregate ≈ document |
| Sub-ms PK lookup at huge scale | key-value | DynamoDB / Redis territory |
| Time-partitioned heavy writes + analytical reads | wide-column | Cassandra / Scylla |
| Multi-hop relationships are core | graph | Neo4j / Neptune |
| Embedding similarity search | vector | Qdrant / pgvector |
| Metrics / events with time dimension | time-series | InfluxDB / TimescaleDB |
| Full-text + faceted search | search | Elasticsearch / OpenSearch |
| Large blobs / immutable artifacts | object-store | S3 / MinIO |
| OLAP / analytical queries on big data | columnar-analytics | ClickHouse / BigQuery / DuckDB |
| Audit-log / event-sourced source of truth | event-log | Kafka long-term / EventStoreDB |

Confirm the chosen `STORAGE_TYPE` and engine (e.g., `relational/postgresql`, `document/mongodb`, `vector/qdrant`).
</step>

<step name="specification_phase">
**Fill in the schema in the chosen storage's native language.**

The native language depends on `STORAGE_TYPE`. Use these cues (full examples in the template appendix):

| Type | Native language |
|------|-----------------|
| relational | SQL DDL: `CREATE TABLE ... CONSTRAINT ... INDEX ...` |
| document | JSON shape with type annotations and nested structures |
| key-value | Key pattern (e.g., `paper:{id}:status`) + value structure (JSON or binary) |
| wide-column | CQL: `CREATE TABLE ... WITH partition keys, clustering keys` |
| graph | Cypher: `(:NodeType {props})-[:REL_TYPE]->(:NodeType {props})` |
| vector | Collection spec: name, dimension, distance metric, payload schema |
| time-series | Measurement + tags + fields + retention policy |
| search | Mapping JSON: properties, analyzers, multi-fields |
| object-store | Bucket / prefix layout: `bucket-name/{tenant}/{year}/{type}/{id}.ext` |
| columnar-analytics | OLAP DDL: `CREATE TABLE ... ENGINE = MergeTree ORDER BY ...` |
| event-log | Topic / stream layout: name, partition key, retention, schema version |

Generate the schema using the aggregate's:
- Root identity → primary key / partition key / document `_id`
- Members → nested structures, foreign keys, or related collections (depends on storage)
- Value objects → embedded records (document), composite columns (relational), or properties (graph/vector)
- Invariants → check constraints (relational), validation rules (document), or contract assertions
- Lifecycle states → enum / state column + appropriate indexes for state-filtered queries

**Indexes / access patterns:** For each query pattern surveyed in step 4, include the storage-native index that serves it.

**Query patterns:** Translate the surveyed patterns into native query examples (one or two for the most critical paths).
</step>

<step name="capture_projections">
**Lightweight read-model declaration (NOT full CQRS).**

If the user's design includes any read-model view of this aggregate in a *different* storage (common case: write to Postgres, project to Elasticsearch for search), capture it here. Otherwise leave the section with a note that no projections are defined.

Per design doc §8.4, full CQRS is deferred to gsd-mini v2. This step captures only:
- Source of truth: which storage holds the canonical state (almost always *this* one)
- Projection: where else does a view of this aggregate live, and what's it for?
- Refresh policy: synchronous (within transaction), asynchronous (event), batch (scheduled)
</step>

<step name="capture_compliance">
**Privacy, retention, encryption, region.**

Capture these even if the answers are short — they often constrain storage choice retroactively (e.g., GDPR may forbid certain regions).

- **PII fields** — list specific fields that constitute personal data per GDPR / equivalent
- **Retention policy** — how long do we keep this data, and what's the deletion mechanism (hard delete / soft delete / anonymization)
- **Encryption** — at-rest? in-transit? field-level (e.g., for PII)?
- **Region constraints** — must data stay in EU / US / etc.? Multi-region replication allowed?

In `--auto`, AI proposes defaults from PROJECT.md context (mentions of GDPR / HIPAA / PCI / SOC2 in requirements should escalate this section).
</step>

<step name="capture_operations" condition="WITH_OPS is true">
**Optional operations section.**

Only emitted when `--with-ops` flag is set (default off — most planning rounds don't need this until later).

- **Backup strategy** — frequency, retention, RPO / RTO targets
- **Replication / HA** — synchronous / asynchronous, cross-AZ, cross-region
- **Sharding / partitioning** — strategy, shard key, expected shard count

Defaults are storage-engine-specific; AI suggests common patterns (e.g., "PostgreSQL with daily logical backup + WAL streaming to standby").
</step>

<step name="write_artifact">
**Compose STORAGE-{name}.md from collected sections using the `ddd-storage.md` template.**

Frontmatter:
```yaml
---
[scope_type]: <Name>          # aggregate: Order   OR   context: Sales
storage_type: <type>          # one of the 11 supported types
storage_engine: <engine>      # e.g., postgresql, mongodb, qdrant
consistency: <model>          # strong / causal / eventual / etc.
scope: <per-aggregate | per-context>
schema_version: 1
status: draft
last_updated: <date>
---
```

Section order: Decision rationale → Schema → Indexes / access patterns → Query patterns → Projections → Compliance → Operations (if --with-ops) → Open questions.

Cross-link back to `AGGREGATE-{name}.md` (per-aggregate scope) or `CONTEXT-MAP.md` (per-context scope).
</step>

<step name="verify">
**Sanity checks before reporting success.**

Informational (don't block):
- `storage_type` is one of the 11 supported families
- Schema section is non-empty and uses the storage's native language (heuristic: contains keywords matching the type — e.g., `CREATE TABLE` for relational, `{` and `:` for document, `:` and `()` and `->` for graph)
- Compliance section has at minimum: PII fields (or "none"), retention (or "indefinite"), encryption (or "TLS only / not at rest")
- If projections section names another storage, the named storage type is also one of the 11
- If `WITH_OPS=false`, Operations section is absent (not just empty)

Report:
```
gsd-mini-storage ► DONE
  Scope: <aggregate-or-context> = <Name>
  Storage: <type> / <engine>
  Consistency: <model>
  Indexes: <count>
  Query patterns: <count>
  Compliance: PII <count> fields, retention <span>
  Operations: <emitted | omitted>
  Files: .planning/ddd/STORAGE-<Name>.md

  Next:
    /gsd-dfa-model <slug> --standalone   (refine state machine using storage events)
    /gsd-mini-event-storm --context <ctx> (capture domain events crossing this storage)
```
</step>

</process>

<success_criteria>
- [ ] STORAGE-{name}.md written with full frontmatter
- [ ] storage_type is one of the 11 supported families
- [ ] Decision rationale captures: read/write ratio, query patterns, consistency, scale, latency, infra, team
- [ ] Schema in native language (not abstract pseudocode)
- [ ] Indexes / access patterns present (or explicit "N/A — storage type has no index concept")
- [ ] Query patterns include at minimum the dominant pattern from decision phase
- [ ] Projections section present (with "none" if no read models)
- [ ] Compliance section addresses PII, retention, encryption, region
- [ ] Operations section present iff --with-ops
- [ ] Output usable by /gsd-dfa-model, /gsd-dfa-scenarios, downstream implementers
</success_criteria>
