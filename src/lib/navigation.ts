// Navigation configuration for Flow-Space
// Add this to your existing navigation component

export const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: 'HomeIcon', // Use your existing Home icon
  },
  {
    name: 'Teams',
    href: '/teams', 
    icon: 'UsersIcon', // Add Users icon to your imports
  },
  {
    name: 'Projects',
    href: '/projects',
    icon: 'FolderOpenIcon', // Add FolderOpen icon for projects
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: 'CheckSquareIcon', // Use your existing task icon
  },
];

// Example of updating your existing navigation component:
/*
import { Users } from 'lucide-react';

// In your navigation component, add:
<Link 
  href="/teams"
  className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
>
  <Users className="h-5 w-5" />
  <span>Teams</span>
</Link>
*/