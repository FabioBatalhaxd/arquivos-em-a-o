import { createFileRoute, Link } from '@tanstack/react-router';
import { AccountManagement, accountsQuery } from '@/components/access/AccountManagement';
import { Button } from '@/components/ui/button';

function GestaoError() {
  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><div className="max-w-md text-center"><h1 className="text-xl font-bold text-foreground">Acesso restrito</h1><p className="mt-2 text-sm text-muted-foreground">A gestão de acessos é exclusiva do perfil Master.</p><Button asChild className="mt-4"><Link to="/dashboard">Voltar ao painel</Link></Button></div></main>;
}

export const Route=createFileRoute('/_authenticated/gestao')({head:()=>({meta:[{title:'Gestão de acessos — Black Friday 26'},{name:'description',content:'Cadastro de Masters e gestão dos donos de marcas no painel Black Friday 26.'},{property:'og:title',content:'Gestão de acessos — Black Friday 26'},{property:'og:description',content:'Gestão de acessos Master e de donos vinculados às suas marcas.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),loader:({context})=>context.queryClient.ensureQueryData(accountsQuery),errorComponent:GestaoError,component:AccountManagement});
