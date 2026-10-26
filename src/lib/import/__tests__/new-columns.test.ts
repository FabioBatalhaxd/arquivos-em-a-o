import { describe, it, expect } from 'vitest';
import { collectionConfirmed } from '@/lib/import/collections';
import { parseSpreadsheetRows } from '@/lib/import/records';
import { displayText } from '@/lib/text-format';

describe('novas regras', () => {
  it('situações de coleta', () => {
    for (const s of ['AG. COLETA','PROBLEMA INTEGRAÇÃO','AGUARDANDO']) expect(collectionConfirmed(s)).toBe(false);
    for (const s of ['COBRAR MOVIMENTAÇÃO','AG. MOVIMENTAÇÃO']) expect(collectionConfirmed(s)).toBe(true);
  });
  it('lê colunas novas e traduz woman/men', () => {
    const [r] = parseSpreadsheetRows([{ Marca:'Animale', DATA_HORA_INTEGRACAO:'10/07/2026', PEDIDO_SITE:'123', UF_DESTINO:'sp', 'TRANSP.':'Loggi', DT_ENTREGA:'', 'TEM OCORRÊNCIA?':'Não', TIPO_ATENDIMENTO:'SFS Woman', 'DE X PARA CORRIGIDO':'Em trânsito' }]);
    expect(r!.operation).toBe('SFS Feminino'); expect(r!.uf).toBe('SP'); expect(r!.id).toBe('123');
    expect(parseSpreadsheetRows([{ Marca:'X', DATA_HORA_INTEGRACAO:'10/07/2026', UF_DESTINO:'RJ', 'TEM OCORRÊNCIA?':'Não', TIPO_ATENDIMENTO:'CD men', 'DE X PARA CORRIGIDO':'Entregue' }])[0]!.operation).toBe('CD Masculino');
  });
  it('capitalização preserva siglas', () => {
    expect(displayText('EM TRÂNSITO')).toBe('Em trânsito');
    expect(displayText('AG. PROCESSAMENTO')).toBe('AG. processamento');
  });
});
