export interface WebsiteOriginOptions {
  required?: boolean;
}

export declare function validateWebsiteOrigin(
  value: unknown,
  options?: WebsiteOriginOptions,
): string | undefined;

export declare function getCanonicalUrl(
  value: unknown,
  pathname: string,
  options?: WebsiteOriginOptions,
): string | undefined;
