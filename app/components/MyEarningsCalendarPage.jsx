'use client';

import { useMemo, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { CloseIcon } from './Icons';
import FitText from './FitText';
import { cn } from '@/lib/utils';

dayjs.locale('zh-cn');

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];
const SWIPE_THRESHOLD = 72;

function buildMonthCells(viewMonth) {
  const start = viewMonth.startOf('month');
  const daysInMonth = viewMonth.daysInMonth();
  const startWeek = start.day();
  const cells = [];
  for (let i = 0; i < startWeek; i++) {
    cells.push({ date: start.subtract(startWeek - i, 'day'), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: viewMonth.date(d), inMonth: true });
  }
  const remainder = cells.length % 7;
  const tail = remainder === 0 ? 0 : 7 - remainder;
  const last = viewMonth.date(daysInMonth);
  for (let i = 1; i <= tail; i++) {
    cells.push({ date: last.add(i, 'day'), inMonth: false });
  }
  return cells;
}

function formatEarnings(v, masked) {
  if (masked) return '***';
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  const sign = v > 0 ? '+' : v < 0 ? '-' : '';
  return `${sign}${Math.abs(v).toFixed(2)}`;
}

function earningsClass(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '';
  if (v > 0) return 'up';
  if (v < 0) return 'down';
  return '';
}

