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

  if (card.isLoading) return <div className="center-state"><div className="loader" /><span>Reading your card…</span></div>;
  if (card.error) return <div className="center-state"><ShieldAlert size={34} /><h2>Card not found</h2><p>This NFC link is not active or has expired.</p><Link className="button button-dark" href="/">Back home</Link></div>;
  const product = card.data?.product;
  return <main className="access-page"><div className="access-back"><Link href="/"><ArrowLeft size={16} /> Back to NFC/Vault</Link></div><div className="access-panel"><div className="access-symbol"><span className="mark mark-large"><span /></span></div><div className="eyebrow">PRIVATE ACCESS · {accessToken}</div><h1>Welcome to<br /><em>{product?.name}</em></h1><p className="access-copy">Enter the password that came with your card. This license opens only its own private library.</p><form onSubmit={submit} className="access-form"><label htmlFor="license-password">License password</label><div className="password-field"><LockKeyhole size={18} /><input id="license-password" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required /><span>•••</span></div>{error && <div className="error-box"><ShieldAlert size={17} /><div><strong>{error.includes("another device") || error.includes("جهاز آخر") ? "Device already registered" : "Access could not be completed"}</strong><span>{error}</span></div></div>}<button className="button button-primary button-wide" type="submit" disabled={activate.isPending}>{activate.isPending ? <><span className="button-spinner" /> Checking device…</> : <>Unlock my library <ArrowUpLeft size={17} /></>}</button></form><div className="device-note"><Smartphone size={16} /><span>Your first successful activation securely binds this card to this device.</span></div><div className="demo-hint"><Check size={15} /><span>Demo password: <code>demo1234</code></span></div></div><div className="access-footer"><span>Secure license gateway</span><span>EN / AR</span></div></main>;
}
