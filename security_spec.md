# Security Specification - Operational Dashboard

## Data Invariants
1. `verticalData/{verticalId}`: `verticalId` must be one of `['Financeiro I', 'Financeiro II', 'Governo', 'Agro/Corp']`.
2. `settings` and `params` must be present and have strictly valid types (numbers).
3. `updatedAt` must always match `request.time`.
4. `execCapacity` in `settings/global` must be a number between 1 and 1000.

## The "Dirty Dozen" Payloads (Deny List)
1. Write to `verticalData/InvalidVertical`: Should be denied (ID validation).
2. Write to `verticalData/Financeiro I` with `isVerified: true` (Ghost field): Should be denied (Strict key check).
3. Write to `verticalData/Financeiro I` with `settings: { suporteTreinamento: "string" }` (Type mismatch): Should be denied.
4. Write to `verticalData/Financeiro I` with `updatedAt: "2023-01-01"` (Non-server timestamp): Should be denied.
5. Write to `settings/global` with `execCapacity: -10` (Boundary check): Should be denied.
6. Write to `settings/global` with `secretField: "malicious"` (Ghost field): Should be denied.
7. Attempt to update `verticalData/Financeiro I` as unauthenticated user: Should be denied.
8. Attempt to update `verticalData/Financeiro I` as authenticated user but NOT Bruno.Chayb@gmail.com: Should be denied.
9. Write `verticalData/Financeiro I` with a payload larger than 1MB (implicitly handled by Firestore but good to note).
10. Update `settings/global` without providing `execCapacity`: Should be denied if schema requires it.
11. Pass a 2KB string as a `verticalId`: Should be denied by size check.
12. Modify `updatedAt` in an update without using `request.time`: Should be denied.

## The Test Runner
A `firestore.rules.test.ts` will be created to verify these constraints.
