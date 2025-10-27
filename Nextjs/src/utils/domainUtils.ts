export const extractMainDomain = (url?: string): string => {
  try {
    const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    
    if (!targetUrl) {
      return 'https://app.weam.ai';
    }

    const urlObj = new URL(targetUrl);
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.port ? ':' + urlObj.port : ''}`;
  } catch (error) {
    return 'https://app.weam.ai';
  }
};

export const navigateToMainDomain = (): void => {
  const mainDomain = extractMainDomain();
  window.location.href = mainDomain;
};
