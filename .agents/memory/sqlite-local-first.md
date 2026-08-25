---
name: Local-first SQLite
description: Why HusStand Hub keeps its operational data in a local SQLite file.
---

HusStand Hub must keep SQLite as its primary persistence layer and avoid dependencies on managed cloud databases.

**Why:** The product is intended to run locally on a Raspberry Pi after its initial Replit development phase.

**How to apply:** Keep new household modules in the SQLite/Drizzle data model, make the database path configurable, and avoid introducing externally hosted persistence unless the user explicitly changes this direction.