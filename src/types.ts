export type Vertical = 'Financeiro I' | 'Financeiro II' | 'Governo' | 'Agro/Corp' | 'Clientes PF';

export interface Customer {
  vertical: Vertical;
  name: string;
  users: number;
  revenue: number;
  fatAe: number;
  fatAeUs: number;
  fatBols: number;
  fatBolUs: number;
}

export interface VerticalStats {
  vertical: Vertical;
  totalClients: number;
  totalUsers: number;
  totalRevenue: number;
  averageTicket: number;
  revenueParticipation: number;
  usersPerClient: number;
  sizeDistribution: {
    grande: number; // 51+
    medio: number;  // 11-50
    pequeno: number; // 3-10
    micro: number;   // 1-2
  };
  topClients: Customer[];
}

export interface OperationalSettings {
  suporteTreinamento: number;
  relacionamento: number;
  gestaoContratual: number;
  capacidadeVisitasPresenciaisMes: number;
  capacidadeContatosRemotosMes: number;
  execCapacity: number;
}

export interface VerticalOperationalParams {
  visitasAno: number;
  contatosRemotosAno: number;
  percentDesuso: number;
  percentRemotos: number;
  percentNaoAcessiveis: number;
}

export interface DashboardData {
  totalClients: number;
  totalUsers: number;
  totalRevenue: number;
  averageTicket: number;
  verticals: VerticalStats[];
}
