import { getAuditLogs } from '../services/auditService.js';

export async function getLogs(req, res) {
  const { limit = 100, action, role, search } = req.query;

  const logs = await getAuditLogs({
    limit: Number(limit),
    action: action || null,
    role: role || null,
    search: search || null
  });

  const parsed = (logs || []).map(l => {
    let oldVal = null;
    let newVal = null;
    try { oldVal = JSON.parse(l.old_values); } catch { oldVal = l.old_values; }
    try { newVal = JSON.parse(l.new_values); } catch { newVal = l.new_values; }

    return {
      ...l,
      old_values: oldVal,
      new_values: newVal
    };
  });

  return res.json({ logs: parsed });
}
