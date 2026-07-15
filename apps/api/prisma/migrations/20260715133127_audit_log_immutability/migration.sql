-- Audit-Log ist append-only (P1.6): UPDATE und DELETE werden auf DB-Ebene
-- verweigert, unabhängig von der Anwendungslogik.
CREATE OR REPLACE FUNCTION audit_log_prevent_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log ist append-only: % ist nicht erlaubt.', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON "audit_log"
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_prevent_mutation();

CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON "audit_log"
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_prevent_mutation();