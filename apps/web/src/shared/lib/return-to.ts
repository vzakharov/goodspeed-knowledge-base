const SIGN_IN_PATH = '/sign-in';

const PARAM = 'next';

/** Sign-in, remembering where to come back to. */
export function signInHref(returnTo: string): string {
  return `${SIGN_IN_PATH}?${new URLSearchParams({ [PARAM]: returnTo })}`;
}

/**
 * Where sign-in sends the reader: the remembered path, if it is one of this
 * app's own. Anything else — another origin, a protocol-relative `//host` —
 * goes home, so the parameter cannot be used as an open redirect.
 */
export function returnPath(search: URLSearchParams): string {
  const returnTo = search.get(PARAM);

  return returnTo?.startsWith('/') === true &&
    !returnTo.startsWith('//') &&
    !returnTo.startsWith('/\\')
    ? returnTo
    : '/';
}
