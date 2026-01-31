import { NextResponse } from 'next/server';

async function fetchGZ(code) {
  const url = `https://fundgz.1234567.com.cn/js/${code}.js`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('估值接口异常');
  const text = await res.text();
  const m = text.match(/jsonpgz\((.*)\);/);
  if (!m) throw new Error('估值数据解析失败');
  const json = JSON.parse(m[1]);
  const gszzlNum = Number(json.gszzl);
  return {
    code: json.fundcode,
    name: json.name,
    dwjz: json.dwjz,
    gsz: json.gsz,
    gztime: json.gztime,
    gszzl: Number.isFinite(gszzlNum) ? gszzlNum : json.gszzl
  };
}

function stripHtml(s) {
  return s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function parseHoldings(html) {
  const list = [];
  const tableMatch = html.match(/<table[\s\S]*?<\/table>/i);
  const table = tableMatch ? tableMatch[0] : html;
  const rows = table.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const r of rows) {
    const cells = [...r.matchAll(/<td[\s\S]*?>([\s\S]*?)<\/td>/gi)].map((m) => stripHtml(m[1]));
    if (!cells.length) continue;
    const codeIdx = cells.findIndex((c) => /^\d{6}$/.test(c));
    const weightIdx = cells.findIndex((c) => /\d+(?:\.\d+)?\s*%/.test(c));
    const code = codeIdx >= 0 ? cells[codeIdx] : null;
    const name = codeIdx >= 0 && codeIdx + 1 < cells.length ? cells[codeIdx + 1] : null;
    const weight = weightIdx >= 0 ? cells[weightIdx].replace(/\s+/g, '') : null;
    if (code && (name || name === '') && weight) {
      list.push({ code, name, weight });
    } else {
      const anchorNameMatch = r.match(/<a[^>]*?>([^<]+)<\/a>/i);
      const altName = anchorNameMatch ? stripHtml(anchorNameMatch[1]) : null;
      const codeMatch = r.match(/(\d{6})/);
      const weightMatch = r.match(/(\d+(?:\.\d+)?)\s*%/);
      const fallbackCode = codeMatch ? codeMatch[1] : null;
      const fallbackWeight = weightMatch ? `${weightMatch[1]}%` : null;
      if ((code || fallbackCode) && (name || altName) && (weight || fallbackWeight)) {
        list.push({ code: code || fallbackCode, name: name || altName, weight: weight || fallbackWeight });
      }
    }
  }
  return list.slice(0, 10);
}

async function fetchHoldings(code) {
  const url = `https://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${code}&topline=10&year=&month=&rt=${Date.now()}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': '*/*'
    },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error('重仓接口异常');
  const text = await res.text();
  // The response wraps HTML in var apdfund_...=...; try to extract inner HTML
  const m = text.match(/<table[\s\S]*<\/table>/i) || text.match(/content:\s*'([\s\S]*?)'/i);
  const html = m ? (m[0].startsWith('<table') ? m[0] : m[1]) : text;
  return parseHoldings(html);
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const code = (searchParams.get('code') || '').trim();
    if (!code) {
      return NextResponse.json({ error: '缺少基金编号' }, { status: 400 });
    }
    const [gz, holdings] = await Promise.allSettled([fetchGZ(code), fetchHoldings(code)]);
    if (gz.status !== 'fulfilled') {
      return NextResponse.json({ error: gz.reason?.message || '基金估值获取失败' }, { status: 404 });
    }
    const data = {
      ...gz.value,
      holdings: holdings.status === 'fulfilled' ? holdings.value : []
    };
    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e.message || '服务异常' }, { status: 500 });
  }
}
