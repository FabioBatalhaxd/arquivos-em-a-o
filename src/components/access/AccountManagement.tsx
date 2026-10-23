import { useState } from 'react';
import { queryOptions, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Save, Pencil, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listBrandAccounts, saveBrandAccount } from '@/lib/access.functions';
import { DEFAULT_PERMISSIONS, PERMISSION_GROUPS, type Permissions } from '@/lib/permissions';

export const accountsQuery=queryOptions({queryKey:['brand-accounts'],queryFn:()=>listBrandAccounts()});

export function AccountManagement(){
  const {data:{accounts,knownBrands}}=useSuspenseQuery(accountsQuery);
  const qc=useQueryClient(),save=useServerFn(saveBrandAccount);
  const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[userId,setUserId]=useState<string|undefined>();
  const [role,setRole]=useState<'owner'|'master'>('owner');
  const [brands,setBrands]=useState<string[]>([]),[brandSearch,setBrandSearch]=useState('');
  const [permissions,setPermissions]=useState<Permissions>(DEFAULT_PERMISSIONS);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const allBrands=[...new Set([...knownBrands,...brands])].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const visibleBrands=allBrands.filter(b=>b.toLowerCase().includes(brandSearch.trim().toLowerCase()));
  const allSelected=allBrands.length>0&&allBrands.every(b=>brands.includes(b));

  function reset(){setPassword('');setUserId(undefined);setUsername('');setBrands([]);setRole('owner');setPermissions(DEFAULT_PERMISSIONS);setBrandSearch('');}
  function toggleBrand(b:string){setBrands(c=>c.includes(b)?c.filter(x=>x!==b):[...c,b]);}
  function addTypedBrand(){const b=brandSearch.trim();if(b&&!brands.includes(b))setBrands(c=>[...c,b]);setBrandSearch('');}
  async function submit(e:React.FormEvent){
    e.preventDefault();setError('');setMessage('');
    if(role==='owner'&&!brands.length){setError('Selecione ao menos uma marca.');return;}
    setBusy(true);
    try{await save({data:{username,password:password||undefined,userId,role,brands:role==='owner'?brands:[],permissions:role==='owner'?permissions:undefined}});reset();await qc.invalidateQueries({queryKey:['brand-accounts']});setMessage('Acesso salvo.');}
    catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}
    finally{setBusy(false);}
  }

  return <main className="min-h-screen bg-background px-4 py-8 text-foreground"><div className="mx-auto max-w-4xl">
    <Button asChild variant="outline"><Link to="/dashboard"><ArrowLeft className="h-4 w-4"/>Voltar ao painel</Link></Button>
    <h1 className="mt-8 text-2xl font-extrabold">Gestão de acessos</h1>
    <form onSubmit={submit} className="my-6 space-y-6 border-y border-border py-6">
      <div>
        <h2 className="text-sm font-extrabold">{userId?'Editar acesso':'Novo acesso'}</h2>
        <p className="text-xs text-muted-foreground">Configure os dados, as marcas e as áreas visíveis para a pessoa.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-semibold">Usuário<Input className="mt-2" value={username} disabled={!!userId||busy} required minLength={2} maxLength={60} onChange={e=>setUsername(e.target.value)}/></label>
        <div className="text-sm font-semibold"><label id="account-role-label">Perfil</label><Select value={role} disabled={!!userId||busy} onValueChange={value=>{if(value==='master'||value==='owner')setRole(value);}}><SelectTrigger className="mt-2 w-full" aria-labelledby="account-role-label"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="owner">Marca</SelectItem><SelectItem value="master">Master</SelectItem></SelectContent></Select></div>
        <label className="text-sm font-semibold">{userId?'Nova senha (opcional)':'Senha'}<Input className="mt-2" type="password" value={password} required={!userId} disabled={busy} minLength={8} maxLength={128} autoComplete="new-password" onChange={e=>setPassword(e.target.value)}/></label>
      </div>

      {role==='master'?<p className="rounded-md border border-border bg-secondary p-3 text-sm text-muted-foreground">Master vê todas as marcas e todas as áreas do painel automaticamente.</p>:<>
        <section className="rounded-md border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-extrabold tracking-wide">MARCAS PERMITIDAS</h3><span className="text-xs text-muted-foreground">{brands.length} {brands.length===1?'marca selecionada':'marcas selecionadas'}</span></div>
          <label className="mt-3 flex items-center gap-2 text-sm"><Checkbox checked={allSelected} disabled={busy||!allBrands.length} onCheckedChange={v=>setBrands(v?allBrands:[])}/>Selecionar todas as marcas da planilha</label>
          <div className="mt-3 flex gap-2"><Input placeholder="Buscar ou adicionar marca…" value={brandSearch} disabled={busy} maxLength={120} onChange={e=>setBrandSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTypedBrand();}}}/><Button type="button" variant="outline" disabled={busy||!brandSearch.trim()} onClick={addTypedBrand}><Plus className="h-4 w-4"/>Adicionar</Button></div>
          {brands.length>0&&<div className="mt-3 flex flex-wrap gap-2">{brands.map(b=><span key={b} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-semibold">{b}<button type="button" aria-label={`Remover ${b}`} onClick={()=>toggleBrand(b)}><X className="h-3 w-3"/></button></span>)}</div>}
          <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">{visibleBrands.map(b=><label key={b} className="flex items-center gap-2 text-sm"><Checkbox checked={brands.includes(b)} disabled={busy} onCheckedChange={()=>toggleBrand(b)}/>{b}</label>)}{!visibleBrands.length&&<p className="text-xs text-muted-foreground">Nenhuma marca encontrada. Digite o nome e clique em Adicionar.</p>}</div>
        </section>

        <section className="rounded-md border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-extrabold tracking-wide">PERMISSÕES DE VISUALIZAÇÃO</h3><div className="flex gap-2"><Button type="button" size="sm" variant="ghost" onClick={()=>setPermissions(p=>Object.fromEntries(Object.keys(p).map(k=>[k,true])) as Permissions)}>Marcar tudo</Button><Button type="button" size="sm" variant="ghost" onClick={()=>setPermissions(p=>Object.fromEntries(Object.keys(p).map(k=>[k,false])) as Permissions)}>Desmarcar tudo</Button></div></div>
          <p className="text-xs text-muted-foreground">O que estiver desmarcado não aparece para a pessoa.</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">{PERMISSION_GROUPS.map(g=><div key={g.title}><p className="mb-2 text-[11px] font-bold uppercase text-muted-foreground">{g.title}</p><div className="space-y-2">{g.items.map(i=><label key={i.key} className="flex items-center gap-2 text-sm"><Checkbox checked={permissions[i.key]} disabled={busy} onCheckedChange={v=>setPermissions(p=>({...p,[i.key]:v===true}))}/>{i.label}</label>)}</div></div>)}
            <div><p className="mb-2 text-[11px] font-bold uppercase text-muted-foreground">Administração</p><p className="text-xs text-muted-foreground">Importar planilhas e gerenciar acessos são exclusivos do Master.</p></div>
          </div>
        </section>
      </>}

      <div className="flex gap-2"><Button disabled={busy}><Save className="h-4 w-4"/>{busy?'Salvando…':userId?'Salvar alterações':role==='master'?'Cadastrar Master':'Salvar acesso'}</Button>{userId&&<Button variant="outline" type="button" disabled={busy} onClick={reset}>Cancelar</Button>}</div>
    </form>
    {error&&<p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
    {message&&<p role="status" className="mb-4 text-sm text-status-success">{message}</p>}
    <div className="divide-y divide-border">{accounts.map(a=><div key={a.user_id} className="flex items-center justify-between gap-4 py-4"><div className="min-w-0 break-words"><p className="font-bold">{a.username}</p><p className="text-sm text-muted-foreground">{a.brands.length?a.brands.join(', '):'Master · Todas as marcas'}</p></div>{a.brands.length>0&&<Button variant="outline" size="icon" disabled={busy} aria-label={`Editar ${a.username}`} onClick={()=>{setUserId(a.user_id);setRole('owner');setUsername(a.username);setBrands(a.brands);setPermissions(a.permissions);setPassword('');setMessage('');setError('');window.scrollTo({top:0,behavior:'smooth'});}}><Pencil className="h-4 w-4"/></Button>}</div>)}</div>
  </div></main>;
}
