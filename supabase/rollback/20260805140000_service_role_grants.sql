alter default privileges in schema public
  revoke all privileges on functions from service_role;

alter default privileges in schema public
  revoke all privileges on sequences from service_role;

alter default privileges in schema public
  revoke all privileges on tables from service_role;

revoke all privileges on all functions in schema public from service_role;
revoke all privileges on all sequences in schema public from service_role;
revoke all privileges on all tables in schema public from service_role;

revoke usage on schema public from service_role;
