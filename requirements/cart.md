# Shopping Cart Feature

## User Story

As a logged-in customer,
I want to add and remove products from my shopping cart,
so that I can manage the products I intend to purchase.

## Acceptance Criteria

1. A logged-in user can add a product to the shopping cart.
2. When a product is added, the shopping cart indicates that it contains the product.
3. A logged-in user can open the shopping cart and see a product that was added.
4. A logged-in user can remove a product from the shopping cart.
5. After a product is removed, it is no longer present in the shopping cart.

## Test Environment

Application: https://www.saucedemo.com

Known test user:

- standard_user

Password:

- secret_sauce

## Test Data

Use any product currently available in the product inventory.

Do not assume a specific product name unless it is discovered from the application during exploration.

## Quality Expectations

Consider:

- positive scenarios
- state consistency between the inventory and cart
- navigation between inventory and cart
- adding more than one product
- removing products
- cross-browser considerations
- usability issues

Do not invent requirements that are not supported by the information provided.

Clearly mark exploratory suggestions separately from requirement-derived tests.