import { useStore } from "../store";
import { IconMail, IconPhone, IconPin } from "./Icons";

export function ContactPage() {
  const { settings } = useStore();
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-4xl font-bold text-slate-900">Contact Us</h2>
        <p className="text-slate-600 mt-2">
          We’d love to hear from you. Reach out for inquiries or special arrangements.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        <Card icon={<IconPhone />} title="Phone" value={settings.contactPhone} />
        <Card icon={<IconMail />} title="Email" value={settings.contactEmail} />
        <Card icon={<IconPin />} title="Location" value={settings.contactLocation} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          alert("Thanks! Your message has been sent (demo).");
        }}
        className="mt-10 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm grid sm:grid-cols-2 gap-4"
      >
        <input className="input" placeholder="Your name" required />
        <input className="input" type="email" placeholder="Your email" required />
        <input className="input sm:col-span-2" placeholder="Subject" required />
        <textarea
          className="input sm:col-span-2 min-h-32"
          placeholder="Your message"
          required
        />
        <button className="sm:col-span-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg">
          Send Message
        </button>
      </form>
    </section>
  );
}

function Card({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
        {icon}
      </div>
      <div className="mt-3 text-xs uppercase tracking-wider font-bold text-slate-500">
        {title}
      </div>
      <div className="mt-1 text-slate-800 font-medium break-words">{value}</div>
    </div>
  );
}
