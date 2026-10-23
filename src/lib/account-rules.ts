import { z } from 'zod';
import { permissionsSchema } from '@/lib/permissions';

export const accountCredentials = z.object({
  username: z.string().trim().min(2).max(60),
  password: z.string().min(8).max(128),
});

export const accountInput = accountCredentials.extend({
  role: z.enum(['owner', 'master']).default('owner'),
  brands: z.array(z.string().trim().min(1).max(120)).max(200).default([]),
  permissions: permissionsSchema.optional(),
  userId: z.string().uuid().optional(),
  password: z.string().max(128).optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'owner' && !data.brands.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['brands'], message: 'Selecione ao menos uma marca.' });
  }
  if (data.userId && data.role === 'master') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['role'], message: 'Este formulário não altera perfis existentes.' });
  }
  const minPassword = data.userId ? 0 : 8;
  if ((data.password ?? '').length < minPassword || (data.password && data.password.length < 8)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'A senha precisa ter ao menos 8 caracteres.' });
  }
});

export function requireMasterPermission(isMaster: boolean | null, error: unknown) {
  if (error || isMaster !== true) throw new Error('Acesso restrito ao Master.');
}

export function accountBrandScope(data: z.infer<typeof accountInput>) {
  if (data.role === 'master') return { brand: null, brands: [] as string[] };
  const brands = [...new Set(data.brands)];
  if (!brands.length) throw new Error('Selecione ao menos uma marca.');
  return { brand: brands[0]!, brands };
}
