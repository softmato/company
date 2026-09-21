-- Fonepay has a real adapter now (providers/fonepay/, built from the bank's
-- Checkout Intent Flow v1.10 and checked against its dev gateway). An active
-- row alone offers nothing: the checkout intersects it with the registered
-- adapters, and Fonepay is registered only where its credentials are set.
UPDATE payment_providers
   SET is_active = TRUE
 WHERE id = 'fonepay';
