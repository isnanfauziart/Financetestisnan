import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const sql = readFileSync(join(process.cwd(), "supabase", "008-phase3-feature-gating.sql"), "utf8")

describe("phase 3 migration", () => {
  it("adds locked-down atomic usage reservation functions", () => {
    expect(sql).toMatch(/create or replace function reserve_usage\(\s*p_user_id uuid,\s*p_feature text,\s*p_period text,\s*p_limit integer\s*\)/i)
    expect(sql).not.toMatch(/p_bypass_limit/i)
    expect(sql).toMatch(/for update/i)
    expect(sql).toMatch(/if not exists \(select 1 from users where id = p_user_id\) then\s+raise exception 'user_not_found'/i)
    expect(sql).toMatch(/select u\.tier = 'paid' or exists/i)
    expect(sql).toMatch(/if not v_unlimited and \(p_limit is null or p_limit < 1\) then\s+raise exception 'invalid_feature_limit'/i)
    expect(sql).toMatch(/if not v_unlimited and v_count >= p_limit then\s+raise exception 'feature_limit_exceeded'/i)
    expect(sql).toMatch(/create or replace function release_usage/i)
    expect(sql).toMatch(/greatest\(count - 1, 0\)/i)
    expect(sql).toMatch(/security definer set search_path = public/i)
    expect(sql).toMatch(/revoke all on function reserve_usage\(uuid, text, text, integer\) from public/i)
    expect(sql).toMatch(/revoke all on function reserve_usage\(uuid, text, text, integer\) from anon, authenticated/i)
    expect(sql).toMatch(/grant execute on function reserve_usage\(uuid, text, text, integer\) to service_role/i)
    expect(sql).toMatch(/revoke all on function increment_usage\(uuid, text, text\) from public/i)
  })

  it("normalizes and dedupes admins before enforcing normalized uniqueness", () => {
    expect(sql).toMatch(/row_number\(\) over \(partition by lower\(trim\(email\)\)/i)
    expect(sql).toMatch(/delete from admins/i)
    expect(sql).toMatch(/update admins\s+set email = lower\(trim\(email\)\)/i)
    expect(sql).toMatch(/add constraint admins_email_normalized_check\s+check \(email = lower\(trim\(email\)\)\)/i)
    expect(sql).toMatch(/create unique index if not exists idx_admins_email_normalized_unique\s+on admins \(lower\(trim\(email\)\)\)/i)
    expect(sql).toMatch(/where lower\(trim\(a\.email\)\) = lower\(trim\(u\.email\)\)/i)
  })

  it("redefines add_admin to normalize future admin writes", () => {
    expect(sql).toMatch(/create or replace function add_admin\(p_email text\)/i)
    expect(sql).toMatch(/insert into admins \(email\)\s+values \(lower\(trim\(p_email\)\)\)/i)
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION add_admin(TEXT) TO service_role;")
  })

  it("adds service-role-only atomic feature write claims", () => {
    expect(sql).toMatch(/create table if not exists feature_write_claims[\s\S]*primary key \(user_id, write_key\)/i)
    expect(sql).toMatch(/create or replace function claim_feature_write\([\s\S]*on conflict do nothing[\s\S]*return v_inserted = 1/i)
    expect(sql).toContain("REVOKE ALL ON TABLE feature_write_claims FROM PUBLIC, anon, authenticated;")
    expect(sql).toContain("REVOKE ALL ON FUNCTION claim_feature_write(UUID, TEXT) FROM anon, authenticated;")
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION claim_feature_write(UUID, TEXT) TO service_role;")
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION release_feature_write(UUID, TEXT) TO service_role;")
  })

  it("adds expiring service-role-only feature creation locks", () => {
    expect(sql).toMatch(/create table if not exists feature_creation_locks[\s\S]*lock_token uuid not null[\s\S]*primary key \(user_id, feature\)/i)
    expect(sql).toMatch(/create or replace function claim_feature_creation[\s\S]*on conflict \(user_id, feature\) do update[\s\S]*interval '2 minutes'/i)
    expect(sql).toContain("REVOKE ALL ON TABLE feature_creation_locks FROM PUBLIC, anon, authenticated;")
    expect(sql).toMatch(/delete from feature_creation_locks[\s\S]*lock_token = p_lock_token/i)
    expect(sql).toContain("REVOKE ALL ON FUNCTION claim_feature_creation(UUID, TEXT, UUID) FROM anon, authenticated;")
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION claim_feature_creation(UUID, TEXT, UUID) TO service_role;")
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION release_feature_creation(UUID, TEXT, UUID) TO service_role;")
  })

  it("locks down legacy backend-only security definer helpers without touching feature flag readers", () => {
    for (const signature of [
      "get_user_by_email(TEXT)",
      "is_admin(TEXT)",
      "get_user_tier_info(UUID)",
      "add_admin(TEXT)",
      "remove_admin(TEXT)",
      "get_usage_count(UUID, TEXT, TEXT)",
      "increment_usage(UUID, TEXT, TEXT)",
      "check_usage_limit(UUID, TEXT, TEXT, INTEGER)",
    ]) {
      expect(sql).toContain(`REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC;`)
      expect(sql).toContain(`REVOKE ALL ON FUNCTION ${signature} FROM anon, authenticated;`)
      expect(sql).toContain(`GRANT EXECUTE ON FUNCTION ${signature} TO service_role;`)
    }
    expect(sql).not.toMatch(/revoke all on function is_feature_enabled/i)
    expect(sql).not.toMatch(/revoke all on function get_all_feature_flags/i)
  })
})
