# Synthetic PRD: customer CSV import

This is invented public demonstration material.

## PR-01: normal import
An administrator uploads a comma-separated UTF-8 CSV with name and email columns. A valid file creates an import job and the expected customer rows. The result exposes the job ID.

## PR-02: duplicate request
A new import request for file content already imported in the same tenant must report an existing import rather than creating another effective import. The initial new-request behavior is HTTP 409 with the existing job ID.

## PR-03: size boundary
Files up to and including 10 MiB are allowed. Files above 10 MiB are rejected before importing rows.

## PR-04: validation and retry questions
The story leaves the all-or-nothing policy for mixed valid/invalid rows and the response to retrying an uncertain request to clarification.

## PR-05: initial exclusions
The first feature does not support Excel files, alternate delimiters or per-row partial edits after submission. Additional display-only filename edge cases are optional suggestions.
