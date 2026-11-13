-- Run once after `prisma migrate deploy`: makes the audit log append-only at the database level.
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'audit_event is append-only'; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_no_update ON "AuditEvent";
CREATE TRIGGER audit_no_update BEFORE UPDATE OR DELETE ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
