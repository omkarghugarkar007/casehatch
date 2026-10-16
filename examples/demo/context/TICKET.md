# Synthetic ticket CSV-17

Implement customer CSV import using the BRD and PRD. Existing project authentication and fixtures should be reused.

## Acceptance criteria
Valid uploads produce the expected rows and a stable job identity. Duplicate content cannot create duplicate effective imports. Tenant isolation and the 10 MiB boundary apply.

## Clarification needed
Decide whether one invalid row rejects the whole batch, and what a retry with the same idempotency key should return after a timeout. Ask only if an existing accepted decision has not already resolved these points.
