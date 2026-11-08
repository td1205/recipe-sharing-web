import { useEffect, useState } from 'react';
import axios from 'axios';
import { apiErrorMessage } from '../utils/apiError';

export default function useAdminResource(endpoint, params, revision = 0) {
  const query = new URLSearchParams(params).toString();
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState((previous) => ({ ...previous, loading: true, error: '' }));
      axios
        .get(`${endpoint}?${query}`, { signal: controller.signal })
        .then(({ data }) => {
          if (!controller.signal.aborted)
            setState({ loading: false, data, error: '' });
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setState({
              loading: false,
              data: null,
              error: apiErrorMessage(error, 'Không thể tải dữ liệu'),
            });
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [endpoint, query, revision]);
  return state;
}
