# Synthetic accepted decisions

These answers are fixture requirements, invented for this demo; no real user or customer is represented.

## DEC-01: atomic validation
Reject an entire mixed valid/invalid batch with HTTP 422, actionable row errors and no persisted rows or job.

## DEC-02: retry identity
A retry with the same tenant and idempotency key returns HTTP 200 and the original job ID, even after a response was lost. It creates no second job or rows. Reusing a key for different content returns HTTP 409.

## DEC-03: authentication fixture
The local-only fixture uses an x-tenant header to stand in for an already authenticated tenant administrator. Production authentication is outside this synthetic app. Cross-tenant job lookup returns HTTP 404.

## DEC-04: CSV fixture boundary
The fixture supports unquoted comma-separated name,email rows, optional empty lines, and a UTF-8 text/csv body. Excel, quoted fields, BOM, alternate delimiters and display filenames are excluded from this demo.
