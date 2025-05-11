import { useRef } from "react";
import styles from './Home.module.css';
import { loadStripe } from "@stripe/stripe-js";

export default function Home() {
  const profileRef = useRef<HTMLDivElement>(null);

  const scrollToProfiles = () => {
    profileRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCheckout = async (plan: string) => {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });

    const { id } = await res.json();
    const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
    if (stripe) {
      await stripe.redirectToCheckout({ sessionId: id });
    }
  };

  return (
    <main className={styles.scrollContainer}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <button className={styles.scrollBtn} onClick={scrollToProfiles}>
          <span className={styles.scrollText}>Scroll Down</span>
          <span className={styles.arrow}>↓</span>
        </button>
      </section>

      {/* Why Vellora Section */}
      <section className={styles.whySection}>
        <div className={styles.whyContainer}>
          <div className={styles.whyBlock}>
            <h2 className="heading">Why Vellora?</h2>
            <p>
              Vellora prioritises <strong>human-like actions</strong> that mimic real user behaviour,
              making your growth appear <strong>as natural as possible</strong>. Our system is designed for
              <strong> super stealth</strong>, operating safely in the background like a <strong>real person
              managing your account</strong>—without the cost or risk of hiring someone.
            </p>
            <ul className={styles.featureList}>
              <li><img src="/icons/mask.png" alt="Stealth Icon" className={styles.featureIcon} /> Stealth-first, human-like behaviour</li>
              <li><img src="/icons/tick.png" alt="Safe Icon" className={styles.featureIcon} /> Safe, realistic engagement patterns</li>
              <li><img src="/icons/cog.png" alt="Custom Strategy Icon" className={styles.featureIcon} /> Customisable strategies tailored to your niche</li>
              <li><img src="/icons/telegram.png" alt="Telegram Support Icon" className={styles.featureIcon} /> Fully managed via Telegram for your convenience</li>
            </ul>
          </div>

          {/* How It Works Section */}
          <div className={styles.howBlock}>
            <h2 className="heading">How It Works</h2>
            <ul className={styles.featureList}>
              <li><img src="/icons/connect.png" alt="Connect Icon" className={styles.featureIcon} /> Connect your account</li>
              <li><img src="/icons/goals.png" alt="Set Goals Icon" className={styles.featureIcon} /> Set your goals (growth style / niches)</li>
              <li><img src="/icons/runssilently.png" alt="Silent Running Icon" className={styles.featureIcon} /> Vellora runs for you silently</li>
              <li><img src="/icons/logresultscelebrate.png" alt="Track and Celebrate Icon" className={styles.featureIcon} /> Track, log, and celebrate results</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section ref={profileRef} className={styles.profiles}>
        <h2 className={`${styles.sectionTitle} heading`}>How do you want to grow?</h2>
        <div className={styles.profileGrid}>
          {/* Grower Plan */}
          <div className={styles.profileTile}>
            <div className={styles.badge}>Best for Beginners</div>
            <img src="/icons/plant.svg" alt="Plant icon" className={styles.planIcon} />
            <h3 className="heading">Grower</h3>
            <p>Perfect for casual, safe growth.</p>
            <ul className={styles.featureList}>
              <li><img src="/icons/check-circle.svg" alt="Check" className={styles.featureIcon} /> Limited likes, follows, unfollows</li>
              <li><img src="/icons/x-circle.svg" alt="No Comments" className={styles.featureIcon} /> No comments or DMs</li>
              <li><img src="/icons/check-circle.svg" alt="Check" className={styles.featureIcon} /> Fully managed setup</li>
              <li><img src="/icons/check-circle.svg" alt="Check" className={styles.featureIcon} /> No tech knowledge needed</li>
              <li><img src="/icons/check-circle.svg" alt="Check" className={styles.featureIcon} /> Safe human-like actions</li>
            </ul>
            <p className={styles.price}><span className={styles.priceValue}>£12.99</span><span className={styles.pricePeriod}>/month</span></p>
            <p className={styles.callout}>No risk. Cancel anytime.</p>
            <button className={`${styles.cta} button`} onClick={() => handleCheckout("grower")}>Get Started</button>
          </div>

          {/* Bloomer Plan */}
          <div className={`${styles.profileTile} ${styles.highlight}`}>
            <div className={styles.badge}>Most Popular</div>
            <img src="/icons/flower.svg" alt="Flower icon" className={styles.planIcon} />
            <h3 className="heading">Bloomer</h3>
            <p>Maximum exposure with full control.</p>
            <ul className={styles.featureList}>
              <li><img src="/icons/infinity.svg" alt="Unlimited actions" className={styles.featureIcon} /> Unlimited actions</li>
              <li><img src="/icons/chat-dots.svg" alt="Comments and DMs" className={styles.featureIcon} /> Comments & DMs</li>
              <li><img src="/icons/gear.svg" alt="Custom Limits" className={styles.featureIcon} /> Custom daily limits</li>
              <li><img src="/icons/chart-line-up.svg" alt="Growth Reports" className={styles.featureIcon} /> Detailed growth reports</li>
            </ul>
            <p className={styles.price}><span className={styles.priceValue}>£29.99</span><span className={styles.pricePeriod}>/month</span></p>
            <p className={styles.callout}>Priority support. Cancel anytime.</p>
            <button className={`${styles.cta} button`} onClick={() => handleCheckout("bloomer")}>Start Growing</button>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className={styles.supportSection}>
        <div className={styles.supportContainer}>
          <h2 className="heading">Need Help or Have Questions?</h2>
          <p>We’re here to support you every step of the way.</p>
          <div className={styles.faqGrid}>
            <div className={styles.faqItem}><h3 className="heading">Is this safe to use?</h3><p>Yes. Vellora uses human-like behaviour with safe limits to reduce risk.</p></div>
            <div className={styles.faqItem}><h3 className="heading">Can I cancel anytime?</h3><p>Absolutely. There are no contracts. Cancel anytime via Telegram.</p></div>
            <div className={styles.faqItem}><h3 className="heading">How do I change my settings?</h3><p>You’ll manage your preferences via our Telegram bot at any time.</p></div>
          </div>
          <a href="https://t.me/yourtelegramhandle" target="_blank" rel="noopener noreferrer" className={`${styles.cta} button`}>
            Contact Us on Telegram
          </a>
        </div>
      </section>
    </main>
  );
}
