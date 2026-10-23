import { queryOptions } from '@tanstack/react-query';
import { getDashboardData } from '@/lib/access.functions';
import { unpackRecords } from '@/lib/import/records';
export const dashboardQuery = queryOptions({queryKey:['dashboard-data'],queryFn:async()=>{const {packedRecords,...rest}=await getDashboardData();return {...rest,records:unpackRecords(packedRecords)};},refetchInterval:120000,staleTime:10000});
