import { Customer, DashboardData, Vertical } from './types';
import { rawSalesData } from './services/salesData';
import { fullRawCsvData } from './constants/rawCsv';

function parseData() {
  const baseCustomers: Customer[] = fullRawCsvData
    .trim()
    .split('\n')
    .slice(1)
    .map(line => {
      // Skip empty lines or the totals line
      if (!line.trim() || line.includes(',TOTAL,')) return null;

      // Handle potential comma in quoted names
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (parts.length < 4) return null;

      let vertical = parts[0].trim();
      
      // Standardize vertical names
      const vUpper = vertical.toUpperCase();
      if (vUpper === 'FINANCEIRO I') vertical = 'Financeiro I';
      else if (vUpper === 'FINANCEIRO II') vertical = 'Financeiro II';
      else if (vUpper === 'GOVERNO') vertical = 'Governo';
      else if (vUpper === 'AGRO/CORP' || vUpper === 'AGRO') vertical = 'Agro/Corp';

      const cleanNum = (s: string) => {
        if (!s) return 0;
        const c = s.trim().replace(/\./g, '').replace(',', '.').replace(/-/g, '0');
        return parseFloat(c) || 0;
      };

      const name = parts[1].trim().replace(/^"|"$/g, '');
      if (!name || name === 'TOTAL') return null;

      return {
        vertical: vertical as Vertical,
        name: name,
        users: parseInt(parts[2].trim().replace(/\./g, '')) || 0,
        revenue: cleanNum(parts[3]),
        fatAe: cleanNum(parts[4]),
        fatAeUs: cleanNum(parts[5]),
        fatBols: cleanNum(parts[6]),
        fatBolUs: cleanNum(parts[7]),
      };
    })
    .filter((c): c is Customer => c !== null);

  // Use only CSV data to ensure it reflects exactly the provided spreadsheet
  return baseCustomers;
}

export const customers = parseData();

export function getDashboardData(): DashboardData {
  const verticals: Vertical[] = ['Financeiro I', 'Financeiro II', 'Governo', 'Agro/Corp'];
  
  const totalRevenue = customers.reduce((acc, c) => acc + c.revenue, 0);
  const totalClients = customers.length;
  const totalUsers = customers.reduce((acc, c) => acc + c.users, 0);

  const verticalStats = verticals.map(v => {
    const vCustomers = customers.filter(c => c.vertical === v);
    const vRev = vCustomers.reduce((acc, c) => acc + c.revenue, 0);
    const vUsers = vCustomers.reduce((acc, c) => acc + c.users, 0);
    const vClients = vCustomers.length;

    const sizeDistribution = {
      grande: vCustomers.filter(c => c.users >= 51).length,
      medio: vCustomers.filter(c => c.users >= 11 && c.users <= 50).length,
      pequeno: vCustomers.filter(c => c.users >= 3 && c.users <= 10).length,
      micro: vCustomers.filter(c => c.users >= 1 && c.users <= 2).length,
    };

    return {
      vertical: v,
      totalClients: vClients,
      totalUsers: vUsers,
      totalRevenue: vRev,
      averageTicket: vClients > 0 ? vRev / vClients : 0,
      revenueParticipation: totalRevenue > 0 ? (vRev / totalRevenue) * 100 : 0,
      usersPerClient: vClients > 0 ? vUsers / vClients : 0,
      sizeDistribution,
      topClients: [...vCustomers].sort((a, b) => b.revenue - a.revenue).slice(0, 50),
    };
  });

  return {
    totalClients,
    totalUsers,
    totalRevenue,
    averageTicket: totalClients > 0 ? totalRevenue / totalClients : 0,
    verticals: verticalStats,
  };
}
