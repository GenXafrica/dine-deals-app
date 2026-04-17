// src/components/AdminUserManagement.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { adminFunctionInvoke } from '@/lib/adminRpc';
import { toast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit, Plus, Eye, EyeOff } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export default function AdminUserManagement() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchAdminUsers = useCallback(async () => {
    // Quick session guard BEFORE touching loading state
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        console.log('[AdminUserManagement] No session - skipping admin API calls');
        setAdminUsers([]);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('[AdminUserManagement] getSession error', err);
      setAdminUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const maxAttempts = 3;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxAttempts) {
      if (attempt > 0) {
        const delay = 500 * attempt;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('user_id,email,created_at,updated_at')
          .order('created_at', { ascending: false });

        if (error) {
          lastError = error;
          attempt++;
          continue;
        }

        const rows = (data || []).map((r: any) => ({
          id: r.user_id ?? r.id ?? '',
          email: r.email ?? '',
          created_at: r.created_at ?? new Date().toISOString(),
          updated_at: r.updated_at ?? new Date().toISOString(),
        }));

        setAdminUsers(rows);
        setLoading(false);
        return;
      } catch (error: any) {
        lastError = error;
        attempt++;
        continue;
      }
    }

    setAdminUsers([]);
    setLoading(false);

    if (lastError) {
      toast({ title: 'Error', description: 'Failed to load admin users', variant: 'destructive' });
      console.error('[AdminUserManagement] fetchAdminUsers lastError', lastError);
    }
  }, []);

  const addAdminUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast({ title: 'Error', description: 'Email and password are required', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await adminFunctionInvoke('admin-manage-users', {
        action: 'add',
        email: newUserEmail,
        password: newUserPassword,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Admin user added successfully' });
      setNewUserEmail('');
      setNewUserPassword('');
      setAddDialogOpen(false);

      // small delay to allow DB/replication consistency before refetch
      setTimeout(() => fetchAdminUsers(), 600);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to add admin user', variant: 'destructive' });
      console.error('[AdminUserManagement] addAdminUser error', error);
    }
  };

  const updatePassword = async () => {
    if (!editingUser || !newPassword) {
      toast({ title: 'Error', description: 'Password is required', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await adminFunctionInvoke('admin-manage-users', {
        action: 'update',
        userId: editingUser.id,
        password: newPassword,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Password updated successfully' });
      setEditingUser(null);
      setNewPassword('');
      setEditDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update password', variant: 'destructive' });
      console.error('[AdminUserManagement] updatePassword error', error);
    }
  };

  const deleteAdminUser = async (userId: string, email: string) => {
    if (email === 'steve@genxafrica.com') {
      toast({ title: 'Error', description: 'Cannot delete the primary admin user', variant: 'destructive' });
      return;
    }

    if (!confirm(`Are you sure you want to delete admin user: ${email}?`)) return;

    try {
      const { error } = await adminFunctionInvoke('admin-manage-users', {
        action: 'delete',
        userId,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Admin user deleted successfully' });
      // small delay to allow DB update
      setTimeout(() => fetchAdminUsers(), 600);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete admin user', variant: 'destructive' });
      console.error('[AdminUserManagement] deleteAdminUser error', error);
    }
  };

  useEffect(() => {
    // call guarded fetch once on mount
    fetchAdminUsers();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        fetchAdminUsers();
      } else if (event === 'SIGNED_OUT') {
        setAdminUsers([]);
        setLoading(false);
      }
    });

    return () => {
      // clean up auth listener
      authListener?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAdminUsers]);

  // Re-fetch data when page becomes visible or gains focus (handles navigation back to admin)
  useEffect(() => {
    let visibilityTimer: number | null = null;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // debounce slightly to avoid double calls
        if (visibilityTimer) window.clearTimeout(visibilityTimer);
        visibilityTimer = window.setTimeout(() => {
          fetchAdminUsers();
          visibilityTimer = null;
        }, 200);
      }
    };
    const handleFocus = () => {
      if (visibilityTimer) window.clearTimeout(visibilityTimer);
      visibilityTimer = window.setTimeout(() => {
        fetchAdminUsers();
        visibilityTimer = null;
      }, 200);
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      if (visibilityTimer) window.clearTimeout(visibilityTimer);
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAdminUsers]);

  if (loading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Admin User Management</CardTitle>
          <CardDescription>Loading admin users...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        {/* Mobile stacks, desktop stays side-by-side */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <CardTitle>Admin User Management</CardTitle>
            <CardDescription>Manage admin users and their passwords</CardDescription>
          </div>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-[#2463EB] hover:bg-[#1E50B0] text-white w-full sm:w-auto"
                title="Add Admin User"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Admin User</span>
              </Button>
            </DialogTrigger>

            <DialogContent aria-label="Add new admin user dialog">
              <DialogHeader>
                <DialogTitle>Add New Admin User</DialogTitle>
                <DialogDescription>Create a new admin user with email and password</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="admin@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button onClick={addAdminUser} className="w-full">
                  Add Admin User
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {/* Mobile: cards. Desktop: table. */}
        <div className="space-y-3 sm:hidden">
          {adminUsers.map((user) => (
            <div key={user.id} className="border rounded-lg p-4">
              <div className="font-medium break-words">{user.email}</div>
              <div className="text-sm text-gray-600 mt-1">
                Created: {new Date(user.created_at).toLocaleDateString()}
              </div>

              <div className="flex gap-2 mt-3 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingUser(user);
                    setEditDialogOpen(true);
                  }}
                  title="Edit password"
                >
                  <Edit className="w-4 h-4" />
                </Button>

                {user.email !== 'steve@genxafrica.com' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteAdminUser(user.id, user.email)}
                    className="text-red-600 hover:text-red-700"
                    title="Delete admin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user);
                          setEditDialogOpen(true);
                        }}
                        title="Edit password"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {user.email !== 'steve@genxafrica.com' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteAdminUser(user.id, user.email)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete admin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent aria-label="Change admin user password dialog">
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>Update password for {editingUser?.email}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button onClick={updatePassword} className="w-full">
                Update Password
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
