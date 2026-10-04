/*
 * Modified from UptimeWorker (Apache-2.0).
 * Changes: adapted branding and service metadata for 天命乃杜.
 */
export interface BrandingConfig{companyName:string;projectName:string;projectDescription:string;websiteUrl:string;websiteDomain:string;githubUrl?:string;links:{privacy?:string};userAgent?:string}
export const branding:BrandingConfig={companyName:'天命乃杜',projectName:'運勢・天命乃杜 — Status',projectDescription:'運勢・天命乃杜のサービス状況',websiteUrl:'https://tenmei-mori.pages.dev/',websiteDomain:'tenmei-mori.pages.dev',githubUrl:'https://github.com/nden14800/tenmei-mori',links:{privacy:'https://tenmei-mori.pages.dev/'},userAgent:'tenmei-mori-uptimeworker/1.0'}
