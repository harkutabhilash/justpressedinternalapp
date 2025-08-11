import { useEffect, useState } from 'react';
import { callBackend } from 'utils/moduleStructureAPI';

export function useUserDetails() {
  const [user, setUser] = useState(null);       // { username, fullName, role }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const userid = sessionStorage.getItem('userid');
    if (!userid) {
      setError('No userId found in session');
      setLoading(false);
      return;
    }

    async function fetchUser() {
      try {
        setLoading(true);
        const res = await callBackend('getUserDetails', { userid });

        if (res && res.success) {
          setUser({
            username: res.username,
            fullName: res.fullName,
            role: res.role,
          });
        } else {
          setError(res.message || 'Failed to fetch user details');
        }
      } catch (err) {
        console.error('User details fetch error:', err);
        setError('Unexpected error while fetching user details');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  return { user, loading, error };
}
