import { ArrowLeft, ArrowUpLeft, Check, LockKeyhole, ShieldAlert, Smartphone } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

export default function AccessPage() {
  const [, params] = useRoute("/access/:accessToken");
  const [, setLocation] = useLocation();
  const accessToken = params?.accessToken || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const card = trpc.access.getCard.useQuery({ accessToken }, { enabled: accessToken.length > 0, retry: false });
  const activate = trpc.access.activate.useMutation({ onSuccess: () => setLocation("/library"), onError: err => setError(err.message) });

  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    activate.mutate({ accessToken, password });
  }

  if (card.isLoading) return <div className="center-state"><div className="loader" /><span>جاري قراءة البطاقة…</span></div>;
  if (card.error) return <div className="center-state"><ShieldAlert size={34} /><h2>البطاقة غير موجودة</h2><p>رابط NFC غير نشط أو انتهت صلاحيته.</p><Link className="button button-dark" href="/">العودة للرئيسية</Link></div>;
  const product = card.data?.product;
  return <main className="access-page"><div className="access-back"><Link href="/"><ArrowLeft size={16} /> العودة إلى NFC/Vault</Link></div><div className="access-panel"><div className="access-symbol"><span className="mark mark-large"><span /></span></div><div className="eyebrow">وصول خاص · {accessToken}</div><h1>مرحبًا بك في<br /><em>{product?.name}</em></h1><p className="access-copy">أدخل كلمة المرور المرفقة مع بطاقتك. هذا الترخيص يفتح مكتبته الخاصة فقط.</p><form onSubmit={submit} className="access-form"><label htmlFor="license-password">كلمة مرور الترخيص</label><div className="password-field"><LockKeyhole size={18} /><input id="license-password" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="أدخل كلمة المرور" autoComplete="current-password" required /><span>•••</span></div>{error && <div className="error-box"><ShieldAlert size={17} /><div><strong>{error.includes("another device") || error.includes("جهاز آخر") ? "الجهاز مسجل بالفعل" : "تعذر إتمام الدخول"}</strong><span>{error}</span></div></div>}<button className="button button-primary button-wide" type="submit" disabled={activate.isPending}>{activate.isPending ? <><span className="button-spinner" /> جاري التحقق من الجهاز…</> : <>فتح مكتبتي <ArrowUpLeft size={17} /></>}</button></form><div className="device-note"><Smartphone size={16} /><span>أول تفعيل ناجح يربط هذه البطاقة بهذا الجهاز بأمان.</span></div><div className="demo-hint"><Check size={15} /><span>كلمة مرور التجربة: <code>demo1234</code></span></div></div><div className="access-footer"><span>بوابة ترخيص آمنة</span><span>عربي</span></div></main>;
}
