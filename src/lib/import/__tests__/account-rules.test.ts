import { describe, expect, it } from 'vitest';
import { accountBrandScope, accountInput, requireMasterPermission } from '../../account-rules';

const credentials = { username: 'new-user', password: 'test-password-only' };

describe('Master account creation', () => {
  it('allows an authenticated verified Master to administer accounts', () => {
    expect(() => requireMasterPermission(true, null)).not.toThrow();
  });
  it('rejects an owner attempting to create a Master', () => {
    expect(() => requireMasterPermission(false, null)).toThrow('Acesso restrito ao Master.');
  });
  it('fails closed if the role check is unavailable', () => {
    expect(() => requireMasterPermission(true, new Error('unavailable'))).toThrow();
    expect(() => requireMasterPermission(null, null)).toThrow();
  });
  it('creates a Master without any brand restriction, ignoring caller supplied brand', () => {
    const data = accountInput.parse({ ...credentials, role: 'master', brand: 'Animale' });
    expect(data.role).toBe('master');
    expect(accountBrandScope(data).brand).toBeNull();
    expect(accountInput.parse({ ...credentials, role: 'master' }).role).toBe('master');
  });
  it('preserves owner accounts tied to their brand', () => {
    const data = accountInput.parse({ ...credentials, brands: ['Animale', 'Farm'] });
    expect(data.role).toBe('owner');
    expect(accountBrandScope(data)).toEqual({ brand: 'Animale', brands: ['Animale', 'Farm'] });
    expect(accountInput.safeParse({ ...credentials, role: 'owner', brands: [] }).success).toBe(false);
  });
  it('does not allow promotion through owner editing', () => {
    expect(accountInput.safeParse({ ...credentials, role: 'master', userId: '11111111-1111-4111-8111-111111111111' }).success).toBe(false);
  });
});