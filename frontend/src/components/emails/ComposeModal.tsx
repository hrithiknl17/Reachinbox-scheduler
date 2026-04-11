'use client';
import { useState, useRef } from 'react';
import { X, Upload, Clock, Image as ImageIcon, Link, Paperclip, FileText, File } from 'lucide-react';
import Button from '@/components/ui/Button';
import { emailApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { AttachmentPayload } from '@/types';

interface ComposeModalProps {
  onClose: () => void;
  onSuccess: () => void;
  userEmail: string;
}

const QUICK_SCHEDULE_OPTIONS = [
  { label: 'Tomorrow, 10:00 AM', targetHour: 10, targetMinute: 0 },
  { label: 'Tomorrow, 11:00 AM', targetHour: 11, targetMinute: 0 },
  { label: 'Tomorrow, 3:00 PM',  targetHour: 15, targetMinute: 0 },
];

export default function ComposeModal({ onClose, onSuccess, userEmail }: ComposeModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [toInput, setToInput] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [delayBetweenMs, setDelayBetweenMs] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [showSendLater, setShowSendLater] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [attachments, setAttachments] = useState<AttachmentPayload[]>([]);

  const csvRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const fileRef2 = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function parseRecipients(input: string): string[] {
    return input.split(/[\n,;]+/).map(e => e.trim()).filter(isValidEmail);
  }

  function removeRecipient(email: string) {
    setRecipients(prev => prev.filter(r => r !== email));
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      complete: (results) => {
        const emails: string[] = [];
        results.data.forEach((row: unknown) => {
          if (Array.isArray(row)) {
            row.forEach((cell: unknown) => {
              if (typeof cell === 'string' && isValidEmail(cell.trim())) {
                emails.push(cell.trim());
              }
            });
          }
        });
        if (!emails.length) { toast.error('No valid emails found'); return; }
        setRecipients(prev => [...new Set([...prev, ...emails])]);
        toast.success(`Added ${emails.length} recipient(s)`);
      },
      error: () => toast.error('Failed to parse CSV'),
    });
    e.target.value = '';
  }

  // Upload image file → convert to base64 → insert <img> tag
  function handleImageFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 1024 * 1024) { toast.error('Image must be under 1MB for email compatibility'); return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      const alt = file.name.replace(/\.[^.]+$/, '');
      insertImageTag(base64, alt);
      toast.success('Image inserted');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // Handle file attachments
  function handleFileAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
    const MAX_TOTAL = 10 * 1024 * 1024;    // 10MB total

    const currentTotal = attachments.reduce((sum, a) => sum + a.size, 0);

    files.forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 5MB limit`);
        return;
      }
      if (currentTotal + file.size > MAX_TOTAL) {
        toast.error('Total attachments exceed 10MB limit');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setAttachments(prev => [...prev, {
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
          base64,
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function removeAttachment(filename: string) {
    setAttachments(prev => prev.filter(a => a.filename !== filename));
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Insert <img> tag at cursor position in textarea
  function insertImageTag(src: string, alt: string) {
    const tag = `<img src="${src}" alt="${alt}" style="max-width:100%;height:auto;display:block;margin:8px 0;" />`;
    const textarea = bodyRef.current;
    if (!textarea) {
      setBody(prev => prev + '\n' + tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newBody = body.slice(0, start) + tag + body.slice(end);
    setBody(newBody);
    // Restore cursor after inserted tag
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
      textarea.focus();
    }, 0);
  }

  function handleInsertImageUrl() {
    if (!imageUrl.trim()) { toast.error('Enter an image URL'); return; }
    insertImageTag(imageUrl.trim(), imageAlt.trim() || 'image');
    setImageUrl('');
    setImageAlt('');
    setShowImagePanel(false);
    toast.success('Image inserted');
  }

  function quickSchedule(targetHour: number, targetMinute: number) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(targetHour, targetMinute, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    setScheduledAt(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setShowSendLater(false);
  }

  async function handleSubmit() {
    const allRecipients = [...new Set([...recipients, ...parseRecipients(toInput)])];
    if (!allRecipients.length) { toast.error('Add at least one recipient'); return; }
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    if (!body.trim()) { toast.error('Body is required'); return; }
    if (!scheduledAt) { toast.error('Schedule time is required'); return; }

    setLoading(true);
    try {
      await emailApi.schedule({
        recipients: allRecipients,
        subject: subject.trim(),
        body: body.trim(),
        scheduledAt: new Date(scheduledAt).toISOString(),
        delayBetweenMs,
        hourlyLimit,
        fromEmail: userEmail,
        attachments: attachments.length ? attachments : undefined,
      });
      toast.success(`Scheduled ${allRecipients.length} email(s)`);
      onSuccess();
    } catch {
      toast.error('Failed to schedule emails');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900">Compose New Email</h2>
          </div>
          <div className="flex items-center gap-1">
            {/* Send Later */}
            <div className="relative">
              <button
                onClick={() => { setShowSendLater(!showSendLater); setShowImagePanel(false); }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <Clock className="w-5 h-5" />
              </button>
              {showSendLater && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-56 z-20">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Send Later</p>
                  <div className="space-y-1">
                    {QUICK_SCHEDULE_OPTIONS.map(opt => (
                      <button key={opt.label} onClick={() => quickSchedule(opt.targetHour, opt.targetMinute)}
                        className="w-full text-left text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 px-2 py-1.5 rounded-lg">
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t flex justify-end gap-2">
                    <button onClick={() => setShowSendLater(false)} className="text-sm text-gray-500">Cancel</button>
                    <button onClick={() => setShowSendLater(false)} className="text-sm text-green-600 font-medium">Done</button>
                  </div>
                </div>
              )}
            </div>
            <Button onClick={handleSubmit} loading={loading} variant="primary" size="sm">
              Schedule
            </Button>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* From */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 w-16 flex-shrink-0">From</label>
            <div className="flex-1 text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 truncate">
              {userEmail}
            </div>
          </div>

          {/* To */}
          <div className="flex items-start gap-3">
            <label className="text-sm text-gray-500 w-16 flex-shrink-0 pt-2">To</label>
            <div className="flex-1">
              {recipients.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {recipients.slice(0, 5).map(r => (
                    <span key={r} className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                      {r}
                      <button onClick={() => removeRecipient(r)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {recipients.length > 5 && (
                    <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">+{recipients.length - 5} more</span>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <input type="text" value={toInput} onChange={e => setToInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const parsed = parseRecipients(toInput);
                      if (parsed.length) { setRecipients(prev => [...new Set([...prev, ...parsed])]); setToInput(''); }
                    }
                  }}
                  placeholder="recipient@example.com"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400"
                />
                <button onClick={() => csvRef.current?.click()}
                  className="flex items-center gap-1 text-sm text-green-600 border border-green-200 hover:border-green-400 rounded-lg px-3 py-2 flex-shrink-0">
                  <Upload className="w-4 h-4" /> Upload List
                </button>
                <input ref={csvRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCSVUpload} />
              </div>
            </div>
          </div>

          {/* Subject */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 w-16 flex-shrink-0">Subject</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="Email subject"
              className="flex-1 border-b border-gray-200 py-2 text-sm outline-none focus:border-green-400" />
          </div>

          {/* Delay + Limit */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Delay between emails</label>
              <input type="number" value={delayBetweenMs / 1000}
                onChange={e => setDelayBetweenMs(Math.max(1, Number(e.target.value)) * 1000)}
                className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center outline-none focus:border-green-400" min={1} />
              <span className="text-xs text-gray-400">sec</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Hourly Limit</label>
              <input type="number" value={hourlyLimit}
                onChange={e => setHourlyLimit(Math.max(1, Number(e.target.value)))}
                className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center outline-none focus:border-green-400" min={1} />
              <span className="text-xs text-gray-400">emails/hr</span>
            </div>
          </div>

          {/* Schedule */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 w-16 flex-shrink-0">Schedule</label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400" />
          </div>

          {/* Body + Image toolbar */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-400 mr-2">Insert:</span>

              {/* Image from URL */}
              <div className="relative">
                <button
                  onClick={() => { setShowImagePanel(!showImagePanel); setShowSendLater(false); }}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-green-600 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                >
                  <Link className="w-3.5 h-3.5" /> Image URL
                </button>
                {showImagePanel && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72 z-20">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Insert Image from URL</p>
                    <div className="space-y-2">
                      <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.png"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400" />
                      <input type="text" value={imageAlt} onChange={e => setImageAlt(e.target.value)}
                        placeholder="Alt text (optional)"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400" />
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button onClick={() => setShowImagePanel(false)} className="text-sm text-gray-500">Cancel</button>
                      <button onClick={handleInsertImageUrl}
                        className="text-sm bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600">
                        Insert
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Image from file */}
              <button
                onClick={() => imgRef.current?.click()}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-green-600 px-2 py-1 rounded hover:bg-green-50 transition-colors"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Upload Image
              </button>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileUpload} />

              {/* File attachment */}
              <button
                onClick={() => fileRef2.current?.click()}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-green-600 px-2 py-1 rounded hover:bg-green-50 transition-colors"
              >
                <Paperclip className="w-3.5 h-3.5" /> Attach File
              </button>
              <input ref={fileRef2} type="file" multiple className="hidden" onChange={handleFileAttachment} />

              <span className="ml-auto text-xs text-gray-300">Max 5MB/file · 10MB total</span>
            </div>

            {/* Body textarea */}
            <textarea
              ref={bodyRef}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Type your email body here... HTML is supported."
              rows={8}
              className="w-full px-3 py-3 text-sm text-gray-700 outline-none resize-none placeholder-gray-400"
            />

            {/* Attachment chips */}
            {attachments.length > 0 && (
              <div className="border-t border-gray-100 px-3 py-2 flex flex-wrap gap-2">
                {attachments.map(a => (
                  <div key={a.filename} className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2 py-1 text-xs text-gray-700">
                    {a.contentType.startsWith('image/') ? (
                      <ImageIcon className="w-3 h-3 text-blue-400" />
                    ) : a.contentType === 'application/pdf' ? (
                      <FileText className="w-3 h-3 text-red-400" />
                    ) : (
                      <File className="w-3 h-3 text-gray-400" />
                    )}
                    <span className="max-w-[120px] truncate">{a.filename}</span>
                    <span className="text-gray-400">({formatSize(a.size)})</span>
                    <button onClick={() => removeAttachment(a.filename)} className="text-gray-400 hover:text-red-500 ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Preview images embedded in body */}
            {body.includes('<img') && (
              <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
                <p className="text-xs text-gray-400 mb-1">Preview:</p>
                <div
                  className="text-sm [&_img]:max-w-xs [&_img]:rounded"
                  dangerouslySetInnerHTML={{ __html: body }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
