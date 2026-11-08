import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { apiErrorMessage } from '../utils/apiError';
import {
  AdminResponseError,
  validateAdminResponse,
} from '../utils/adminResponse';

export default function useAdminResource(
  endpoint,
  params,
  revision = 0,
  kind = 'list',
) {
  const [urlParams, setUrlParams] = useSearchParams();
  const urlPage = urlParams.get('page');
  const requestedPage = Number(params.page);
  const query = new URLSearchParams({
    ...params,
    ...(params.search !== undefined && {
      search: params.search.normalize('NFC').trim(),
    }),
  }).toString();
  const key = `${endpoint}?${query}#${revision}`;
  const [state, setState] = useState({
    key: '',
    loading: true,
    data: null,
    error: '',
  });
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setState((previous) => ({ ...previous, key, loading: true, error: '' }));
      axios
        .get(`${endpoint}?${query}`, { signal: controller.signal })
        .then(({ data }) => {
          if (!controller.signal.aborted) {
            const validated = validateAdminResponse(data, kind);
            setState({
              key,
              loading: false,
              data: validated,
              error: '',
            });
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setState({
              key,
              loading: false,
              data: null,
              error:
                error instanceof AdminResponseError
                  ? error.message
                  : apiErrorMessage(error, 'Không thể tải dữ liệu'),
            });
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [endpoint, query, revision, key, kind]);
  const actualPage = state.data?.page;
  useEffect(() => {
    if (
      kind !== 'list' ||
      state.loading ||
      state.error ||
      state.key !== key ||
      !Number.isSafeInteger(requestedPage) ||
      !Number.isSafeInteger(actualPage) ||
      requestedPage === actualPage
    )
      return;
    setUrlParams(
      (previous) => {
        // Do not overwrite newer navigation while reconciling a completed request.
        if (previous.get('page') !== urlPage) return previous;
        const next = new URLSearchParams(previous);
        if (actualPage === 1) next.delete('page');
        else next.set('page', String(actualPage));
        return next;
      },
      { replace: true },
    );
  }, [
    kind,
    state.loading,
    state.error,
    state.key,
    key,
    requestedPage,
    actualPage,
    urlPage,
    setUrlParams,
  ]);
  return {
    ...state,
    loading: state.loading || state.key !== key,
    error: state.key === key ? state.error : '',
  };
}
