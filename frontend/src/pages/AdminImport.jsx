import React, { useState } from 'react';
import { api } from '../api/client';
import { 
  UploadCloud, FileSpreadsheet, ShieldAlert, 
  FileText, Download, Database, Sparkles 
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AdminImport() {
  const [activeSubTab, setActiveSubTab] = useState('master_db'); // 'master_db' or 'google_forms'
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [message, setMessage] = useState(null);

  // Spreadsheet upload state
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [detectedSheet, setDetectedSheet] = useState('');
  const [isSpreadsheetLoaded, setIsSpreadsheetLoaded] = useState(false);

  // Smart Header Normalization
  const extractField = (row, aliases) => {
    const rowKeys = Object.keys(row);
    for (const alias of aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const key of rowKeys) {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanKey === cleanAlias) {
          return row[key];
        }
      }
    }
    return null;
  };

  // Helper to parse Excel dates (handles serial numbers, Date objects, and formatted strings)
  const parseExcelDate = (val) => {
    if (!val && val !== 0) return '';
    if (typeof val === 'number' && val > 20000 && val < 60000) {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (val instanceof Date) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const str = String(val).trim();
    const ymd = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (ymd) {
      return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
    }
    const dmy = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmy) {
      return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }
    return str;
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
          const usn = extractField(r, ['usn', 'rollno', 'roll_no', 'candidate_usn', 'student_id', 'regno', 'university_seat_number']) || '';
          const name = extractField(r, ['name', 'student_name', 'candidate_name', 'full_name']) || 'Student';
          const email = extractField(r, ['email', 'primary_email', 'college_email']) || (usn ? `${String(usn).toLowerCase()}@placement.edu` : '');
          const branch = (extractField(r, ['branch', 'dept', 'department', 'stream', 'course']) || 'CSE').toString().trim().toUpperCase();
          const degree = extractField(r, ['degree', 'program']) || 'B.Tech';
          const cgpaRaw = extractField(r, ['cgpa', 'cgpa_scale_10', 'cumulative_cgpa', 'percentage_cgpa', 'gpa']);
          const cgpa = cgpaRaw !== null && cgpaRaw !== '' ? Number(cgpaRaw) : 7.0;
          const tenth = Number(extractField(r, ['10th_percentage', 'tenth_percentage', '10th', 'sslc', '10th percentage']) || 60);
          const twelfth = Number(extractField(r, ['12th_percentage', 'twelfth_percentage', '12th', 'puc', '12th percentage']) || 60);
          const backlogs = Number(extractField(r, ['active_backlogs', 'current_backlogs', 'backlogs', 'arrears', 'active backlogs']) || 0);
          const backlogHistory = Number(extractField(r, ['backlog_history_count', 'history_of_backlogs', 'history of backlogs']) || 0);
          const gradYear = Number(extractField(r, ['graduation_year', 'batch', 'passing_year', 'graduation year']) || 2027);
          const dobRaw = extractField(r, ['dob', 'date_of_birth', 'date of birth', 'birth_date', 'birthdate', 'dob_dd_mm_yyyy', 'd.o.b', 'd.o.b.', 'birth date', 'dob(dd/mm/yyyy)', 'dob(yyyy-mm-dd)']);
          const dob = parseExcelDate(dobRaw);

          return {
            usn: String(usn).trim().toUpperCase(),
            name: String(name).trim(),
            email: String(email).trim(),
            branch,
            degree,
            cgpa,
            tenth_percentage: tenth,
            twelfth_percentage: twelfth,
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
        twelfth_percentage: 84.0,
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
        twelfth_percentage: 92.5,
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
        twelfth_percentage: 76.0,
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
        twelfth_percentage: 87.5,
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
        twelfth_percentage: 70.0,
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
        "USN": "1MS21CS101",
        "Name": "Aditya Verma",
        "Date of Birth (DOB)": "2003-04-15",
        "Email": "aditya.verma@placement.edu",
        "Branch": "CSE",
        "Degree": "B.Tech",
        "CGPA": 8.45,
        "10th Percentage": 86.5,
        "10th Year": 2019,
        "12th Percentage": 84.0,
        "12th Year": 2021,
        "Graduation Year": 2027,
        "Active Backlogs": 0,
        "History Of Backlogs": 0,
        "Education Gap Months": 0
      },
      {
        "USN": "1MS21CS102",
        "Name": "Ananya Sharma",
        "Date of Birth (DOB)": "2003-08-22",
        "Email": "ananya.sharma@placement.edu",
        "Branch": "CSE",
        "Degree": "B.Tech",
        "CGPA": 9.12,
        "10th Percentage": 94.0,
        "10th Year": 2019,
        "12th Percentage": 92.5,
        "12th Year": 2021,
        "Graduation Year": 2027,
        "Active Backlogs": 0,
        "History Of Backlogs": 0,
        "Education Gap Months": 0
      },
      {
        "USN": "1MS21EC103",
        "Name": "Chirag Hegde",
        "Date of Birth (DOB)": "2003-11-05",
        "Email": "chirag.h@placement.edu",
        "Branch": "ECE",
        "Degree": "B.Tech",
        "CGPA": 7.35,
        "10th Percentage": 78.5,
        "10th Year": 2019,
        "12th Percentage": 76.0,
        "12th Year": 2021,
        "Graduation Year": 2027,
        "Active Backlogs": 0,
        "History Of Backlogs": 0,
        "Education Gap Months": 0
      }
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
                  <th>12th %</th>
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
                    <td>{Number(r.twelfth_percentage || 0).toFixed(1)}%</td>
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
