import { api } from '../../api/index.js';
import { useAsync } from '../../lib/useAsync.js';

export const useOverview = () => useAsync(() => api.overview());
