/**
 * useChildren — read and mutate the signed-in user's children.
 *
 * Returns:
 *   children       — array of Child (with computed ageYears), null until first load
 *   loading        — true during the initial fetch
 *   error          — last error message, or null
 *   addChild       — INSERT a new child row
 *   removeChild    — DELETE a child by id
 *   refresh        — re-read the list (after mutation, or on demand)
 *
 * RLS makes this safe — the policy on public.children only lets the owning
 * user read or write their own rows, so we don't need to filter by user_id
 * client-side. The hook still scopes everything to the current session.
 *
 * Implementation note: this is plain useState + useEffect for now. When we
 * add TanStack Query (planned in QueryProvider) we'll port these calls into
 * proper queries / mutations with cache invalidation.
 */

import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { childFromRow, type Child } from '@/types/domain';

export type AddChildInput = {
  nickname: string;
  /** ISO date 'YYYY-MM-DD'. */
  dob: string;
  notes?: string;
};

export type UpdateChildInput = Partial<AddChildInput>;

export function useChildren() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setChildren([]);
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('children')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setChildren((data ?? []).map(childFromRow));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addChild = useCallback(
    async (input: AddChildInput): Promise<Child | null> => {
      if (!user) {
        setError('You must be signed in to add a child.');
        return null;
      }
      setError(null);
      const { data, error: insertError } = await supabase
        .from('children')
        .insert({
          user_id: user.id,
          nickname: input.nickname,
          dob: input.dob,
          notes: input.notes ?? null,
        })
        .select('*')
        .single();

      if (insertError || !data) {
        setError(insertError?.message ?? 'Failed to add child.');
        return null;
      }
      const child = childFromRow(data);
      setChildren((prev) => (prev ? [...prev, child] : [child]));
      return child;
    },
    [user],
  );

  const removeChild = useCallback(async (id: string): Promise<boolean> => {
    setError(null);
    const { error: deleteError } = await supabase.from('children').delete().eq('id', id);
    if (deleteError) {
      setError(deleteError.message);
      return false;
    }
    setChildren((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
    return true;
  }, []);

  const updateChild = useCallback(
    async (id: string, patch: UpdateChildInput): Promise<Child | null> => {
      setError(null);
      // Build the snake_case patch for Supabase. Only forward keys the caller
      // actually set so undefined values don't clobber existing columns. The
      // explicit type here matches the columns Supabase will accept on the
      // children update (anything else would fail the strict typed insert).
      const dbPatch: { nickname?: string; dob?: string; notes?: string | null } = {};
      if (patch.nickname !== undefined) dbPatch.nickname = patch.nickname;
      if (patch.dob !== undefined) dbPatch.dob = patch.dob;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes;

      const { data, error: updateError } = await supabase
        .from('children')
        .update(dbPatch)
        .eq('id', id)
        .select('*')
        .single();

      if (updateError || !data) {
        setError(updateError?.message ?? 'Failed to update child.');
        return null;
      }
      const next = childFromRow(data);
      setChildren((prev) => (prev ? prev.map((c) => (c.id === id ? next : c)) : prev));
      return next;
    },
    [],
  );

  return {
    children,
    loading,
    error,
    addChild,
    updateChild,
    removeChild,
    refresh,
  };
}
