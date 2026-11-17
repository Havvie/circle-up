import { useEffect, useState } from 'react';

// Tiny hash router: "#/messages/conv-1" -> { path: ['messages', 'conv-1'] }.
const parse = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

export function useRoute() {
  const [path, setPath] = useState(parse);
  useEffect(() => {
    const on = () => {
      setPath(parse());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return path;
}

export const go = (to) => {
  window.location.hash = `#/${to}`;
};
