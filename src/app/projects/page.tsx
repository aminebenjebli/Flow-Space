import { redirect } from 'next/navigation';

// Projects are now managed through Teams
// Redirect to teams page where users can access projects via team dashboards
export default function ProjectsPage() {
  redirect('/teams');
}