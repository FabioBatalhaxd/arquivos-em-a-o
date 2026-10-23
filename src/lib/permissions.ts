import { z } from 'zod';

export const PERMISSION_GROUPS = [
  { title: 'Visão do painel', items: [
    { key: 'kpis', label: 'Dashboard e indicadores gerais' },
    { key: 'filters', label: 'Filtros avançados e seleção múltipla' },
    { key: 'ufStratification', label: 'Estratificação por UF' },
    { key: 'carrierStratification', label: 'Estratificação por transportadora' },
    { key: 'carrierShare', label: 'Participação das transportadoras' },
    { key: 'leadTime', label: 'Lead time' },
  ] },
  { title: 'Relatórios', items: [
    { key: 'deliveryProgress', label: 'Progresso de entregas' },
    { key: 'orderJourney', label: 'Onde está meu pedido' },
    { key: 'recentOrders', label: 'Histórico de pedidos' },
  ] },
  { title: 'Ocorrências', items: [
    { key: 'incidentsIndicator', label: 'Ver indicador de ocorrências' },
    { key: 'incidentsDetails', label: 'Ver lista, motivos e detalhes' },
    { key: 'incidentsExport', label: 'Exportar ocorrências' },
  ] },
  { title: 'Coletas', items: [
    { key: 'collections', label: 'Monitoramento de coletas' },
  ] },
] as const;

export type PermissionKey = (typeof PERMISSION_GROUPS)[number]['items'][number]['key'];
export type Permissions = Record<PermissionKey, boolean>;
export const PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key)) as PermissionKey[];

const OFF_BY_DEFAULT: PermissionKey[] = ['deliveryProgress', 'incidentsIndicator', 'incidentsDetails', 'incidentsExport'];
export const DEFAULT_PERMISSIONS = Object.fromEntries(PERMISSION_KEYS.map(k => [k, !OFF_BY_DEFAULT.includes(k)])) as Permissions;
export const ALL_PERMISSIONS = Object.fromEntries(PERMISSION_KEYS.map(k => [k, true])) as Permissions;

export const permissionsSchema = z.object(Object.fromEntries(PERMISSION_KEYS.map(k => [k, z.boolean()])) as Record<PermissionKey, z.ZodBoolean>);

/** Stored permissions may be partial or empty (older accounts); fill gaps with defaults. */
export function resolvePermissions(stored: unknown, isMaster: boolean): Permissions {
  if (isMaster) return ALL_PERMISSIONS;
  const raw = stored && typeof stored === 'object' ? stored as Record<string, unknown> : {};
  return Object.fromEntries(PERMISSION_KEYS.map(k => [k, typeof raw[k] === 'boolean' ? raw[k] : DEFAULT_PERMISSIONS[k]])) as Permissions;
}

export function accountBrands(account: { brand: string | null; brands?: string[] | null }) {
  const list = account.brands?.length ? account.brands : account.brand ? [account.brand] : [];
  return [...new Set(list)];
}
