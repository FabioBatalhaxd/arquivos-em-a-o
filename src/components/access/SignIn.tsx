import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { setupMaster } from '@/lib/access.functions';
import { loginEmail } from '@/lib/import/records';
export function SignIn() {
 const [setup,setSetup]=useState(false),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const setupFn=useServerFn(setupMaster),navigate=useNavigate(),qc=useQueryClient();
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{if(setup)await setupFn({data:{username,password,code}});const {error}=await supabase.auth.signInWithPassword({email:loginEmail(username),password});if(error)throw new Error('Usuário ou senha incorretos.');qc.clear();await navigate({to:'/dashboard'});}catch(e){setError(e instanceof Error?e.message:'Não foi possível entrar.');}finally{setBusy(false);}}
 return <main className="min-h-screen bg-background text-foreground"><header className="border-b border-border bg-card px-6 py-5"><h1 className="text-xl font-extrabold">BLACK FRIDAY 26 <span className="text-primary">PAINEL OPERACIONAL</span></h1></header><div className="mx-auto max-w-md px-6 py-20"><ShieldCheck className="mb-6 h-9 w-9 text-primary"/><h2 className="text-2xl font-bold">{setup?'Configurar primeiro Master':'Acesso ao painel'}</h2><form onSubmit={submit} className="mt-8 space-y-4"><label className="block text-sm font-semibold">Usuário<Input className="mt-2" value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required minLength={2} maxLength={60}/></label><label className="block text-sm font-semibold">Senha<Input className="mt-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={setup?'new-password':'current-password'} required minLength={8}/></label>{setup&&<label className="block text-sm font-semibold">Código de configuração Master<Input className="mt-2" type="password" value={code} onChange={e=>setCode(e.target.value)} required minLength={16}/></label>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={busy}>{busy?'Aguarde…':setup?'Criar Master e entrar':'Entrar'}</Button></form><Button variant="link" className="mt-4 px-0" onClick={()=>{setSetup(!setup);setError('');setCode('');}}>{setup?'Voltar ao login':'Configurar primeiro Master'}</Button></div></main>;
}
