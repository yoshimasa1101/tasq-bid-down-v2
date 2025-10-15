'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type UserRow = {
  id: string | number;
  name?: string | null;
  username?: string | null;
  created_at?: string | null;
};

export default function UsersList() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setUsers(data || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p>読み込み中...</p>;
  if (error) return <p style={{ color: 'red' }}>エラー: {error}</p>;

  if (!users.length) return <p>ユーザーが見つかりません。</p>;

  return (
    <div style={{ marginTop: 16 }}>
      <h2>ユーザー一覧</h2>
      <ul style={{ lineHeight: 1.8 }}>
        {users.map((u) => (
          <li key={String(u.id)}>
            <strong>ID:</strong> {u.id}{' '}
            {u.name && (
              <>
                | <strong>Name:</strong> {u.name}
              </>
            )}
            {u.username && (
              <>
                | <strong>Username:</strong> {u.username}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
