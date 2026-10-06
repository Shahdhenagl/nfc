import { ArrowUpLeft, Check, ChevronRight, Headphones, LockKeyhole, MoonStar, Radio, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { PRODUCT_META, type ProductSlug } from "@shared/constants";

const products: Array<{ slug: ProductSlug; label: string; code: string; tone: string; icon: typeof Radio }> = [
  { slug: "foreign", label: "Foreign Music", code: "FR", tone: "copper", icon: Headphones },
  { slug: "quran", label: "Quran & Azkar", code: "QN", tone: "emerald", icon: MoonStar },
  { slug: "arabic", label: "Arabic Music", code: "AR", tone: "saffron", icon: Radio },
  { slug: "shaabi", label: "Shaabi Music", code: "SH", tone: "rose", icon: Sparkles },
];

export default function Home() {
  return (
    <main className="site-shell">
      <nav className="topbar container">
        <a className="wordmark" href="/" aria-label="NFC home"><span className="mark"><span /></span><span>NFC<span className="wordmark-muted">/vault</span></span></a>
        <div className="topbar-actions"><a href="#products">Products</a><a href="#how">How it works</a><Link className="nav-admin" href="/admin">Admin console <ArrowUpLeft size={15} /></Link></div>
      </nav>

      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> PRIVATE DIGITAL ACCESS · EST. 2026</div>
          <h1>Your library,<br /><em>one tap away.</em></h1>
          <p className="hero-lead">A beautifully private home for music, Quran and daily remembrance—opened by your NFC card and protected by your device.</p>
          <div className="hero-actions"><Link className="button button-primary" href="/access/FR-DEMO01">Open demo card <ChevronRight size={17} /></Link><a className="text-link" href="#how">See how it works <ArrowUpLeft size={16} /></a></div>
          <div className="hero-trust"><ShieldCheck size={16} /><span>Every license is isolated, every device is known.</span></div>
        </div>
        <div className="hero-art" aria-label="NFC card preview">
          <div className="orb orb-one" /><div className="orb orb-two" />
          <div className="nfc-card-preview"><div className="card-top"><span className="mini-mark"><span /></span><span>NFC/V</span><span className="card-code">FR · 01</span></div><div className="card-waves"><i /><i /><i /><i /><i /><i /><i /></div><div className="card-bottom"><span>PRIVATE LISTENING LIBRARY</span><span className="tap-chip">TAP</span></div></div>
          <div className="hero-note"><LockKeyhole size={14} /><span>Bound to your device</span></div>
        </div>
      </section>

      <section className="metric-strip container"><div><strong>04</strong><span>distinct libraries</span></div><div><strong>01</strong><span>private license</span></div><div><strong>∞</strong><span>moments to keep</span></div><div className="metric-note">Built for the ritual of listening.<br /><span>Not another noisy app.</span></div></section>

      <section id="products" className="section container"><div className="section-heading"><div><div className="eyebrow">THE COLLECTION</div><h2>Four moods.<br /><span>One secure home.</span></h2></div><p>Choose the card that fits your day. Your access is scoped to one product, one license and one registered device—by design.</p></div><div className="product-grid">{products.map(({ slug, label, code, tone, icon: Icon }) => <Link key={slug} href={`/access/${code}-DEMO01`} className={`product-card tone-${tone}`}><div className="product-card-top"><span className="product-icon"><Icon size={18} /></span><span className="product-code">{code} / 01</span></div><div className="product-card-bottom"><div><h3>{label}</h3><p>{PRODUCT_META[slug].description}</p></div><span className="circle-arrow"><ChevronRight size={18} /></span></div></Link>)}</div></section>

      <section className="premium-section container"><div className="premium-copy"><div className="eyebrow">THE PHYSICAL LAYER</div><h2>A digital license,<br /><span>made to be gifted.</span></h2><p>Choose the form that belongs in your pocket, on your desk or in a gift box. Every format carries the same private NFC + QR fallback experience.</p><div className="format-list"><span>PVC card</span><span>Acrylic</span><span>Metal</span><span>Keychain</span><span>Bracelet</span><span>Sticker</span><span>Gift card</span></div></div><div className="gift-box"><div className="gift-lid"><span>NFC/V</span><small>YOUR CONTENT<br />ALWAYS WITH YOU.</small></div><div className="gift-card"><div className="gift-card-qr">QR<br /><small>SCAN</small></div><strong>قرآنك معك<br />أينما كنت.</strong><span>NFC + QR · PRIVATE LICENSE</span></div><div className="gift-note"><Check size={14} /> Box · card · QR · message</div></div></section>

      <section id="how" className="how-section container"><div className="how-intro"><div className="eyebrow">THE PROMISE</div><h2>Simple on the outside.<br /><span>Thoughtful underneath.</span></h2><p>From the tap to the first note, every detail is designed to keep your private content feeling private.</p></div><div className="steps"><div className="step"><span>01</span><div><h3>Tap your card</h3><p>A random access link identifies the right product without exposing internal IDs.</p></div></div><div className="step"><span>02</span><div><h3>Enter your key</h3><p>Your license password only unlocks its own product and content library.</p></div></div><div className="step"><span>03</span><div><h3>Stay yours</h3><p>The first device is registered securely. A reset is always under admin control.</p></div></div></div></section>

      <footer className="footer container"><a className="wordmark" href="/"><span className="mark"><span /></span><span>NFC<span className="wordmark-muted">/vault</span></span></a><span>Private content, deliberately delivered.</span><span>© 2026 NFC/Vault</span></footer>
    </main>
  );
}
