CREATE OR REPLACE FUNCTION reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('siromix.test_reset', true) = 'enabled' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'AUDIT_APPEND_ONLY';
END;
$$;

CREATE TRIGGER "AuditEnvelope_append_only_update"
BEFORE UPDATE ON "public"."AuditEnvelope"
FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();

CREATE TRIGGER "AuditEnvelope_append_only_delete"
BEFORE DELETE ON "public"."AuditEnvelope"
FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
