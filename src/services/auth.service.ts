import { queryOne, queryAll, execute } from '@/lib/sql';
import { hashPassword } from '@/db/seed';
import type { User } from '@/db/types';

export function authenticate(username: string, password: string): User | null {
  const user = queryOne<User>(
    'SELECT id, username, email, full_name, role, is_active, last_login_at FROM users WHERE username = ? AND password_hash = ? AND is_active = 1',
    [username, hashPassword(password)]
  );
  if (user) {
    execute('UPDATE users SET last_login_at = ? WHERE id = ?', [new Date().toISOString(), user.id]);
  }
  return user;
}

export function getUserById(id: string): User | null {
  return queryOne<User>(
    'SELECT id, username, email, full_name, role, is_active, last_login_at FROM users WHERE id = ?',
    [id]
  );
}

export function getAllUsers(): User[] {
  return queryAll<User>(
    'SELECT id, username, email, full_name, role, is_active, last_login_at FROM users ORDER BY full_name'
  );
}

export function canAccess(role: string, module: string, action = 'read'): boolean {
  const permissions: Record<string, Record<string, string[]>> = {
    admin: { '*': ['*'] },
    manager: {
      dashboard: ['read'], pos: ['*'], products: ['*'], categories: ['*'], brands: ['*'],
      inventory: ['*'], purchases: ['*'], customers: ['*'], suppliers: ['*'],
      expenses: ['*'], finance: ['read'], reports: ['read'], employees: ['read'],
      notifications: ['read'], settings: ['read'],
    },
    cashier: {
      dashboard: ['read'], pos: ['*'], products: ['read'], customers: ['read'],
      notifications: ['read'],
    },
  };

  const rolePerms = permissions[role];
  if (!rolePerms) return false;
  if (rolePerms['*']) return true;

  const modPerms = rolePerms[module];
  if (!modPerms) return false;
  return modPerms.includes('*') || modPerms.includes(action);
}
