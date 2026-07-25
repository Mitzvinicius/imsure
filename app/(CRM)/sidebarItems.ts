import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';

type SidebarItem = {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  permission: string[];
};

export const sidebarItems: SidebarItem[] = [
    {
        id: '1',
        label: 'Dashboard',
        path: '/dashboard',
        icon: DashboardIcon,
        permission: []
    },
    {
        id: '2',
        label: 'Leads',
        path: '/leads',
        icon:   PeopleAltIcon,
        permission: []
    }
];