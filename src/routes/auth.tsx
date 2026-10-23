import { createFileRoute } from '@tanstack/react-router';
import { SignIn } from '@/components/access/SignIn';
export const Route=createFileRoute('/auth')({head:()=>({meta:[{title:'Acesso — Black Friday 26'},{name:'description',content:'Acesso seguro ao painel por marca.'},{property:'og:title',content:'Acesso — Black Friday 26'},{property:'og:description',content:'Entre no painel operacional da sua marca.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:SignIn});
