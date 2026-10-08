# Agentic Development Readiness rubric check

This file maps the handoff package to the rubric. It intentionally excludes the separate "Team Understanding & Readiness" section, which the team will prepare later.

## 1. Project Specifications: target 15 / 15

Rubric intent: repository contains clear, implementation-ready specifications derived from prior requirements, research, designs, and technical decisions. Important decisions are documented rather than left for an agent to determine.

Evidence in this package:

- `architecture.md`: pattern, components, responsibilities, dependencies, current/planned clients
- `data-model.md`: exact entities, fields, relationships, controlled values, integrity and delete rules
- `interfaces.md`: behavior across the shared application boundary
- `security.md`: authentication, authorization, privacy, location, media, messaging, export, deletion
- `design/user-flows.md`: functional end-to-end flows
- `design/ui-spec.md`: screen-level responsibilities and UI constraints
- `decisions-and-open-questions.md`: records which older planning language is superseded and which genuine questions must be escalated

The key strength is that an agent does not need to decide whether search is public, whether FOUND is a second report type, whether shelter data is live, whether Prisma is required, or where authorization belongs. Those decisions are already explicit.

## 2. Agent / Development Configuration: target 10 / 10

Rubric intent: `AGENTS.md` or equivalent provides useful persistent instructions, identifies authoritative documentation, states constraints, explains work/verification, and tells the agent what to do when requirements are unclear.

Evidence:

- root `AGENTS.md` points to the specifications instead of duplicating them;
- it states architecture and data constraints;
- it defines the investigation -> plan -> implementation -> verification workflow;
- it defines the four repository verification commands;
- it requires negative security tests;
- it tells the agent to stop and ask when an unresolved decision affects data, security, privacy, or user-visible behavior;
- it contains the first-task "stop before implementation" rule.

## 3. Development Environment & Verification: target 5 / 5

Rubric intent: project is ready for development and a developer can determine how to run and verify it.

Evidence:

- `development-environment.md` records the inspected stack and current repository state;
- local install and environment setup are documented;
- secrets are separated from browser-safe variables;
- the app run command is documented;
- lint, typecheck, test, and build commands are documented;
- CI behavior and Node 20 are documented;
- known gaps such as missing Prisma/migrations are identified as implementation work rather than hidden setup;
- the inspected repository's latest CI run was successful.

## 4. First Implementation Task & Agent Plan: target 10 / 10 after team review

Rubric intent: first meaningful task has clear scope and acceptance criteria. The agent investigates the repository and proposes a plan. The team critically reviews the plan before implementation.

Evidence:

- `first-implementation-task.md` selects a foundation task directly tied to the first setup/auth/database stage;
- scope and out-of-scope boundaries are explicit;
- acceptance criteria are testable;
- the repository was investigated and the findings are recorded;
- a proposed implementation sequence is present;
- the agent is explicitly told to stop before implementation.

### Remaining human action for full credit

The team still needs to review the local agent's final repository-specific plan and fill the review record at the end of `first-implementation-task.md`.

Without that human review evidence, the documentation can support the plan but cannot honestly prove that the team critically reviewed it.

## Suggested submission evidence

When presenting this work, be ready to show:

- the repository `docs/` tree;
- `AGENTS.md`;
- `package.json` scripts;
- `.github/workflows/ci.yml`;
- a successful CI run;
- `docs/first-implementation-task.md`;
- the agent's proposed plan;
- the completed team review record.

That set of evidence directly mirrors the first four rubric rows.
