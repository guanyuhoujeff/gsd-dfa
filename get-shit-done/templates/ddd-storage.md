# DDD Storage Template

Template for `.planning/ddd/STORAGE-{aggregate-or-context}.md` — captures the physical storage decision and native schema for one aggregate (or all aggregates in a bounded context).

**Purpose:** Aggregate captures the **business concept**; storage captures the **physical choice**. Same aggregate may pick different storage at different scales — polyglot persistence is normal. This template records that decision so implementers know what to build, and downstream `/gsd-dfa-*` commands know which persistence events to model.

**Downstream consumers:**
- `/gsd-dfa-model` — persistence events (`record_committed`, `projection_caught_up`) become candidate DFA events
- `/gsd-dfa-scenarios` — critical-path queries get scenario coverage
- Implementation handoff — schema is in native language; downstream tools can run as-is

---

## File Template

```markdown
---
aggregate: [Name]            # OR  context: [Name] — one of these, not both
storage_type: [one of: relational | document | key-value | wide-column | graph | vector | time-series | search | object-store | columnar-analytics | event-log]
storage_engine: [specific product, e.g., postgresql | mongodb | qdrant | clickhouse | kafka]
consistency: [strong | causal | eventual | strong (single-document) | session]
scope: [per-aggregate | per-context]
schema_version: 1
status: [draft | reviewed | locked]
last_updated: [date]
---

# Storage: [Name]

**Aggregate / Context:** [link to `AGGREGATE-<Name>.md` or `CONTEXT-MAP.md#<context>`]

## Decision rationale

### Inputs surveyed

| Dimension | Answer | Notes |
|-----------|--------|-------|
| Read/write ratio | [e.g., 10:1 read-heavy] | |
| Dominant query pattern | [PK lookup / range scan / aggregation / graph traversal / semantic / full-text / time-series] | |
| Consistency requirement | [strong / causal / eventual] | [why] |
| Data volume | [MB / GB / TB / PB order] | |
| Ops/sec | [order of magnitude] | |
| Latency budget | [<10ms / <100ms / <1s / async] | for which query |
| Existing infrastructure | [databases already in use] | |
| Team familiarity | [strongest with: ...] | |

### Choice: [storage_type] / [engine]

[Why this storage fits the surveyed inputs.]

### Alternatives considered and rejected

- **[Alternative 1]** — rejected because [reason]
- **[Alternative 2]** — rejected because [reason]

## Schema

