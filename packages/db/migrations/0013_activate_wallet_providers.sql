-- =============================================================================
-- Activate eSewa and Khalti.
--
-- HAND-WRITTEN, and a data migration rather than a schema one. `seed/index.ts`
-- inserts providers with ON CONFLICT DO NOTHING, so flipping `is_active` in
-- `seed/providers.ts` reaches a fresh database and never an existing one. Every
-- environment that already ran the seed — local, preview, production — keeps
-- the inactive rows it was given until something updates them, and until now
-- nothing in this repository could: no admin screen writes this column and no
-- script did either, so the only way a provider had ever been switched on was
-- somebody typing UPDATE into a database console.
--
-- That is the mechanism behind "it works in dev but not in production". The
-- code was identical in both; the row was not.
--
-- Fonepay is deliberately left alone. Its adapter is a stub pending the bank's
-- integration document (PHASES.md Phase 9) and the composition root refuses to
-- register it, so an active row would only produce a provider that cannot be
-- offered.
-- =============================================================================

UPDATE payment_providers
   SET is_active = TRUE
 WHERE id IN ('esewa', 'khalti');
