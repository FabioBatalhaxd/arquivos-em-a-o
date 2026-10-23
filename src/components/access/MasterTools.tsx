import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Upload, Users, LogOut, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { beginImport, appendImport, finishImport, cancelImport } from '@/lib/access.functions';
import { createImportAggregator, type ImportedRecord } from '@/lib/import/records';
export function MasterTools({isMaster,username,latestImport}:{isMaster:boolean;username:string;latestImport:{filename:string;created_at:string}|null}){
 const [preview,setPreview]=useState<{filename:string;records:ImportedRecord[];sourceRows:number}|null>(null),[progress,setProgress]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const beginFn=useServerFn(beginImport),appendFn=useServerFn(appendImport),finishFn=useServerFn(finishImport),cancelFn=useServerFn(cancelImport),qc=useQueryClient(),navigate=useNavigate();
 async function readFile(file:File){setError('');setMessage('');setPreview(null);setBusy(true);setProgress('Lendo planilha…');try{
  if(file.size>300*1024*1024)throw new Error('Arquivo acima de 300 MB.');
  let agg:ReturnType<typeof createImportAggregator>|null=null;
  const tick=()=>{if(agg&&agg.sourceRows%50000===0)setProgress(`Lendo ${agg.sourceRows.toLocaleString('pt-BR')} linhas…`);};
  if(/\.csv$/i.test(file.name)){
   const Papa=(await import('papaparse')).default;
   await new Promise<void>((resolve,reject)=>{Papa.parse<Record<string,unknown>>(file,{header:true,skipEmptyLines:true,step:(res,parser)=>{try{if(!agg)agg=createImportAggregator(res.meta.fields??[]);agg.add(res.data);tick();}catch(e){parser.abort();reject(e);}},complete:()=>resolve(),error:(e)=>reject(e)});});
  }else{
   const XLSX=await import('xlsx');const book=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,dense:true});
   if(book.SheetNames.length!==1)throw new Error('Envie um arquivo com uma única aba.');
   const sheet=book.Sheets[book.SheetNames[0]??''];if(!sheet)throw new Error('Planilha vazia.');
   const rows=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:'',blankrows:false});
   const headers=(rows[0]??[]).map(h=>String(h));agg=createImportAggregator(headers);
   for(let i=1;i<rows.length;i++){const arr=rows[i]??[];const obj:Record<string,unknown>={};headers.forEach((h,j)=>{obj[h]=arr[j];});agg.add(obj);rows[i]=[];tick();if(i%20000===0)await new Promise(r=>setTimeout(r,0));}
  }
  if(!agg)throw new Error('Planilha vazia.');
  const finalAgg=agg as ReturnType<typeof createImportAggregator>;
  setPreview({filename:file.name,records:finalAgg.result(),sourceRows:finalAgg.sourceRows});
 }catch(e){setError(e instanceof Error?e.message:'Arquivo inválido.');}finally{setBusy(false);setProgress('');}}
 async function confirm(){if(!preview)return;setBusy(true);setError('');let id='';try{
  id=(await beginFn({data:{filename:preview.filename,sourceRows:preview.sourceRows}})).id;
  const size=4000;for(let i=0;i<preview.records.length;i+=size){setProgress(`Enviando ${Math.min(100,Math.round(i/preview.records.length*100))}%…`);await appendFn({data:{importId:id,records:preview.records.slice(i,i+size)}});}
  setProgress('Finalizando…');await finishFn({data:{importId:id}});
  setPreview(null);await qc.invalidateQueries({queryKey:['dashboard-data']});setMessage(`${preview.sourceRows.toLocaleString('pt-BR')} pedidos importados.`);
 }catch(e){if(id)await cancelFn({data:{importId:id}}).catch(()=>undefined);setError(e instanceof Error?e.message:'Importação não concluída.');}finally{setBusy(false);setProgress('');}}
 async function logout(){await qc.cancelQueries();qc.clear();await supabase.auth.signOut();await navigate({to:'/auth',replace:true});}
 return <section className="mb-4 border-b border-border pb-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold">{username} · {isMaster?'Master':'Dono da marca'}</p><p className="mt-1 text-xs text-muted-foreground">{latestImport?`${latestImport.filename} · ${new Date(latestImport.created_at).toLocaleString('pt-BR')}`:'Nenhuma planilha importada'}</p></div><div className="flex flex-wrap gap-2">{isMaster&&<><Button variant="outline" asChild><Link to="/gestao"><Users className="h-4 w-4"/>Gestão de acessos</Link></Button><label className="relative"><Button asChild disabled={busy}><span><Upload className="h-4 w-4"/>{busy?'Aguarde…':'Importar planilha'}</span></Button><input aria-label="Importar planilha CSV ou Excel (inclusive binária)" className="absolute inset-0 w-full cursor-pointer opacity-0" type="file" accept=".csv,.xlsx,.xls,.xlsb" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void readFile(file);e.target.value='';}}/></label></>}<Button variant="outline" onClick={logout}><LogOut className="h-4 w-4"/>Sair</Button></div></div>{preview&&<div className="mt-4 border-l-2 border-primary bg-secondary p-4"><p className="text-sm font-bold">{preview.filename} · {preview.sourceRows.toLocaleString('pt-BR')} pedidos · {new Set(preview.records.map(r=>r.brand)).size} marcas</p><p className="my-2 text-sm">Confirmar substituir todos os dados anteriores para todas as marcas?</p><div className="flex gap-2"><Button onClick={confirm} disabled={busy}><Check className="h-4 w-4"/>Confirmar substituição</Button><Button variant="outline" disabled={busy} onClick={()=>setPreview(null)}><X className="h-4 w-4"/>Cancelar</Button></div></div>}{progress&&<p role="status" className="mt-3 text-sm text-muted-foreground">{progress}</p>}{error&&<p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}{message&&<p role="status" className="mt-3 text-sm text-status-success">{message}</p>}</section>;
}