[Native language for the chosen storage. See appendix below for examples per type. Generate from the aggregate's root identity, members, value objects, lifecycle states, and invariants.]

## Indexes / Access patterns

[Storage-native index definitions matching the dominant query patterns. If the storage type has no index concept (e.g., raw object store), explicitly say "N/A — storage type has no index concept; access pattern is direct key lookup".]

## Query patterns

| Pattern | Frequency | Latency target | Native query example |
|---------|-----------|----------------|----------------------|
| [Get by id] | high | <10ms | [native syntax] |
| [Filter by status] | medium | <100ms | [native syntax] |
| ... |

## Projections

[Lightweight read-model declaration. Full CQRS is deferred to gsd-mini v2.]

**Source of truth:** This storage holds the canonical state.

**Projections (denormalized views in other stores):**

| View | Storage | Refreshed by | Purpose |
|------|---------|--------------|---------|
| [name] | [other storage type / engine] | [event / batch / sync] | [why a separate view is needed] |
| ... |

If no projections, write: `None — single source of truth.`

## Compliance

- **PII fields:** [list specific fields, or "none"]
- **Retention policy:** [duration + deletion mechanism: hard delete / soft delete / anonymization, or "indefinite"]
- **Encryption:**
  - at-rest: [yes/no, mechanism]
  - in-transit: [yes/no, mechanism — e.g., TLS 1.2+]
  - field-level: [for which fields, mechanism]
- **Region constraints:** [must stay in EU / US / multi-region OK / etc.]
- **Regulatory regimes:** [GDPR / HIPAA / PCI / SOC2 / none]

## Operations (only when --with-ops)

> Emit this section only when the user passed `--with-ops`. Otherwise omit entirely.

- **Backup strategy:** [frequency, retention, RPO / RTO targets]
- **Replication / HA:** [sync/async, cross-AZ, cross-region]
- **Sharding / partitioning:** [strategy, shard key, expected shard count]

## Open questions

- [ ] [Question 1]
- [ ] [Question 2]

## Sources

- `.planning/ddd/AGGREGATE-{Name}.md` (per-aggregate scope) OR `.planning/ddd/CONTEXT-MAP.md` (per-context scope)
- `.planning/ddd/EVENT-STORM-{context}.md` (if exists — informs query patterns)
- `.planning/PROJECT.md` (regulatory context)
```

---

## Appendix: Native schema cues per storage type

The workflow uses these as starting points when filling the Schema section.

### relational (PostgreSQL, MySQL)

\`\`\`sql
CREATE TABLE orders (
  id          UUID PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id),
  status      order_status_t NOT NULL,
  total_cents BIGINT NOT NULL CHECK (total_cents >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  version     INTEGER NOT NULL DEFAULT 0  -- for optimistic locking
);

CREATE TYPE order_status_t AS ENUM ('DRAFT','PLACED','PAID','SHIPPED','DELIVERED','CANCELLED');

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);
\`\`\`

### document (MongoDB, Couchbase)

\`\`\`json
{
  "_id": "order_<uuid>",
  "customerId": "<uuid>",
  "status": "DRAFT | PLACED | PAID | SHIPPED | DELIVERED | CANCELLED",
  "items": [
    { "sku": "string", "qty": "int", "priceCents": "int" }
  ],
  "totalCents": "int (>= 0)",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "version": "int (optimistic locking)"
}
\`\`\`

Indexes: `_id` (primary), `status`, `(customerId, status)`.

### key-value (Redis, DynamoDB)

\`\`\`
order:{id}:meta             → JSON { customerId, status, totalCents, version, createdAt, updatedAt }
order:{id}:items            → list of JSON { sku, qty, priceCents }
order:by-customer:{cid}     → set of order ids
order:by-status:{status}    → sorted set, score = updatedAt epoch
\`\`\`

### wide-column (Cassandra, ScyllaDB)

\`\`\`cql
CREATE TABLE orders_by_customer (
  customer_id  UUID,
  created_at   TIMESTAMP,
  order_id     UUID,
  status       TEXT,
  total_cents  BIGINT,
  PRIMARY KEY ((customer_id), created_at, order_id)
) WITH CLUSTERING ORDER BY (created_at DESC);
\`\`\`

Partition key chosen for query pattern, not for the entity's "natural" key.

### graph (Neo4j, Neptune)

\`\`\`cypher
// Node types
(:Customer { id, email })
(:Order    { id, status, totalCents, createdAt })
(:Product  { sku, name, priceCents })

// Relationships
(:Customer)-[:PLACED { at }]->(:Order)
(:Order)-[:CONTAINS { qty, priceCents }]->(:Product)
\`\`\`

### vector (Qdrant, pgvector, Weaviate)

\`\`\`yaml
collection: order_search
dimension: 1024            # bge-m3 embedding dim
distance: cosine
payload_schema:
  order_id: keyword
  customer_id: keyword
  status: keyword
  text_repr: text          # serialized natural-language order summary embedded
\`\`\`

### time-series (InfluxDB, TimescaleDB)

\`\`\`
measurement: order_events
tags:    order_id (high cardinality), status, customer_id
fields:  total_cents (int), latency_ms (int)
time:    event_time
retention: 90d hot, 1y cold (downsampled hourly)
\`\`\`

### search (Elasticsearch, OpenSearch)

\`\`\`json
{
  "mappings": {
    "properties": {
      "order_id":    { "type": "keyword" },
      "status":      { "type": "keyword" },
      "customer_id": { "type": "keyword" },
      "items":       { "type": "nested",
        "properties": { "sku": { "type": "keyword" }, "name": { "type": "text" } } },
      "total_cents": { "type": "long" },
      "created_at":  { "type": "date" }
    }
  }
}
\`\`\`

### object-store (S3, MinIO)

\`\`\`
bucket: app-orders-prod
key layout: {tenant}/{year}/{month}/orders/{order_id}/{artifact}.{ext}
  examples:
    acme/2026/05/orders/abc123/invoice.pdf
    acme/2026/05/orders/abc123/snapshot.json
versioning: enabled
lifecycle: transition to GLACIER after 90 days; expire after 7 years
\`\`\`

### columnar-analytics (ClickHouse, BigQuery, Snowflake, DuckDB)

\`\`\`sql
CREATE TABLE order_events (
  event_time   DateTime64(3),
  order_id     UUID,
  customer_id  UUID,
  status       LowCardinality(String),
  total_cents  Int64,
  shard_key    UInt64 MATERIALIZED cityHash64(customer_id)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (status, event_time, order_id);
\`\`\`

### event-log (Kafka long-term, EventStoreDB)

\`\`\`
topic: orders.events.v1
partition key: order_id
retention: -1 (forever; this is source of truth for event-sourced aggregates)
schema versioning: header.schema_version field; backward-compatible evolution

events:
  OrderDrafted     { order_id, customer_id, ts }
  OrderPlaced      { order_id, items[], total_cents, ts }
  OrderPaid        { order_id, payment_id, ts }
  OrderShipped     { order_id, tracking_id, ts }
  OrderDelivered   { order_id, ts }
  OrderCancelled   { order_id, reason, ts }
\`\`\`

---

## Conventions

- **One storage spec per aggregate or per context** — not both for the same scope. Use `--context` only when the team explicitly wants one shared storage for the whole context (typical for transactional consistency at the context level).
- **Native language only.** Don't write abstract field lists in the Schema section — implementers should be able to copy-paste the schema and run it against the named engine.
- **Compliance is mandatory, not optional.** Even "none / indefinite / TLS only" is a real answer that prevents future ambiguity. Skipping it is the actual smell.
- **Operations is opt-in** because most planning rounds don't need backup/replication/sharding decisions yet. Pass `--with-ops` only when those decisions are imminent.
- **Polyglot per aggregate is encouraged.** Don't force one storage choice across all aggregates if the dominant patterns differ; that's how systems calcify around the wrong primitive.
