const monthKey = offset => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// 只保留经官方公告核验的上市节点。自动采集尚未确认具体上市日期时，不写入日历。
export const launchesByMonth = Object.fromEntries([-1, 0, 1].map(offset => [monthKey(offset), []]));
