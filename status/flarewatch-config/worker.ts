import type { WorkerConfig } from '@flarewatch/shared';

export const workerConfig: WorkerConfig = {
  monitors: [
    {
      id: 'tenmei_site',
      name: '天命乃杜 — 公開サイト',
      method: 'GET',
      target: 'https://tenmei-mori.pages.dev/',
      expectedCodes: [200],
      responseKeyword: '天命乃杜',
      timeout: 10000,
      link: 'https://tenmei-mori.pages.dev/',
    },
    {
      id: 'tenmei_status',
      name: 'Tenmei Status',
      method: 'GET',
      target: 'https://tenmei-mori-status.pages.dev/',
      expectedCodes: [200],
      timeout: 10000,
      link: 'https://tenmei-mori-status.pages.dev/',
    },
  ],
};
