import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { loginEmail, normalize, packRecords, recordSchema } from '@/lib/import/records';
import type { ImportedRecord } from '@/lib/import/records';
import type { Json } from '@/integrations/supabase/types';
import { accountCredentials, accountInput, accountBrandScope, requireMasterPermission } from '@/lib/account-rules';
import { DEFAULT_PERMISSIONS, accountBrands, resolvePermissions } from '@/lib/permissions';

const credentials = accountCredentials;
export const setupMaster = createServerFn({method:'POST'}).inputValidator((input: unknown) => credentials.extend({code:z.string().min(8).max(256)}).parse(input)).handler(async ({data}) => {
  const code = process.env['MASTER_SETUP_CODE'];
  if (!code) throw new Error('Configuração inicial indisponível.');
  const {supabaseAdmin} = await import('@/integrations/supabase/client.server');
  const key = getRequestHeader('cf-connecting-ip') ?? 'global';
  const {data:allowed,error:rateError} = await supabaseAdmin.rpc('dashboard_setup_allowed',{_key:key});
  if (rateError || !allowed) throw new Error('Aguarde 15 minutos antes de tentar novamente.');
  const a = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code));
  const b = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data.code));
  const aa = new Uint8Array(a); const bb = new Uint8Array(b);
  let diff=0; for(let i=0;i<aa.length;i++) diff |= (aa[i] ?? 0) ^ (bb[i] ?? 0);
  if(diff) throw new Error('Código de configuração inválido.');
  const {data:existing,error:existingError} = await supabaseAdmin.from('user_roles').select('user_id').eq('role','master').limit(1);
  if(existingError || existing?.length) throw new Error('Master já configurado ou configuração indisponível.');
  const {data:created,error} = await supabaseAdmin.auth.admin.createUser({email:loginEmail(data.username),password:data.password,email_confirm:true});
  if(error || !created.user) throw new Error('Não foi possível criar o Master. Confira usuário e senha.');
  const {error:claimError} = await supabaseAdmin.rpc('claim_first_master',{_user_id:created.user.id,_username:normalize(data.username)});
  if(claimError) {await supabaseAdmin.auth.admin.deleteUser(created.user.id);throw new Error('Não foi possível configurar o Master.');}
  return {ok:true};
});

export const getDashboardData = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async ({context}) => {
  const {data:account,error} = await context.supabase.from('brand_accounts').select('*').eq('user_id',context.userId).single();
  if(error || !account) throw new Error('Seu acesso ainda não foi vinculado a uma marca pelo Master.');
  const {data:isMaster,error:roleError} = await context.supabase.rpc('dashboard_is_master');
  if(roleError) throw new Error('Não foi possível verificar o acesso.');
  const {data:imports,error:importError} = await context.supabase.from('dashboard_imports').select('*').eq('status','ready').order('created_at',{ascending:false}).limit(1);
  if(importError) throw new Error('Não foi possível consultar a atualização.');
  const records: ImportedRecord[]=[];
  const importId = imports?.[0]?.id ?? '00000000-0000-0000-0000-000000000000';
  // Keyset id windows (not OFFSET) so parallel page reads stay index-only and under the statement timeout.
  const bound = (asc: boolean) => context.supabase.from('dashboard_records').select('id').eq('import_id',importId).order('id',{ascending:asc}).limit(1).maybeSingle();
  const [lo,hi] = await Promise.all([bound(true),bound(false)]);
  if(lo.error || hi.error) throw new Error('Não foi possível carregar os pedidos.');
  if(lo.data && hi.data) {
    const windows: [number,number][] = [];
    for(let s=lo.data.id;s<=hi.data.id;s+=1000) windows.push([s,s+1000]);
    for(let i=0;i<windows.length;i+=6) {
      const batch = await Promise.all(windows.slice(i,i+6).map(([a,b])=>context.supabase.from('dashboard_records').select('payload').eq('import_id',importId).gte('id',a).lt('id',b).order('id').limit(1000)));
      for(const {data:page,error:pageError} of batch) {
        if(pageError) { console.error('dashboard page failed', pageError.message); throw new Error('Não foi possível carregar os pedidos.'); }
        for(const item of page ?? []) records.push(recordSchema.parse(item.payload));
      }
    }
  }
  const permissions = resolvePermissions(account.permissions, !!isMaster);
  // Without any occurrence permission, the occurrence flag never leaves the server.
  if(!permissions.incidentsIndicator && !permissions.incidentsDetails) for(const r of records) r.incident=false;
  return {account:{user_id:account.user_id,username:account.username,brand:account.brand,brands:accountBrands(account)},isMaster:!!isMaster,permissions,packedRecords:packRecords(records),latestImport:imports?.[0] ?? null};
});

