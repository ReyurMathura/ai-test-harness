# Product API

## User Story

As a consumer of the product API,
I want to retrieve, search, paginate, and validate product information,
so that I can use product data reliably in an application.

## Acceptance Criteria

1. A user can retrieve a list of products.

2. A user can retrieve a single product by ID.

3. A user can search for products using a search term.

4. A user can request a limited number of products for pagination.

5. Product responses contain the expected core product information.

6. A representative sample of products returned in the product list should contain valid core product information.

## Test Environment

Base URL:

https://dummyjson.com

Product API documentation:

https://dummyjson.com/docs/products

## Test Data

Known product ID:

1

Search term:

phone

Pagination:

limit = 5

## Quality Considerations

Test coverage should consider:

- successful HTTP responses
- HTTP response status codes
- response content type
- response body structure
- required product fields
- response data types
- search behaviour
- pagination behaviour
- representative collection-level validation
- deterministic assertions
- unexpected or malformed responses

## Constraints

Do not assume undocumented response fields or behaviour.

Do not invent API endpoints, HTTP methods, status codes, request parameters,
response schemas, or exact product values.

API behaviour should be discovered from the documented or observed API
before automated tests are generated.

When a representative sample size is not explicitly supplied,
the test planner may select a safe, concrete sample size and document
that choice as an assumption.

Tests must not depend on execution order.

Do not perform load, stress, brute-force, or destructive testing.