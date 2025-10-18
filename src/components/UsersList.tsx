import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type UserRow = {
  id: string | number;
  name: string;
};

export default function UsersList() {
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('users').select('id, name');
      if (!error && data) {
        setUsers(data);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div>
      <h2>ユーザー一覧</h2>
      <ul>
        {users.map((u) => (
          <li key={u.id}>{u.name}</li>
        ))}
      </ul>
    </div>
  );
}
