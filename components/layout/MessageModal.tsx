import React from 'react';

interface MessageModalProps {
  open: boolean;
  onClose: () => void;
  recipient: { name: string } | null;
  content: string;
  onContentChange: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  success: string | null;
}

const MessageModal: React.FC<MessageModalProps> = ({ open, onClose, recipient, content, onContentChange, onSend, sending, success }) => {
  if (!open || !recipient) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs relative animate-in fade-in duration-200">
        <button
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
          onClick={onClose}
          aria-label="Zamknij"
        >
          ×
        </button>
        <h3 className="text-lg font-bold mb-2 text-slate-800">Wiadomość do: {recipient.name}</h3>
        <textarea
          className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
          rows={4}
          value={content}
          onChange={e => onContentChange(e.target.value)}
          placeholder="Treść wiadomości..."
          disabled={sending}
        />
        <button
          onClick={onSend}
          disabled={sending || !content.trim()}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-xl font-semibold text-sm shadow-sm transition-colors mt-1 disabled:opacity-60"
        >
          {sending ? 'Wysyłanie...' : 'Wyślij wiadomość'}
        </button>
        {success && <div className="text-center text-xs text-emerald-600 mt-3">{success}</div>}
      </div>
    </div>
  );
};

export default MessageModal;