export default function MyEarningsCalendarPage({ open, onOpenChange, series = [], masked, onGoHome, isMobile }) {
  const reduceMotion = useReducedMotion();

  const hasData = Array.isArray(series) && series.length > 0;

  const [viewTab, setViewTab] = useState('day');
  const [cursorMonth, setCursorMonth] = useState(() => dayjs().startOf('month'));
  const [cursorYear, setCursorYear] = useState(() => dayjs().year());

  const earningsByDate = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(series)) return map;
    for (const row of series) {
      if (row?.date && typeof row.earnings === 'number' && Number.isFinite(row.earnings)) {
        map.set(row.date, row.earnings);
      }
    }
    return map;
  }, [series]);

  const monthTotalsForYear = useMemo(() => {
    const arr = Array.from({ length: 12 }, () => 0);
    if (!Array.isArray(series)) return arr;
    for (const row of series) {
      if (!row?.date || typeof row.earnings !== 'number' || !Number.isFinite(row.earnings)) continue;
      const y = parseInt(row.date.slice(0, 4), 10);
      const m = parseInt(row.date.slice(5, 7), 10) - 1;
      if (y === cursorYear && m >= 0 && m < 12) arr[m] += row.earnings;
    }
    return arr;
  }, [series, cursorYear]);

  const yearTotals = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(series)) return map;
    for (const row of series) {
      if (!row?.date || typeof row.earnings !== 'number' || !Number.isFinite(row.earnings)) continue;
      const y = parseInt(row.date.slice(0, 4), 10);
      if (!Number.isFinite(y)) continue;
      map.set(y, (map.get(y) ?? 0) + row.earnings);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [series]);

  /** 按日视图：当前展示月的收益合计 */
  const dayViewMonthTotal = useMemo(() => {
    const prefix = cursorMonth.format('YYYY-MM');
    let sum = 0;
    for (const [d, v] of earningsByDate.entries()) {
      if (d.startsWith(prefix) && typeof v === 'number' && Number.isFinite(v)) {
        sum += v;
      }
    }
    return sum;
  }, [earningsByDate, cursorMonth]);

  const goPrev = useCallback(() => {
    if (viewTab === 'day') setCursorMonth((m) => m.subtract(1, 'month'));
    else if (viewTab === 'month') setCursorYear((y) => y - 1);
  }, [viewTab]);

  const goNext = useCallback(() => {
    const now = dayjs();
    if (viewTab === 'day') {
      setCursorMonth((m) => {
        const next = m.add(1, 'month');
        if (next.isAfter(now, 'month')) return m;
        return next;
      });
    } else if (viewTab === 'month') {
      setCursorYear((y) => {
        if (y >= now.year()) return y;
        return y + 1;
      });
    }
  }, [viewTab]);

  const onDragEnd = useCallback(
    (_, info) => {
      if (info.offset.x > SWIPE_THRESHOLD) goPrev();
      else if (info.offset.x < -SWIPE_THRESHOLD) goNext();
    },
    [goPrev, goNext]
  );

  const enableSwipe = viewTab === 'day' || viewTab === 'month';
  const monthCells = useMemo(() => buildMonthCells(cursorMonth), [cursorMonth]);

  const yearSum = monthTotalsForYear.reduce((a, b) => a + b, 0);

  const headerTitle =
    viewTab === 'day'
      ? cursorMonth.format('YYYY年M月')
      : viewTab === 'month'
        ? `${cursorYear}年`
        : '历年收益';

  const now = dayjs();
  const nextPeriodDisabled =
    viewTab === 'day'
      ? cursorMonth.add(1, 'month').isAfter(now, 'month')
      : viewTab === 'month'
        ? cursorYear >= now.year()
        : false;

  const resolvedIsMobile =
    typeof isMobile === 'boolean'
      ? isMobile
      : (typeof window !== 'undefined' ? window.matchMedia?.('(max-width: 640px)')?.matches : false);

  const content = (
    <div className="my-earnings-drawer-inner flex min-h-0 flex-1 flex-col overflow-hidden px-5">
          {hasData && (
            <div className="my-earnings-context-header shrink-0 pb-3">
              <div
                className={cn(
                  'my-earnings-title-row my-earnings-period-row',
                  viewTab === 'year' && 'my-earnings-period-row-single'
                )}
              >
                {viewTab === 'year' ? (
                  <span className="my-earnings-context-title">{headerTitle}</span>
                ) : (
                  <>
                    <button
                      type="button"
                      className="my-earnings-period-nav-btn"
                      aria-label={viewTab === 'day' ? '上一月' : '上一年'}
                      onClick={(e) => {
                        e.stopPropagation();
                        goPrev();
                      }}
                    >
                      <ChevronLeft size={22} strokeWidth={2} aria-hidden />
                    </button>
                    <span className="my-earnings-context-title my-earnings-period-label" aria-live="polite">
                      {headerTitle}
                    </span>
                    <button
                      type="button"
                      className="my-earnings-period-nav-btn"
                      aria-label={viewTab === 'day' ? '下一月' : '下一年'}
                      disabled={nextPeriodDisabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        goNext();
                      }}
                    >
                      <ChevronRight size={22} strokeWidth={2} aria-hidden />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="my-earnings-drawer-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {!hasData ? (
          <div className="my-earnings-empty">
            <p className="my-earnings-empty-title">暂无每日收益记录</p>
            <p className="my-earnings-empty-desc">
              请先在首页添加基金并维护持仓，系统会在刷新估值后自动累计每日收益。
            </p>
            {onGoHome && (
              <button
                type="button"
                className="my-earnings-primary-btn"
                onClick={() => {
                  onGoHome();
                }}
              >
                返回首页
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="trend-range-bar mb-2 shrink-0">
              {[
                { id: 'day', label: '日' },
                { id: 'month', label: '月' },
                { id: 'year', label: '年' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`trend-range-btn ${viewTab === t.id ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewTab(t.id);
                    if (t.id === 'month') setCursorYear(cursorMonth.year());
                    if (t.id === 'day') setCursorMonth((m) => m.year(cursorYear));
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="my-earnings-detail my-earnings-detail-summary-top shrink-0">
              {viewTab === 'day' && (
                <>
                  <div className="my-earnings-detail-label">{cursorMonth.format('YYYY年M月')} 合计</div>
                  <FitText
                    as="div"
                    maxFontSize={24}
                    minFontSize={14}
                    className={cn('my-earnings-detail-value', earningsClass(dayViewMonthTotal))}
                  >
                    {formatEarnings(dayViewMonthTotal, masked)}
                  </FitText>
                </>
              )}
              {viewTab === 'month' && (
                <>
                  <div className="my-earnings-detail-label">{cursorYear}年 合计</div>
                  <FitText
                    as="div"
                    maxFontSize={24}
                    minFontSize={14}
                    className={cn('my-earnings-detail-value', earningsClass(yearSum))}
                  >
                    {formatEarnings(yearSum, masked)}
                  </FitText>
                </>
              )}
              {viewTab === 'year' && (
                <>
                  <div className="my-earnings-detail-label">全部年度</div>
                  <div className="my-earnings-detail-desc">上滑列表查看各年收益合计</div>
                </>
              )}
            </div>

            <motion.div
              className="my-earnings-swipe-wrap"
              drag={enableSwipe && !reduceMotion ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={reduceMotion ? 0 : 0.45}
              dragMomentum={false}
              onDragEnd={enableSwipe ? onDragEnd : undefined}
            >
              <div className="my-earnings-calendar-card">
                {viewTab === 'day' && (
                  <>
                    <div className="my-earnings-weekdays">
                      {WEEK_LABELS.map((w) => (
                        <span key={w}>{w}</span>
                      ))}
                    </div>
                    <div className="my-earnings-grid">
                      {monthCells.map(({ date, inMonth }) => {
                        const key = date.format('YYYY-MM-DD');
                        const dayEarnings = inMonth ? earningsByDate.get(key) : undefined;
                        const hasEarnings =
                          typeof dayEarnings === 'number' && Number.isFinite(dayEarnings);
                        const isFutureDay =
                          inMonth && date.startOf('day').isAfter(dayjs().startOf('day'));
                        const earningsTone =
                          hasEarnings && dayEarnings > 0
                            ? 'up'
                            : hasEarnings && dayEarnings < 0
                              ? 'down'
                              : 'zero';
                        const showEarningsRow = inMonth && !isFutureDay;
                        return (
                          <div
                            key={`${key}-${inMonth}`}
                            className={cn(
                              'my-earnings-cell',
                              !inMonth && 'my-earnings-cell-outside'
                            )}
                            aria-hidden={!inMonth}
                          >
                            <span className="my-earnings-cell-num">{date.date()}</span>
                            {showEarningsRow && (
                              <FitText
                                as="span"
                                maxFontSize={10}
                                minFontSize={7}
                                className={cn(
                                  'my-earnings-cell-earnings',
                                  earningsTone === 'up' && 'up',
                                  earningsTone === 'down' && 'down',
                                  earningsTone === 'zero' && 'my-earnings-cell-earnings-zero'
                                )}
                              >
                                {formatEarnings(hasEarnings ? dayEarnings : 0, masked)}
                              </FitText>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {viewTab === 'month' && (
                  <>
                    <div className="my-earnings-month-grid">
                      {monthTotalsForYear.map((total, idx) => {
                        const label = dayjs().month(idx).format('M月');
                        const monthStart = dayjs().year(cursorYear).month(idx).startOf('month');
                        const isFutureMonth = monthStart.isAfter(dayjs(), 'month');
                        return (
                          <div key={label} className="my-earnings-month-cell">
                            <div className="my-earnings-month-label">{label}</div>
                            {!isFutureMonth && (
                              <FitText
                                as="div"
                                maxFontSize={14}
                                minFontSize={10}
                                className={cn('my-earnings-month-value', earningsClass(total))}
                              >
                                {formatEarnings(total, masked)}
                              </FitText>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {viewTab === 'year' && (
                  <div className="my-earnings-year-list">
                    {yearTotals.length === 0 ? (
                      <p className="my-earnings-year-empty">暂无年度数据</p>
                    ) : (
                      yearTotals.map(([y, total]) => (
                        <div key={y} className="my-earnings-year-row">
                          <span className="my-earnings-year-label">{y}年</span>
                          <FitText
                            as="span"
                            maxFontSize={16}
                            minFontSize={11}
                            className={cn('my-earnings-year-amount', earningsClass(total))}
                          >
                            {formatEarnings(total, masked)}
                          </FitText>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
          </div>
        </div>
  );

  if (resolvedIsMobile) {
    return (
      <Drawer open={!!open} onOpenChange={onOpenChange}>
        <DrawerContent
          className={cn('my-earnings-drawer-content flex max-h-[96vh] flex-col gap-0 p-0')}
          defaultHeight="92vh"
          maxHeight="96vh"
          minHeight="44vh"
        >
          <DrawerHeader className="flex-shrink-0 flex flex-row items-center justify-between gap-2 space-y-0 px-5 pb-3 pt-2 text-left">
            <DrawerTitle className="text-base font-semibold text-[var(--text)]">我的收益</DrawerTitle>
            <DrawerClose
              className="icon-button border-none bg-transparent p-1"
              title="关闭"
              style={{ borderColor: 'transparent', backgroundColor: 'transparent' }}
            >
              <CloseIcon width="20" height="20" />
            </DrawerClose>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={!!open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn('my-earnings-drawer-content flex max-h-[92vh] w-[min(650px,calc(100vw-24px))] flex-col gap-0 overflow-hidden p-0')}
      >
        <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between gap-2 space-y-0 px-5 pb-3 pt-4 text-left border-b border-[var(--border)]">
          <DialogTitle className="text-base font-semibold text-[var(--text)]">我的收益</DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              className="icon-button border-none bg-transparent p-1"
              title="关闭"
              style={{ borderColor: 'transparent', backgroundColor: 'transparent' }}
            >
              <CloseIcon width="20" height="20" />
            </button>
          </DialogClose>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
