import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { MasterTools } from '@/components/access/MasterTools';
import { dashboardQuery } from '@/lib/dashboard-query';
export const Route=createFileRoute('/_authenticated/dashboard')({head:()=>({meta:[{title:'Operação por marca — Black Friday 26'},{name:'description',content:'Pedidos e entregas da planilha operacional.'},{property:'og:title',content:'Operação por marca — Black Friday 26'},{property:'og:description',content:'Indicadores de pedidos, ocorrências e lead time.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),loader:({context})=>context.queryClient.ensureQueryData(dashboardQuery),component:Page});
function Page(){
  const {data}=useSuspenseQuery(dashboardQuery);
  const brands=data.account.brands;
  const ownerBrand=!data.isMaster&&brands.length===1?brands[0]!:null;
  return <Dashboard records={data.records} isBrand={!data.isMaster} ownerBrand={ownerBrand} permissions={data.permissions} controls={<MasterTools isMaster={data.isMaster} username={data.account.username} latestImport={data.latestImport}/>}/>;
}
