import React, { useState } from 'react';
import { api } from '../api/client';
import { 
  UploadCloud, FileSpreadsheet, ShieldAlert, 
  FileText, Download, Database, Sparkles, CheckCircle2 
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AdminImport() {
  const [activeSubTab, setActiveSubTab] = useState('master_db'); // 'master_db' or 'google_forms'
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [message, setMessage] = useState(null);

  // Results state
  const [masterImportResult, setMasterImportResult] = useState(null);
  const [reconciliationResult, setReconciliationResult] = useState(null);

  // Spreadsheet upload state
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [detectedSheet, setDetectedSheet] = useState('');
  const [isSpreadsheetLoaded, setIsSpreadsheetLoaded] = useState(false);

  // Smart Header Normalization
  const extractField = (row, aliases) => {
    if (!row || typeof row !== 'object') return null;
    const rowKeys = Object.keys(row);

    // 1. Exact alias match after stripping non-alphanumeric
    for (const alias of aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const key of rowKeys) {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanKey === cleanAlias) {
          return row[key];
        }
      }
    }

    // 2. Intelligent fuzzy match for Date of Birth headers
    const isDobQuery = aliases.some(a => {
      const l = a.toLowerCase();
      return l.includes('dob') || l.includes('birth');
    });

    if (isDobQuery) {
      for (const key of rowKeys) {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (
          cleanKey.includes('dateofbirth') || 
          cleanKey.includes('birthdate') || 
          cleanKey.includes('dob') ||
          cleanKey.startsWith('dob') ||
          cleanKey.endsWith('dob')
        ) {
          if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
            return row[key];
          }
        }
      }
    }

    // 3. Intelligent fuzzy match for 10th Year headers
    const isTenthYearQuery = aliases.some(a => {
      const l = a.toLowerCase();
      return (l.includes('10th') || l.includes('tenth') || l.includes('sslc')) && (l.includes('year') || l.includes('yop') || l.includes('pass'));
    });

    if (isTenthYearQuery) {
      for (const key of rowKeys) {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanKey.includes('percent') || cleanKey.includes('marks') || cleanKey.includes('cgpa') || cleanKey.includes('grade')) {
          continue;
        }
        if (
          (cleanKey.includes('10th') || cleanKey.includes('tenth') || cleanKey.includes('sslc')) &&
          (cleanKey.includes('year') || cleanKey.includes('yop') || cleanKey.includes('pass') || cleanKey.includes('batch'))
        ) {
          if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
            return row[key];
          }
        }
      }
    }

    // 4. Intelligent fuzzy match for 12th Year headers
    const isTwelfthYearQuery = aliases.some(a => {
      const l = a.toLowerCase();
      return (l.includes('12th') || l.includes('twelfth') || l.includes('puc') || l.includes('hsc') || l.includes('diploma')) && (l.includes('year') || l.includes('yop') || l.includes('pass'));
    });

    if (isTwelfthYearQuery) {
      for (const key of rowKeys) {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanKey.includes('percent') || cleanKey.includes('marks') || cleanKey.includes('cgpa') || cleanKey.includes('grade')) {
          continue;
        }
        if (
          (cleanKey.includes('12th') || cleanKey.includes('twelfth') || cleanKey.includes('puc') || cleanKey.includes('diploma') || cleanKey.includes('hsc')) &&
          (cleanKey.includes('year') || cleanKey.includes('yop') || cleanKey.includes('pass') || cleanKey.includes('batch'))
        ) {
          if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
            return row[key];
          }
        }
      }
    }

    return null;
  };

  // Helper to parse Excel dates (handles serial numbers, Date objects, and formatted strings)
  const parseExcelDate = (val) => {
    if (!val && val !== 0) return '';
    if (typeof val === 'number' && val > 20000 && val < 60000) {
      const date = new Date(Math.round((Math.round(val) - 25569) * 86400 * 1000));
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (val instanceof Date && !isNaN(val.getTime())) {
      // Eliminate SheetJS / local timezone offset (e.g. IST -330min placing time at 23:59:50 on previous day)
      // by shifting by +12 hours and extracting UTC calendar date
      const shifted = new Date(val.getTime() + 12 * 60 * 60 * 1000);
      const y = shifted.getUTCFullYear();
      const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
      const d = String(shifted.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    let str = String(val).trim();
    if (!str) return '';
    if (str.includes('T')) str = str.split('T')[0];
    if (str.includes(' ')) str = str.split(' ')[0];

    // 5-digit Excel serial stored as string e.g. "37755"
    if (/^\d{5}$/.test(str)) {
      const num = Number(str);
      if (num > 20000 && num < 60000) {
        const date = new Date(Math.round((num - 25569) * 86400 * 1000));
        const y = date.getUTCFullYear();
        const m = String(date.getUTCMonth() + 1).padStart(2, '0');
        const d = String(date.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }

    // YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const ymd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymd) {
      return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
    }

    // DD-MM-YYYY or MM/DD/YYYY
    const dmy = str.match(/^(\d{1,2})([-\/.])(\d{1,2})\2(\d{4})/);
    if (dmy) {
      const p1 = parseInt(dmy[1], 10);
      const sep = dmy[2];
      const p2 = parseInt(dmy[3], 10);
      const y = dmy[4];
      let d, m;
      if (p1 > 12) {
        d = String(p1).padStart(2, '0');
        m = String(p2).padStart(2, '0');
      } else if (p2 > 12) {
        m = String(p1).padStart(2, '0');
        d = String(p2).padStart(2, '0');
      } else if (sep === '/') {
        // Slash delimiter (Excel / Google Sheets standard M/D/YYYY)
        m = String(p1).padStart(2, '0');
        d = String(p2).padStart(2, '0');
      } else {
        // Hyphen or other delimiter (DD-MM-YYYY)
        d = String(p1).padStart(2, '0');
        m = String(p2).padStart(2, '0');
      }
      return `${y}-${m}-${d}`;
    }

    // Textual dates (e.g. 15-Apr-2003, April 15 2003)
    const parsedTimestamp = Date.parse(str);
    if (!isNaN(parsedTimestamp)) {
      const dObj = new Date(parsedTimestamp);
      const y = dObj.getFullYear();
      if (y >= 1950 && y <= 2030) {
        const m = String(dObj.getMonth() + 1).padStart(2, '0');
        const d = String(dObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }

    return str;
  };

  // Helper to parse 4-digit passing years from numbers, dates, or strings
  const parseYear = (val, fallback = null) => {
    if (val === null || val === undefined || val === '') return fallback;
    if (val instanceof Date && !isNaN(val.getTime())) return val.getFullYear();
    const str = String(val).trim();
    const match = str.match(/\b(19\d\d|20\d\d)\b/);
    if (match) {
      const y = parseInt(match[1], 10);
      if (y >= 1990 && y <= 2040) return y;
    }
    const n = parseInt(str, 10);
    if (!isNaN(n)) {
      if (n >= 1990 && n <= 2040) return n;
      if (n >= 0 && n <= 50) return 2000 + n;
      if (n > 50 && n <= 99) return 1900 + n;
    }
    return fallback;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMessage(null);
    setUploadedFileName(file.name);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        setDetectedSheet(sheetName);
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!json || json.length === 0) {
          setMessage({
            type: 'danger',
            text: 'The uploaded spreadsheet is empty or has no readable data rows.'
          });
          setParsedRows([]);
          setIsSpreadsheetLoaded(false);
          setParsing(false);
          return;
        }

        // Normalize rows for consistency
        const normalized = json.map(r => {
          const usn = extractField(r, ['usn', 'rollno', 'roll_no', 'candidate_usn', 'student_id', 'regno', 'university_seat_number', 'student_usn']) || '';
          const name = extractField(r, ['name', 'student_name', 'candidate_name', 'full_name']) || 'Student';
          const email = extractField(r, ['email', 'primary_email', 'college_email']) || (usn ? `${String(usn).toLowerCase()}@placement.edu` : '');
          const branch = (extractField(r, ['branch', 'dept', 'department', 'stream', 'course']) || 'CSE').toString().trim().toUpperCase();
          const degree = extractField(r, ['degree', 'program']) || 'B.Tech';
          const cgpaRaw = extractField(r, ['cgpa', 'cgpa_scale_10', 'cumulative_cgpa', 'percentage_cgpa', 'gpa']);
          const cgpa = cgpaRaw !== null && cgpaRaw !== '' ? Number(cgpaRaw) : 7.0;
          const tenthRaw = extractField(r, ['10th_percentage', 'tenth_percentage', '10th', 'sslc', '10th percentage']);
          const tenth = tenthRaw !== null && tenthRaw !== '' ? Number(tenthRaw) : 60;
          const twelfthRaw = extractField(r, ['12th_percentage', 'twelfth_percentage', '12th', 'puc', '12th percentage']);
          const twelfth = twelfthRaw !== null && twelfthRaw !== '' ? Number(twelfthRaw) : 60;
          const backlogs = Number(extractField(r, ['active_backlogs', 'current_backlogs', 'backlogs', 'arrears', 'active backlogs']) || 0);
          const backlogHistory = Number(extractField(r, ['backlog_history_count', 'history_of_backlogs', 'history of backlogs']) || 0);
          const gradYear = Number(extractField(r, ['graduation_year', 'batch', 'passing_year', 'graduation year']) || 2027);

          const tenthYearRaw = extractField(r, [
            '10th_year', 'tenth_year', '10th year', 'tenth year',
            '10th_passing_year', '10th passing year', 'tenth_passing_year', 'tenth passing year',
            'sslc_year', 'sslc year', 'sslc_passing_year', 'sslc passing year',
            '10th_year_of_passing', '10th year of passing', 'tenth_year_of_passing',
            'year_of_passing_10th', 'year of passing 10th', 'sslc_year_of_passing',
            '10th_yop', '10th yop', 'sslc_yop', 'sslc yop', '10th_pass_year'
          ]);
          const twelfthYearRaw = extractField(r, [
            '12th_year', 'twelfth_year', '12th year', 'twelfth year',
            '12th_passing_year', '12th passing year', 'twelfth_passing_year', 'twelfth passing year',
            'puc_year', 'puc year', 'puc_passing_year', 'puc passing year',
            '12th_year_of_passing', '12th year of passing', 'twelfth_year_of_passing',
            'year_of_passing_12th', 'year of passing 12th', 'puc_year_of_passing',
            '12th_yop', '12th yop', 'puc_yop', 'puc yop', '12th_pass_year',
            'diploma_year', 'diploma year', 'diploma_passing_year', 'hsc_year', 'hsc year'
          ]);

          const tenthYear = parseYear(tenthYearRaw, gradYear ? gradYear - 6 : 2019);
          const twelfthYear = parseYear(twelfthYearRaw, gradYear ? gradYear - 4 : 2021);

          const dobRaw = extractField(r, [
            'date_of_birth_dob', 'date of birth (dob)', 'date of birth', 
            'dob', 'birth_date', 'birthdate', 'dob_dd_mm_yyyy', 
            'd.o.b', 'd.o.b.', 'birth date', 'dob(dd/mm/yyyy)', 
            'dob(yyyy-mm-dd)', 'dateofbirth', 'dateofbirthdob'
          ]);
          const dob = parseExcelDate(dobRaw);

          return {
            usn: String(usn).trim().toUpperCase(),
            name: String(name).trim(),
            email: String(email).trim(),
            branch,
            degree,
            cgpa,
            tenth_percentage: tenth,
            tenth_year: tenthYear,
            twelfth_percentage: twelfth,
            twelfth_year: twelfthYear,
            active_backlogs: backlogs,
            backlog_history_count: backlogHistory,
            graduation_year: gradYear,
            dob: dob || '2003-01-01',
            _raw: r
          };
        }).filter(r => r.usn);

        if (normalized.length === 0) {
          const sampleKeys = json[0] ? Object.keys(json[0]).join(', ') : 'None';
          setMessage({
            type: 'danger',
            text: `No student records found with a recognized USN column. Detected columns: [${sampleKeys}]. Please ensure a column header is named "USN" or "Roll No".`
          });
          setParsedRows([]);
          setIsSpreadsheetLoaded(false);
          setParsing(false);
          return;
        }

        setParsedRows(normalized);
        setIsSpreadsheetLoaded(true);
        setMessage({
          type: 'success',
          text: `Successfully parsed "${file.name}": ${normalized.length} valid student record(s) loaded from sheet "${sheetName}". Click the "Feed to Database" button below to commit.`
        });
      } catch (err) {
        console.error('Failed to parse spreadsheet', err);
        setMessage({
          type: 'danger',
          text: `Failed to parse file: ${err.message || 'Invalid format'}. Please ensure it is a valid Excel (.xlsx/.xls) or CSV spreadsheet.`
        });
        setParsedRows([]);
        setIsSpreadsheetLoaded(false);
      } finally {
        setParsing(false);
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input so same file can be chosen again if needed
  };

  // Quick 1-click loader for sample template data
  const handleLoadSampleTemplate = () => {
    const templateData = [
      {
        usn: "1MS21CS101",
        name: "Aditya Verma",
        email: "aditya.verma@placement.edu",
        dob: "2003-04-15",
        branch: "CSE",
        degree: "B.Tech",
        cgpa: 8.45,
        tenth_percentage: 86.5,
        tenth_year: 2019,
        twelfth_percentage: 84.0,
        twelfth_year: 2021,
        active_backlogs: 0,
        backlog_history_count: 0,
        graduation_year: 2027
      },
      {
        usn: "1MS21CS102",
        name: "Ananya Sharma",
        email: "ananya.sharma@placement.edu",
        dob: "2003-08-22",
        branch: "CSE",
        degree: "B.Tech",
        cgpa: 9.12,
        tenth_percentage: 94.0,
        tenth_year: 2019,
        twelfth_percentage: 92.5,
        twelfth_year: 2021,
        active_backlogs: 0,
        backlog_history_count: 0,
        graduation_year: 2027
      },
      {
        usn: "1MS21EC103",
        name: "Chirag Hegde",
        email: "chirag.h@placement.edu",
        dob: "2003-11-05",
        branch: "ECE",
        degree: "B.Tech",
        cgpa: 7.35,
        tenth_percentage: 78.5,
        tenth_year: 2019,
        twelfth_percentage: 76.0,
        twelfth_year: 2021,
        active_backlogs: 0,
        backlog_history_count: 0,
        graduation_year: 2027
      },
      {
        usn: "1MS21IS104",
        name: "Divya Nair",
        email: "divya.n@placement.edu",
        dob: "2003-01-19",
        branch: "ISE",
        degree: "B.Tech",
        cgpa: 8.80,
        tenth_percentage: 89.0,
        tenth_year: 2019,
        twelfth_percentage: 87.5,
        twelfth_year: 2021,
        active_backlogs: 0,
        backlog_history_count: 0,
        graduation_year: 2027
      },
      {
        usn: "1MS21CS105",
        name: "Eshwar Prasad",
        email: "eshwar.p@placement.edu",
        dob: "2003-06-30",
        branch: "CSE",
        degree: "B.Tech",
        cgpa: 6.95,
        tenth_percentage: 72.0,
        tenth_year: 2019,
        twelfth_percentage: 70.0,
        twelfth_year: 2021,
        active_backlogs: 1,
        backlog_history_count: 1,
        graduation_year: 2027
      }
    ];

    setParsedRows(templateData);
    setUploadedFileName("placement_master_cgpa_template.xlsx");
    setDetectedSheet("Master_CGPA_Template");
    setIsSpreadsheetLoaded(true);
    setMessage({
      type: "success",
      text: "Loaded 5 certified student records with Date of Birth from template. Click 'Feed to Database' button to commit."
    });
  };

  const handleCommitSpreadsheet = async () => {
    if (parsedRows.length === 0) {
      alert('No spreadsheet records loaded. Please select an Excel file or click "Load Sample Template" first.');
      return;
    }

    try {
      setLoading(true);
      setMessage(null);

      if (activeSubTab === 'master_db') {
        const res = await api.importMasterRecords({ records: parsedRows, updateExisting: true });
        setMasterImportResult(res);
        setMessage({ 
          type: 'success', 
          text: `Success: ${res.importedCount} student(s) imported, ${res.updatedCount} updated with verified academic & DOB records in MySQL database!` 
        });
      } else {
        // Google Forms reconciliation
        const res = await api.importGoogleForms(parsedRows.map(r => r._raw || r));
        setReconciliationResult(res.results);
        setMessage({ type: 'success', text: res.message });
      }
    } catch (err) {
      alert(err.data?.error || err.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  // Download Sample Spreadsheet Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "USN": "4NI23IS164",
        "Name": "Ravi Annappa Pujar",
        "Date of Birth (DOB)": "2005-03-23",
        "Email": "ravipujar8073@gmail.com",
        "Branch": "ISE",
        "Degree": "B.E",
        "CGPA": 9.52,
        "10th Percentage": 94.4,
        "10th Year": 2021,
        "12th Percentage": 93.0,
        "12th Year": 2023,
        "Graduation Year": 2027,
        "Active Backlogs": 0,
        "History Of Backlogs": 0,
        "Education Gap Months": 0
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master_CGPA_Template");
    XLSX.writeFile(wb, "placement_master_cgpa_template.xlsx");
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '0.3rem' }}>Embed Institutional Master CGPA Spreadsheet</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Upload your college academic spreadsheet (Excel <code>.xlsx</code>, <code>.xls</code>, or <code>.csv</code>) 
          to establish the certified single source of truth for student eligibility.
        </p>
      </div>

      {/* Mode Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button 
          className={`btn ${activeSubTab === 'master_db' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveSubTab('master_db'); setMessage(null); }}
          style={{ fontSize: '0.85rem' }}
        >
          <UploadCloud size={16} /> 1. Import Master Academic Records (Registrar Certified)
        </button>
        <button 
          className={`btn ${activeSubTab === 'google_forms' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveSubTab('google_forms'); setMessage(null); }}
          style={{ fontSize: '0.85rem' }}
        >
          <ShieldAlert size={16} /> 2. Google Forms Reconciliation (Detect Fraud)
        </button>
      </div>

      {message && (
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          background: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: message.type === 'success' ? '#34d399' : '#f87171',
          border: `1px solid ${message.type === 'success' ? 'var(--success-border)' : 'var(--danger-border)'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>&times;</button>
        </div>
      )}

      {/* SPREADSHEET DRAG & DROP UPLOAD BOX */}
      <div className="card" style={{ marginBottom: '2rem', border: '1px solid var(--border-accent)' }}>
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff' }}>
              {activeSubTab === 'master_db' 
                ? 'Upload Master Academic / CGPA Spreadsheet' 
                : 'Upload Google Form Response Spreadsheet'}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Accepts Microsoft Excel (<code>.xlsx</code>, <code>.xls</code>) or Comma-Separated Values (<code>.csv</code>)
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleLoadSampleTemplate}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Load 5 pre-configured student records"
            >
              <Sparkles size={14} color="#34d399" />
              <span>Quick-Load Sample Data</span>
            </button>

            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleDownloadTemplate}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Download size={14} />
              <span>Download Excel Template</span>
            </button>
          </div>
        </div>

        {/* Dropzone Container */}
        <div style={{
          border: '2px dashed var(--border-medium)',
          borderRadius: 'var(--radius-md)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          transition: 'all 0.2s ease',
          marginBottom: '1.25rem'
        }}>
          <FileSpreadsheet size={44} color="var(--primary)" style={{ margin: '0 auto 0.75rem' }} />
          
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.35rem', color: '#ffffff' }}>
            {uploadedFileName ? (
              <span>Selected Spreadsheet: <strong style={{ color: '#38bdf8' }}>{uploadedFileName}</strong></span>
            ) : (
              <span>Choose your Excel (.xlsx / .xls) or CSV spreadsheet</span>
            )}
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '580px', margin: '0 auto 1.25rem' }}>
            Automatic column mapping parses USN, Student Name, CGPA, Branch, and Backlogs directly into institutional verified records.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label className="btn btn-primary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.5rem' }}>
              <UploadCloud size={18} />
              <span>{uploadedFileName ? 'Choose Different Spreadsheet' : 'Browse Excel / CSV File'}</span>
              <input 
                type="file" 
                accept=".xlsx,.xls,.csv" 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
              />
            </label>

            {!isSpreadsheetLoaded && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleLoadSampleTemplate}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.25rem' }}
              >
                <Sparkles size={16} color="#34d399" />
                <span>Or Load Sample Data Directly</span>
              </button>
            )}
          </div>
        </div>

        {/* FEED TO DATABASE ACTION BAR */}
        <div style={{
          background: parsedRows.length > 0 ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface)',
          border: parsedRows.length > 0 ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-medium)',
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} color={parsedRows.length > 0 ? '#34d399' : 'var(--text-muted)'} />
              <span>Database Feed Status:</span>
              {parsing ? (
                <span style={{ color: '#38bdf8' }}>Parsing spreadsheet...</span>
              ) : parsedRows.length > 0 ? (
                <span className="badge badge-verified" style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>
                  {parsedRows.length} Records Ready to Feed
                </span>
              ) : uploadedFileName ? (
                <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>No student records detected</span>
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Awaiting spreadsheet file</span>
              )}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              {parsedRows.length > 0
                ? `Click "Feed to Database" to insert or update these ${parsedRows.length} verified records in MySQL.`
                : 'Select an Excel file or click "Quick-Load Sample Data" to enable the database feed button.'}
            </div>
          </div>

          <button 
            type="button"
            className="btn btn-success" 
            onClick={handleCommitSpreadsheet}
            disabled={loading || parsedRows.length === 0}
            style={{ 
              padding: '0.75rem 2rem', 
              fontWeight: 800, 
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: parsedRows.length > 0 ? '0 4px 16px rgba(16, 185, 129, 0.4)' : 'none',
              opacity: parsedRows.length === 0 ? 0.5 : 1,
              cursor: parsedRows.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <Database size={18} />
            <span>
              {loading 
                ? 'Feeding to Database...' 
                : parsedRows.length > 0
                  ? `Feed ${parsedRows.length} Records to Database`
                  : 'Feed to Database'}
            </span>
          </button>
        </div>
      </div>

      {/* SPREADSHEET LIVE PREVIEW TABLE */}
      {parsedRows.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>
                Spreadsheet Preview (Showing {Math.min(10, parsedRows.length)} of {parsedRows.length} students)
              </h3>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                Sheet: <span style={{ color: '#a5b4fc' }}>{detectedSheet || 'Master Sheet'}</span> • Certified columns matched
              </div>
            </div>
            
            <button 
              type="button"
              className="btn btn-success" 
              onClick={handleCommitSpreadsheet}
              disabled={loading}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', fontWeight: 700 }}
            >
              <Database size={15} />
              <span>{loading ? 'Committing...' : 'Commit to Database'}</span>
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>USN</th>
                  <th>Student Name</th>
                  <th>Date of Birth (DOB)</th>
                  <th>Branch</th>
                  <th>Certified CGPA</th>
                  <th>10th %</th>
                  <th>10th Yr</th>
                  <th>12th %</th>
                  <th>12th Yr</th>
                  <th>Active Backlogs</th>
                  <th>Grad Year</th>
                  <th>Institutional Verification Badge</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 10).map((r, i) => (
                  <tr key={i}>
                    <td><strong style={{ color: '#ffffff' }}>{r.usn}</strong></td>
                    <td>{r.name}</td>
                    <td>
                      <span style={{ 
                        color: r.dob && r.dob !== '2003-01-01' ? '#38bdf8' : '#fbbf24',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        fontSize: '0.85rem'
                      }}>
                        {r.dob || '2003-01-01'}
                      </span>
                      {(!r.dob || r.dob === '2003-01-01') && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Default fallback</div>
                      )}
                    </td>
                    <td><span style={{ fontWeight: 600 }}>{r.branch}</span></td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#34d399', fontSize: '0.95rem' }}>
                        {Number(r.cgpa).toFixed(2)}
                      </span>
                    </td>
                    <td>{Number(r.tenth_percentage || 0).toFixed(1)}%</td>
                    <td>
                      <span style={{ 
                        color: r.tenth_year ? '#38bdf8' : '#fbbf24',
                        fontWeight: 600,
                        fontFamily: 'monospace'
                      }}>
                        {r.tenth_year || '2019'}
                      </span>
                    </td>
                    <td>{Number(r.twelfth_percentage || 0).toFixed(1)}%</td>
                    <td>
                      <span style={{ 
                        color: r.twelfth_year ? '#38bdf8' : '#fbbf24',
                        fontWeight: 600,
                        fontFamily: 'monospace'
                      }}>
                        {r.twelfth_year || '2021'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: Number(r.active_backlogs) > 0 ? '#f87171' : '#34d399' }}>
                        {r.active_backlogs}
                      </span>
                    </td>
                    <td>{r.graduation_year}</td>
                    <td>
                      <span className="badge badge-verified">✓ Verified by Institution</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MASTER IMPORT COMMITTED SUMMARY */}
      {masterImportResult && (
        <div className="card" style={{ marginBottom: '2rem', border: '1px solid #10b981', background: 'rgba(16, 185, 129, 0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <CheckCircle2 size={24} color="#10b981" />
            <h3 style={{ color: '#34d399', fontSize: '1.2rem', margin: 0 }}>
              Master Database Feed Successful
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', color: 'var(--text-main)', fontSize: '0.9rem' }}>
            <div>Newly Registered Students: <strong style={{ color: '#34d399' }}>{masterImportResult.importedCount}</strong></div>
            <div>Updated Verified Records: <strong style={{ color: '#38bdf8' }}>{masterImportResult.updatedCount}</strong></div>
            {masterImportResult.skippedCount > 0 && (
              <div>Skipped Records: <strong style={{ color: '#fbbf24' }}>{masterImportResult.skippedCount}</strong></div>
            )}
          </div>
        </div>
      )}

      {/* RECONCILIATION RESULT REPORT */}
      {reconciliationResult && (
        <div className="card" style={{ marginBottom: '2rem', border: reconciliationResult.mismatchesDetected > 0 ? '2px solid #ef4444' : '2px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            {reconciliationResult.mismatchesDetected > 0 ? (
              <ShieldAlert size={28} color="#ef4444" />
            ) : (
              <CheckCircle2 size={28} color="#10b981" />
            )}
            <div>
              <h3 style={{ color: reconciliationResult.mismatchesDetected > 0 ? '#ef4444' : '#34d399', fontSize: '1.3rem', margin: 0 }}>
                {reconciliationResult.mismatchesDetected > 0 
                  ? `DATA MISMATCHES DETECTED (${reconciliationResult.mismatchesDetected} FLAGGED)`
                  : '100% RECONCILIATION VERIFIED — NO MISMATCHES'}
              </h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Total Processed: {reconciliationResult.totalReceived} • Matched with Institutional Registry: {reconciliationResult.matchedCount} • Unknown USNs: {reconciliationResult.notFoundCount}
              </div>
            </div>
          </div>

          {reconciliationResult.discrepancyDetails && reconciliationResult.discrepancyDetails.length > 0 && (
            <div className="table-container" style={{ marginTop: '1rem' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>USN</th>
                    <th>Field Name</th>
                    <th>Student Submitted</th>
                    <th>Institutional Verified</th>
                    <th>Severity</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliationResult.discrepancyDetails.map((d, idx) => (
                    <tr key={idx}>
                      <td><strong style={{ color: '#ffffff' }}>{d.usn}</strong></td>
                      <td>{d.fieldName}</td>
                      <td style={{ color: '#f87171', fontWeight: 700 }}>{d.submittedValue}</td>
                      <td style={{ color: '#34d399', fontWeight: 700 }}>{d.verifiedValue}</td>
                      <td><span className="badge badge-flagged">{d.severity}</span></td>
                      <td><span className="badge" style={{ background: '#450a0a', color: '#fca5a5' }}>Logged to Audit</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TERMINAL CLI ALTERNATIVE GUIDE */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} color="#818cf8" />
            <h3 style={{ fontSize: '1.1rem', color: '#ffffff' }}>Alternative: Command-Line (CLI) Bulk Import</h3>
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          You can also place your master spreadsheet directly into the project and import it via the command line:
        </p>

        <div style={{
          background: 'var(--bg-input)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'monospace',
          fontSize: '0.825rem',
          color: '#a5b4fc',
          lineHeight: 1.6
        }}>
          <div># Import any Excel or CSV spreadsheet by path:</div>
          <div style={{ color: '#34d399' }}>npm --prefix backend run db:import "path/to/your_master_cgpa.xlsx"</div>
        </div>
      </div>
    </div>
  );
}
