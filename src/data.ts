import { Customer, DashboardData, Vertical } from './types';

// DATA IMPORT - Known clients from provided snippets
const rawCsvData = `VERTICAL,CLIENTE,USERS,FATURAMENTO
FINANCEIRO I,BRADESCO,2777,1538154
FINANCEIRO I,ITAU UNIBANCO,728,1024930
FINANCEIRO I,SANTANDER BRASIL,337,424126
FINANCEIRO I,SAFRA C.V.C.,144,274791
FINANCEIRO I,BANCO ABC BRASIL,85,225980
FINANCEIRO I,BANCO CITIBANK,82,155203
FINANCEIRO I,BANCO VOTORANTIM S/A,64,104008
FINANCEIRO I,ÁGORA CORRETORA,303,99398
FINANCEIRO I,GOLDMAN SACHS DO BRASIL,27,71207
FINANCEIRO I,BANCO JP MORGAN,30,65858
FINANCEIRO I,BANCO BMG,19,59931
FINANCEIRO I,BANCO SOFISA SA,10,48058
FINANCEIRO I,TRAVELEX BANK,105,42509
FINANCEIRO I,BNP BRASIL,18,41801
FINANCEIRO I,ASA INVESTMENTS,27,39170
FINANCEIRO II,XP INVESTIMENTOS,375,512712
FINANCEIRO II,BTG PACTUAL,156,248682
FINANCEIRO II,BRASIL PLURAL,28,79501
FINANCEIRO II,BANK OF AMERICA,18,58566
FINANCEIRO II,UBS BRASIL,29,55940
FINANCEIRO II,TRUSTEE DTVM,6,44210
FINANCEIRO II,B3 BRASIL BOLSA BALCAO,23,41098
FINANCEIRO II,BANCO MIZUHO DO BRASIL,16,40673
FINANCEIRO II,BANCO INDUSTRIAL DO BRASIL,12,38668
FINANCEIRO II,FEBRABAN,9,37839
FINANCEIRO II,BW GESTAO DE INVESTIMENTOS,8,36166
FINANCEIRO II,BANCO OURINVEST S/A,29,34781
FINANCEIRO II,BANCO RENDIMENTO,15,30463
FINANCEIRO II,BR PARTNERS,17,28390
FINANCEIRO II,CAPITANIA INVEST,1,4184
GOVERNO,BANCO DO BRASIL,904,1478799
GOVERNO,CAIXA,199,441010
GOVERNO,MINISTÉRIO DA FAZENDA,78,185944
GOVERNO,BNDES,54,145650
GOVERNO,BANCO CENTRAL DO BRASIL,68,128727
GOVERNO,PETROBRAS,42,117420
GOVERNO,SECRETARIA DO TESOURO NACIONAL,57,95620
GOVERNO,CVM,34,79065
GOVERNO,BANRISUL,32,74643
GOVERNO,CAIXA PREVI,25,71490
GOVERNO,FUNDACAO PETROS,32,62385
GOVERNO,BRASILPREV,23,37540
GOVERNO,FUNPRESP,16,30356
GOVERNO,BANPARA,8,21939
GOVERNO,STJ,26,17012
AGRO/CORP,BANSICREDI,24,60095
AGRO/CORP,BANCO SICOOB,23,49363
AGRO/CORP,EVOLUA ETANOL,4,42180
AGRO/CORP,ELETROBRAS,16,40075
AGRO/CORP,CARGILL,148,32487
AGRO/CORP,B3 BRASIL BOLSA BALCAO,1,30000
AGRO/CORP,COAMO AGROINDUSTRIAL,18,29711
AGRO/CORP,CJ INTERNATIONAL,14,26501
AGRO/CORP,BRF S.A.,52,51043
AGRO/CORP,FERTIPAR,12,22956
AGRO/CORP,BANCO HONDA,7,22261
AGRO/CORP,BELAGRICOLA,5,18805
AGRO/CORP,C. VALE,11,17511
AGRO/CORP,TRES TENTOS,6,17220
AGRO/CORP,SOYBRASIL AGRO,11,17046
AGRO/CORP,COOPERATIVA AGRARIA,11,14239
AGRO/CORP,BE8 S.A.,6,12708
AGRO/CORP,SLC PARTICIPACOES,4,11417
AGRO/CORP,AEGEA SANEAMENTO,6,13429
AGRO/CORP,CATENO,4,12396`;

function parseData() {
  const baseCustomers: Customer[] = rawCsvData
    .trim()
    .split('\n')
    .slice(1)
    .map(line => {
      const parts = line.split(',');
      let vertical = parts[0].trim();
      
      if (vertical.toUpperCase() === 'FINANCEIRO I') vertical = 'Financeiro I';
      else if (vertical.toUpperCase() === 'FINANCEIRO II') vertical = 'Financeiro II';
      else if (vertical.toUpperCase() === 'GOVERNO') vertical = 'Governo';
      else if (vertical.toUpperCase() === 'AGRO/CORP') vertical = 'Agro/Corp';

      // Parse numbers handling Brazilian format (dots for thousands)
      const usersRaw = parts[2].trim().replace(/\./g, '');
      const users = parseInt(usersRaw) || 0;
      
      const revenueRaw = parts[3].trim().replace(/\./g, '').replace(',', '.');
      const revenue = parseFloat(revenueRaw) || 0;

      return {
        vertical: vertical as Vertical,
        name: parts[1].trim(),
        users,
        revenue,
        fatAe: 0, fatAeUs: 0, fatBols: 0, fatBolUs: 0,
      };
    });

  const targets = {
    'Financeiro I': { clients: 48, revenue: 4600000, users: 4930 },
    'Governo': { clients: 109, revenue: 3900000, users: 1990 },
    'Financeiro II': { clients: 523, revenue: 3850000, users: 2040 },
    'Agro/Corp': { clients: 742, revenue: 3095379, users: 2156 },
  };

  const finalCustomers: Customer[] = [];

  (Object.keys(targets) as Vertical[]).forEach(v => {
    const vTarget = targets[v];
    const realVCustomers = baseCustomers.filter(c => c.vertical === v);
    
    finalCustomers.push(...realVCustomers);
    
    const remainingCount = vTarget.clients - realVCustomers.length;
    if (remainingCount > 0) {
      const realRev = realVCustomers.reduce((acc, c) => acc + c.revenue, 0);
      const realUsers = realVCustomers.reduce((acc, c) => acc + c.users, 0);
      
      let assignedUsers = 0;
      let assignedRev = 0;
      const usersToDistribute = vTarget.users - realUsers;
      const revToDistribute = vTarget.revenue - realRev;
      
      for (let i = 1; i <= remainingCount; i++) {
        const isLast = i === remainingCount;
        let u = Math.floor(usersToDistribute / remainingCount);
        let r = revToDistribute / remainingCount;
        
        if (isLast) {
          u = usersToDistribute - assignedUsers;
          r = revToDistribute - assignedRev;
        }

        finalCustomers.push({
          vertical: v,
          name: `Outro Cliente #${v.substring(0, 3).toUpperCase()}-${i}`,
          users: Math.max(1, u),
          revenue: Math.max(0, r),
          fatAe: 0, fatAeUs: 0, fatBols: 0, fatBolUs: 0
        });
        
        assignedUsers += u;
        assignedRev += r;
      }
    }
  });

  return finalCustomers;
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
