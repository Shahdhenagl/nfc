import { ArrowUpLeft, Check, ChevronRight, Headphones, LockKeyhole, MoonStar, Radio, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { PRODUCT_META, type ProductSlug } from "@shared/constants";

const products: Array<{ slug: ProductSlug; label: string; code: string; tone: string; icon: typeof Radio }> = [
  { slug: "foreign", label: "الموسيقى الأجنبية", code: "FR", tone: "copper", icon: Headphones },
  { slug: "quran", label: "القرآن والأذكار", code: "QN", tone: "emerald", icon: MoonStar },
  { slug: "arabic", label: "الموسيقى العربية", code: "AR", tone: "saffron", icon: Radio },
  { slug: "shaabi", label: "الموسيقى الشعبي", code: "SH", tone: "rose", icon: Sparkles },
];

export default function Home() {
  return (
    <main className="site-shell">
      <nav className="topbar container">
        <a className="wordmark" href="/" aria-label="الرئيسية"><span className="mark"><span /></span><span>NFC<span className="wordmark-muted">/vault</span></span></a>
        <div className="topbar-actions"><a href="#products">المنتجات</a><a href="#how">كيف تعمل</a><Link className="nav-admin" href="/admin">لوحة الإدارة <ArrowUpLeft size={15} /></Link></div>
      </nav>

      <section className="hero container">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> وصول رقمي خاص · منذ ٢٠٢٦</div>
          <h1>مكتبتك،<br /><em>بلمسة واحدة.</em></h1>
          <p className="hero-lead">مساحة خاصة وجميلة للموسيقى والقرآن والأذكار اليومية، تفتحها بطاقة NFC وتحميها أجهزتك الموثوقة.</p>
          <div className="hero-actions"><Link className="button button-primary" href="/access/FR-DEMO01">فتح البطاقة التجريبية <ChevronRight size={17} /></Link><a className="text-link" href="#how">اكتشف طريقة العمل <ArrowUpLeft size={16} /></a></div>
          <div className="hero-trust"><ShieldCheck size={16} /><span>كل ترخيص معزول، وكل جهاز موثّق.</span></div>
        </div>
        <div className="hero-art" aria-label="معاينة بطاقة NFC">
          <div className="orb orb-one" /><div className="orb orb-two" />
          <div className="nfc-card-preview"><div className="card-top"><span className="mini-mark"><span /></span><span>NFC/V</span><span className="card-code">FR · 01</span></div><div className="card-waves"><i /><i /><i /><i /><i /><i /><i /></div><div className="card-bottom"><span>مكتبة استماع خاصة</span><span className="tap-chip">المس</span></div></div>
          <div className="hero-note"><LockKeyhole size={14} /><span>مرتبطة بجهازك</span></div>
        </div>
      </section>

      <section className="metric-strip container"><div><strong>04</strong><span>مكتبات مختلفة</span></div><div><strong>01</strong><span>ترخيص خاص</span></div><div><strong>∞</strong><span>لحظات لا تنتهي</span></div><div className="metric-note">مصممة لطقوس الاستماع.<br /><span>ليست تطبيقًا مزعجًا آخر.</span></div></section>

      <section id="products" className="section container"><div className="section-heading"><div><div className="eyebrow">المجموعة</div><h2>أربع تجارب.<br /><span>ومكان آمن واحد.</span></h2></div><p>اختر البطاقة التي تناسب يومك. وصولك مخصص لمنتج واحد وترخيص واحد وجهاز موثّق، بتصميم يحمي خصوصيتك.</p></div><div className="product-grid">{products.map(({ slug, label, code, tone, icon: Icon }) => <Link key={slug} href={`/access/${code}-DEMO01`} className={`product-card tone-${tone}`}><div className="product-card-top"><span className="product-icon"><Icon size={18} /></span><span className="product-code">{code} / 01</span></div><div className="product-card-bottom"><div><h3>{label}</h3><p>{PRODUCT_META[slug].description}</p></div><span className="circle-arrow"><ChevronRight size={18} /></span></div></Link>)}</div></section>

      <section className="premium-section container"><div className="premium-copy"><div className="eyebrow">الجانب الملموس</div><h2>ترخيص رقمي،<br /><span>صُمم ليكون هدية.</span></h2><p>اختر الشكل المناسب لجيبك أو مكتبك أو صندوق هداياك. كل شكل يقدم تجربة NFC خاصة مع بديل QR.</p><div className="format-list"><span>بطاقة PVC</span><span>أكريليك</span><span>معدن</span><span>ميدالية</span><span>سوار</span><span>ملصق</span><span>بطاقة هدايا</span></div></div><div className="gift-box"><div className="gift-lid"><span>NFC/V</span><small>محتواك<br />معك دائمًا.</small></div><div className="gift-card"><div className="gift-card-qr">QR<br /><small>امسح</small></div><strong>قرآنك معك<br />أينما كنت.</strong><span>NFC + QR · ترخيص خاص</span></div><div className="gift-note"><Check size={14} /> صندوق · بطاقة · QR · رسالة</div></div></section>

      <section id="how" className="how-section container"><div className="how-intro"><div className="eyebrow">وعدنا</div><h2>بسيطة من الخارج.<br /><span>مدروسة من الداخل.</span></h2><p>من أول لمسة وحتى أول نغمة، صممنا كل تفصيلة لتحافظ على خصوصية محتواك.</p></div><div className="steps"><div className="step"><span>01</span><div><h3>المس بطاقتك</h3><p>رابط وصول عشوائي يحدد المنتج الصحيح دون كشف المعرّفات الداخلية.</p></div></div><div className="step"><span>02</span><div><h3>أدخل كلمة المرور</h3><p>كلمة مرور الترخيص تفتح منتجها ومكتبتها الخاصة فقط.</p></div></div><div className="step"><span>03</span><div><h3>تبقى ملكك</h3><p>يُسجل الجهاز الأول بأمان، وأي إعادة ضبط تظل تحت تحكم الإدارة.</p></div></div></div></section>

      <footer className="footer container"><a className="wordmark" href="/"><span className="mark"><span /></span><span>NFC<span className="wordmark-muted">/vault</span></span></a><span>محتوى خاص، يُقدّم بعناية.</span><span>© ٢٠٢٦ NFC/Vault</span></footer>
    </main>
  );
}
