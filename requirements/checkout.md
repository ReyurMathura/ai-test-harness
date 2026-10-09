# Checkout Feature

## User Story

As a logged-in customer with a product in my shopping cart,
I want to complete the checkout process,
so that I can place my order.

## Acceptance Criteria

1. A logged-in user with a product in the shopping cart can start checkout.

2. First name is mandatory before the user can continue from the checkout information step.

3. Last name is mandatory before the user can continue from the checkout information step.

4. Postal code is mandatory before the user can continue from the checkout information step.

5. A user who provides all required checkout information can continue to the order overview.

6. A user can complete the order from the order overview.

7. After completing the order, the application confirms that the order was successfully completed.

## Test Environment

Application: https://www.saucedemo.com

Known test user:

- standard_user

Password:

- secret_sauce

## Test Data

Checkout customer:

- first_name: Test
- last_name: Customer
- postal_code: 4001

Use any product currently available in the product inventory.

Do not assume a specific product name unless it is discovered from the live application during exploration.

## Quality Expectations

Consider:

- positive checkout flow
- mandatory-field validation
- preserving the selected product through the checkout process
- navigation between checkout steps
- order state consistency
- cross-browser considerations

Do not invent requirements that are not supported by the information provided.

Do not assume:

- exact validation messages
- exact button labels
- exact page URLs
- exact order confirmation text

unless they are discovered from the live application.

Clearly mark exploratory suggestions separately from requirement-derived tests.