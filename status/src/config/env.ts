/*
 * Modified from UptimeWorker (Apache-2.0).
 * Changes: adapted status-page labels and history settings for 天命乃杜.
 */
import {Settings} from '../data/monitors'
export function getSettings():Settings{return{title:import.meta.env.VITE_STATUS_TITLE||'運勢・天命乃杜 — Status',url:'https://tenmei-mori-status.pages.dev/',logo:'',daysInHistogram:parseInt(import.meta.env.VITE_HISTORY_DAYS)||30,collectResponseTimes:true,allmonitorsOperational:'すべてのシステムが正常に稼働しています',notAllmonitorsOperational:'一部のサービスに問題があります',monitorLabelOperational:'正常',monitorLabelNotOperational:'停止',monitorLabelNoData:'データなし',dayInHistogramNoData:'データなし',dayInHistogramOperational:'正常',dayInHistogramNotOperational:' インシデント'}}
export function getRefreshInterval():number{const interval=import.meta.env.VITE_REFRESH_INTERVAL;return interval?parseInt(interval)*1000:60000}
