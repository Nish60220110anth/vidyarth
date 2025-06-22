import { useState, useEffect } from "react";
import toast from "react-hot-toast";

const predefinedTemplates: Record<string, string> = {
    approval: "Dear {{name}},\n\nYour account has been approved. You may now access the portal.\n\nRegards,\nTeam Vidyarth",
    rejection: "Dear {{name}},\n\nWe regret to inform you that your request has been denied. For further details, contact the administrator.\n\nRegards,\nTeam Vidyarth",
    custom: "", 
};
  

export default function EmailComposerPage() {
    const [to, setTo] = useState("");
    const [cc, setCc] = useState("");
    const [bcc, setBcc] = useState("");
    const [subject, setSubject] = useState("");
    const [template, setTemplate] = useState("approval");
    const [attachments, setAttachments] = useState<File[]>([]);
    const [body, setBody] = useState(predefinedTemplates["custom"]);

    useEffect(() => {
        if (template !== "custom") {
            setBody(predefinedTemplates[template]);
        }
    }, [template]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, cc, bcc, subject, body }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Email sent successfully");
            } else {
                toast.error(data?.error || "Failed to send email");
            }
        } catch (err) {
            toast.error("Unexpected error occurred");
        }
    };
      

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black p-10 text-white">
            <h1 className="text-3xl font-bold mb-6 text-cyan-300">Send Email Notification</h1>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
                <div>
                    <label className="block text-sm font-medium mb-1">To (comma separated)</label>
                    <input
                        type="text"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        placeholder="example@domain.com"
                        className="w-full rounded bg-gray-800 border border-gray-700 px-4 py-2 text-white"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">CC</label>
                        <input
                            type="text"
                            value={cc}
                            onChange={(e) => setCc(e.target.value)}
                            className="w-full rounded bg-gray-800 border border-gray-700 px-4 py-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">BCC</label>
                        <input
                            type="text"
                            value={bcc}
                            onChange={(e) => setBcc(e.target.value)}
                            className="w-full rounded bg-gray-800 border border-gray-700 px-4 py-2 text-white"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Subject</label>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full rounded bg-gray-800 border border-gray-700 px-4 py-2 text-white"
                        placeholder="Enter email subject"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Choose Template</label>

                    <select
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        className="...">
                        {Object.keys(predefinedTemplates).map((tpl) => (
                            <option key={tpl} value={tpl}>
                                {tpl.charAt(0).toUpperCase() + tpl.slice(1)}
                            </option>
                        ))}
                    </select>

                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Email Body</label>
                    <textarea
                        rows={6}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        className="w-full rounded bg-gray-800 border border-gray-700 px-4 py-2 text-white"
                        placeholder="Write your message or edit the template..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Attachments</label>
                    <input type="file" multiple onChange={handleFileChange} className="text-white" />
                </div>

                <div>
                    <button
                        type="submit"
                        className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-6 py-3 rounded shadow"
                    >
                        Send Email
                    </button>
                </div>
            </form>
        </div>
    );
}
