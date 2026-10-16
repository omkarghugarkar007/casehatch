# Synthetic BRD: customer CSV import

This is invented public demonstration material, not a customer document.

## BR-01: tenant isolation
An authenticated tenant administrator can import customer rows into that tenant. Another tenant must not read or change the job or imported records.

## BR-02: import identity
The same file content for the same tenant must not produce duplicate effective imports, including when a client retries an operation.

## BR-03: invalid data
Invalid rows must not silently corrupt customer data. The PRD and ticket must establish whether validation is atomic or partial.

## BR-04: audit result
The import result identifies the job and reports success or validation failure with actionable row errors.