const masterGuard = async (supabase: { rpc: (fn: 'dashboard_is_master') => PromiseLike<{data: unknown; error: unknown}> }) => {
  const {data,error}=await supabase.rpc('dashboard_is_master');
  if(error || !data) throw new Error('Somente o Master pode importar.');
};
export const beginImport = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({filename:z.string().min(1).max(255),sourceRows:z.number().int().min(1).max(1048576)}).parse(input)).handler(async ({data,context})=>{
  await masterGuard(context.supabase);
  const {data:id,error}=await context.supabase.rpc('begin_dashboard_import',{_filename:data.filename,_source_rows:data.sourceRows});
  if(error || !id) throw new Error('Não foi possível iniciar a importação.');
  return {id:id as string};
});
export const appendImport = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({importId:z.string().uuid(),records:z.array(recordSchema).min(1).max(5000)}).parse(input)).handler(async ({data,context})=>{
  if(data.records.some(r => r.deliveredAt && Date.parse(r.deliveredAt)<Date.parse(r.soldAt))) throw new Error('Datas ou lead time inválidos.');
  const {error}=await context.supabase.rpc('append_dashboard_records',{_import_id:data.importId,_records:data.records as unknown as Json});
  if(error) throw new Error('Falha ao enviar parte da planilha.');
  return {ok:true};
});
export const finishImport = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({importId:z.string().uuid()}).parse(input)).handler(async ({data,context})=>{
  const {error}=await context.supabase.rpc('finish_dashboard_import',{_import_id:data.importId});
  if(error) throw new Error('Importação não concluída. Os dados anteriores foram preservados.');
  return {ok:true};
});
export const cancelImport = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>z.object({importId:z.string().uuid()}).parse(input)).handler(async ({data,context})=>{
  await context.supabase.rpc('cancel_dashboard_import',{_import_id:data.importId});
  return {ok:true};
});

export const listBrandAccounts = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async ({context}) => {
  const {data:isMaster,error:roleError}=await context.supabase.rpc('dashboard_is_master');
  if(roleError || !isMaster) throw new Error('Acesso restrito ao Master.');
  const [{data,error},{data:names}]=await Promise.all([context.supabase.from('brand_accounts').select('*').order('username'),context.supabase.rpc('dashboard_brand_names')]);
  if(error) throw new Error('Não foi possível consultar os acessos.');
  const accounts=data.map(a=>({user_id:a.user_id,username:a.username,brand:a.brand,brands:accountBrands(a),permissions:resolvePermissions(a.permissions,false)}));
  const knownBrands=[...new Set([...((names as string[]|null)??[]),...accounts.flatMap(a=>a.brands)])].sort((x,y)=>x.localeCompare(y,'pt-BR'));
  return {accounts,knownBrands};
});
export const saveBrandAccount = createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((input:unknown)=>accountInput.parse(input)).handler(async ({context,data})=>{
  const {data:isMaster,error:roleError}=await context.supabase.rpc('dashboard_is_master');
  requireMasterPermission(isMaster, roleError);
  const {brand,brands} = accountBrandScope(data);
  const permissions = (data.role==='master' ? {} : data.permissions ?? DEFAULT_PERMISSIONS) as unknown as Json;
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  if(data.userId) {
    // RLS only exposes caller roles; verify target via the admin client AFTER caller authorization.
    const {data:targetRoles,error:targetError}=await supabaseAdmin.from('user_roles').select('role').eq('user_id',data.userId);
    if(targetError || !targetRoles?.some(r=>r.role==='owner') || targetRoles.some(r=>r.role==='master')) throw new Error('Acesso inválido para alteração.');
    if(data.password) {
      const {error:updateError}=await supabaseAdmin.auth.admin.updateUserById(data.userId,{password:data.password});
      if(updateError) throw new Error('Não foi possível alterar a senha.');
    }
    const {error:brandError}=await supabaseAdmin.from('brand_accounts').update({brand,brands,permissions}).eq('user_id',data.userId);
    if(brandError) throw new Error('Não foi possível salvar marcas e permissões.');
    return {ok:true};
  }
  if(!data.password) throw new Error('Informe a senha.');
  const {data:created,error}=await supabaseAdmin.auth.admin.createUser({email:loginEmail(data.username),password:data.password,email_confirm:true});
  if(error || !created.user) throw new Error('Não foi possível criar o acesso. O usuário pode já existir.');
  const id=created.user.id;
  const {error:accountError}=await supabaseAdmin.from('brand_accounts').insert({user_id:id,username:normalize(data.username),brand,brands,permissions});
  const {error:roleInsertError}= accountError ? {error:accountError} : await supabaseAdmin.from('user_roles').insert({user_id:id,role:data.role});
  if(accountError || roleInsertError) {
    await supabaseAdmin.from('brand_accounts').delete().eq('user_id',id);
    await supabaseAdmin.auth.admin.deleteUser(id);throw new Error('Não foi possível configurar o acesso.');
  }
  return {ok:true};
});
