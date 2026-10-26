import { describe, expect, it } from 'vitest';
import { collectionConfirmed } from '@/lib/import/collections';
import { parseSpreadsheetRows } from '@/lib/import/records';
import { stratificationService } from '@/services/stratificationService';

describe('situação de coletas', () => {
  it('AGUARDANDO conta como A confirmar', () => expect(collectionConfirmed('AGUARDANDO')).toBe(false));
  it('COBRAR MOVIMENTAÇÃO conta como Confirmado', () => expect(collectionConfirmed('COBRAR MOVIMENTAÇÃO')).toBe(true));
});
describe('ordenação por volume', () => {
  const base = { 'Marca': 'Animale', 'Origem': 'Hub A', 'Hub corrigido': 'CD Masculino', 'Status': 'ENTREGUES', 'Existem ocorrencia': 'Não', 'Data Venda': '01/10/2026', 'Data de Entrega': '03/10/2026', 'UF': 'AC' };
  const records = parseSpreadsheetRows([base, { ...base, UF: 'SP' }, { ...base, UF: 'SP' }]);
  it('UF com mais pedidos vem primeiro', () => expect(stratificationService.getByUf({ period: 'Todo o período', operation: 'Todos', brand: 'Todas', carrier: 'Todas', status: 'Todos' }, records)[0]?.uf).toBe('SP'));
});
