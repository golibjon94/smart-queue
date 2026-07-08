// Sidebar navigatsiya modeli. Yangi sahifa qo'shish uchun shu ro'yxatga
// element qo'shing va app.routes.ts da mos route yarating.
export interface NavItem {
  label: string;
  icon: string; // primeicons klassi, masalan 'pi pi-th-large'
  route: string;
  badge?: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Boshqaruv paneli', icon: 'pi pi-th-large', route: '/' },
  { label: 'Analitika', icon: 'pi pi-chart-bar', route: '/analytics', badge: 'tez orada' },
  { label: 'Sozlamalar', icon: 'pi pi-cog', route: '/settings', badge: 'tez orada' },
];
