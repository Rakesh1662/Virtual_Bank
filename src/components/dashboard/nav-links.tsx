
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ArrowRightLeft, Settings, Shield, LifeBuoy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ArrowRightLeft },
  { href: '/dashboard/support', label: 'Support', icon: LifeBuoy },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

const adminLink = { href: '/dashboard/admin', label: 'Admin', icon: Shield };

export default function NavLinks({ isMobile = false }: { isMobile?: boolean }) {
  const pathname = usePathname();
  const { userData } = useAuth();

  const renderLink = (link: typeof links[0]) => (
    <Link
      key={link.href}
      href={link.href}
      className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
          pathname === link.href && "bg-muted text-primary"
      )}
    >
      <link.icon className="h-4 w-4" />
      {link.label}
    </Link>
  );

  if (isMobile) {
    return (
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {links.map(renderLink)}
            {userData?.role === 'admin' && renderLink(adminLink)}
        </nav>
    );
  }

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {links.map(renderLink)}
      {userData?.role === 'admin' && renderLink(adminLink)}
    </nav>
  );
}
