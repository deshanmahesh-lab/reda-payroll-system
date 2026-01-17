import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarCheck, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const { ipcRenderer } = window.require('electron');

const Attendance = () => {
  const navigate = useNavigate();

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [date, setDate] = useState(today);
  const [siteId, setSiteId] = useState('');
  const [sites, setSites] = useState([]);

  const [employees, setEmployees] = useState([]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const normalizeId = (value) => {
    if (value === null || value === undefined || value === '') return '';
    return String(value);
  };

  useEffect(() => {
    const loadSites = async () => {
      try {
        const res = await ipcRenderer.invoke('get-sites');
        if (res.success) setSites(res.data);
      } catch (e) {
        toast.error('Failed to load sites');
      }
    };

    loadSites();
  }, []);

  const loadEmployeesForSite = async (selectedSiteId) => {
    if (!selectedSiteId) {
      setEmployees([]);
      return;
    }

    try {
      const all = [];
      const sec = await ipcRenderer.invoke('get-employees', 'SECURITY');
      if (sec.success) all.push(...sec.data);
      const cln = await ipcRenderer.invoke('get-employees', 'CLEANING');
      if (cln.success) all.push(...cln.data);

      const filtered = all.filter((e) => normalizeId(e.site_id) === normalizeId(selectedSiteId) && e.status === 'ACTIVE');
      const unique = new Map();
      for (const e of filtered) {
        if (!unique.has(e.id)) unique.set(e.id, e);
      }
      setEmployees(Array.from(unique.values()));
    } catch (e) {
      setEmployees([]);
    }
  };

  const loadAttendance = async () => {
    if (!siteId) {
      toast.error('Please select a work site');
      return;
    }

    setLoading(true);
    try {
      await loadEmployeesForSite(siteId);

      const res = await ipcRenderer.invoke('get-attendance-by-date-site', { date, site_id: Number(siteId) });
      if (!res.success) {
        toast.error(res.message || 'Failed to load attendance');
        setRows([]);
        setLoading(false);
        return;
      }

      const normalizedRows = (res.data || []).map((r) => ({
        id: r.id,
        employee_id: normalizeId(r.employee_id),
        full_name: r.full_name || '',
        shift_type: r.shift_type || 'DAY',
        ot_hours: r.ot_hours ?? 0,
        status: r.status || 'PRESENT'
      }));

      setRows(normalizedRows);
    } catch (e) {
      toast.error('Failed to load attendance');
      setRows([]);
    }
    setLoading(false);
  };

  const availableEmployees = useMemo(() => {
    const used = new Set(rows.map((r) => r.employee_id));
    return employees
      .filter((e) => !used.has(normalizeId(e.id)))
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [employees, rows]);

  const addEmployeeRow = () => {
    if (!siteId) {
      toast.error('Select a site first');
      return;
    }

    if (availableEmployees.length === 0) {
      toast.error('No available employees to add');
      return;
    }

    const e = availableEmployees[0];
    setRows((prev) => [
      ...prev,
      {
        id: null,
        employee_id: normalizeId(e.id),
        full_name: e.full_name || '',
        shift_type: 'DAY',
        ot_hours: 0,
        status: 'PRESENT'
      }
    ]);
  };

  const removeRow = (employeeId) => {
    setRows((prev) => prev.filter((r) => r.employee_id !== employeeId));
  };

  const updateRow = (employeeId, patch) => {
    setRows((prev) => prev.map((r) => (r.employee_id === employeeId ? { ...r, ...patch } : r)));
  };

  const saveAttendance = async () => {
    if (!siteId) {
      toast.error('Select a site first');
      return;
    }

    if (!date) {
      toast.error('Select a date');
      return;
    }

    if (rows.length === 0) {
      toast.error('No rows to save');
      return;
    }

    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        employee_id: Number(r.employee_id),
        site_id: Number(siteId),
        date,
        shift_type: r.shift_type,
        ot_hours: r.ot_hours === '' || r.ot_hours === null || r.ot_hours === undefined ? 0 : Number(r.ot_hours),
        status: r.status
      }));

      const res = await ipcRenderer.invoke('save-attendance', payload);
      if (res.success) {
        toast.success(res.message || 'Attendance saved');
        await loadAttendance();
      } else {
        toast.error(res.message || 'Save failed');
      }
    } catch (e) {
      toast.error('Save failed');
    }
    setSaving(false);
  };

  // Auto-load when site changes (only if a site is selected)
  useEffect(() => {
    if (siteId) {
      loadAttendance();
    } else {
      setRows([]);
      setEmployees([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 transition-colors duration-300 text-slate-900 dark:text-white flex flex-col h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition"><ArrowLeft /></button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarCheck size={22} /> Attendance</h1>
            <p className="text-sm opacity-60">Select a date and site, then mark shift/OT/status</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-xs font-bold uppercase opacity-50">Date</label>
            <input type="date" className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-bold uppercase opacity-50">Work Site</label>
            <select className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none" value={siteId} onChange={(e) => setSiteId(e.target.value)}>
              <option value="">Select Site</option>
              {sites.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.site_name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button onClick={loadAttendance} disabled={loading || !siteId} className={`w-full px-4 py-3 rounded-xl font-bold text-white ${loading || !siteId ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}>
              {loading ? 'Loading...' : 'Load Data'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-sm opacity-70">Daily Attendance Sheet</div>
          <button onClick={addEmployeeRow} disabled={!siteId} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium ${!siteId ? 'bg-slate-200 dark:bg-slate-800 opacity-50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
            <Plus size={18} /> Add Employee to List
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur z-10">
              <tr className="text-xs uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 opacity-70">
                <th className="p-4">Employee Name</th>
                <th className="p-4">Shift</th>
                <th className="p-4">OT Hours</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center opacity-50">No attendance rows. Click "Add Employee to List".</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.employee_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-4">
                      <select
                        className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none"
                        value={r.employee_id}
                        onChange={(e) => {
                          const emp = employees.find((x) => normalizeId(x.id) === e.target.value);
                          updateRow(r.employee_id, { employee_id: e.target.value, full_name: emp?.full_name || '' });
                        }}
                      >
                        <option value={r.employee_id}>{r.full_name || 'Select Employee'}</option>
                        {availableEmployees.map((e) => (
                          <option key={e.id} value={String(e.id)}>{e.full_name}</option>
                        ))}
                      </select>
                    </td>

                    <td className="p-4">
                      <select className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none" value={r.shift_type} onChange={(e) => updateRow(r.employee_id, { shift_type: e.target.value })}>
                        <option value="DAY">Day</option>
                        <option value="NIGHT">Night</option>
                      </select>
                    </td>

                    <td className="p-4">
                      <input type="number" min="0" step="0.5" className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none" value={r.ot_hours} onChange={(e) => updateRow(r.employee_id, { ot_hours: e.target.value })} />
                    </td>

                    <td className="p-4">
                      <select className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none" value={r.status} onChange={(e) => updateRow(r.employee_id, { status: e.target.value })}>
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                      </select>
                    </td>

                    <td className="p-4 text-right">
                      <button onClick={() => removeRow(r.employee_id)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 size={16} /> Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button onClick={saveAttendance} disabled={saving || !siteId} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white ${saving || !siteId ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
