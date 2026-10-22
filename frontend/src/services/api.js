export async function requestJSON(path, { signal, body } = {}) {
  let response;
  try {
    response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', signal,
      ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('无法连接服务，请检查后端是否已启动。');
  }
  let data;
  try { data = await response.json(); } catch { throw new Error('服务返回了无法读取的数据，请稍后重试。'); }
  if (!response.ok) throw new Error(typeof data?.error?.message === 'string' ? data.error.message : `请求失败（${response.status}）`);
  return data;
}

export function createRun(input, signal) { return requestJSON('/api/algorithms/binary-search/runs', { body: input, signal }); }
