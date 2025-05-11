import { useRef } from "react";
import styles from './Home.module.css';
import { loadStripe } from "@stripe/stripe-js";

export default function Home() {
  const profileRef = useRef<HTMLDivElement>(null);

  const scrollToProfiles = () => {
    profileRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCheckout = async (plan) => {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }), // Send selected plan to your API
    });
    const { id } = await res.json();
    const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
    await stripe?.redirectToCheckout({ sessionId: id });
  };

  return (
    <>
      {/* Hero Section */}
      <div className={styles.hero}>
        <button className={styles.scrollBtn} onClick={scrollToProfiles}>
          <span className={styles.scrollText}>Scroll Down</span>
          <span className={styles.arrow}>↓</span>
        </button>
      </div>

      {/* Why Vellora & How It Works Section */}
      <section className={styles.whySection}>
        {/* ...your Why Vellora section remains unchanged... */}
      </section>

      {/* Pricing Section */}
      <div ref={profileRef} className={styles.profiles}>
        <h2 className={`${styles.sectionTitle} heading`}>How do you want to grow?</h2>
        <div className={styles.profileGrid}>
          
          {/* Grower Plan */}
          <div className={styles.profileTile}>
            <div className={styles.badge}>Best for Beginners</div>
            <img src="/icons/plant.svg" alt="Plant Icon" className={styles.planIcon} />
            <h3 className="heading">Grower</h3>
            <p>Perfect for casual, safe growth.</p>
            <ul className={styles.featureList}>
              <li><img src="/icons/check-circle.svg" alt="Tick Icon" className={styles.featureIcon} /> Limited likes, follows, unfollows</li>
              <li><img src="/icons/x-circle.svg" alt="No Comments Icon" className={styles.featureIcon} /> No comments or DMs</li>
            </ul>
            <ul className={styles.featureList}>
              <li><img src="/icons/check-circle.svg" alt="Check Icon" className={styles.featureIcon} /> Fully managed setup</li>
              <li><img src="/icons/check-circle.svg" alt="Check Icon" className={styles.featureIcon} /> No tech knowledge needed</li>
              <li><img src="/icons/check-circle.svg" alt="Check Icon" className={styles.featureIcon} /> Safe human-like actions</li>
            </ul>
            <p className={styles.price}>£12.99/month</p>
            <p className={styles.callout}>No risk. Cancel anytime.</p>
            <button className={`${styles.cta} button`} onClick={() => handleCheckout("grower")}>Get Started</button>
          </div>

          {/* Bloomer Plan */}
          <div className={`${styles.profileTile} ${styles.highlight}`}>
            <div className={styles.badge}>Most Popular</div>
            <img src="/icons/flower.svg" alt="Rocket Icon" className={styles.planIcon} />
            <h3 className="heading">Bloomer</h3>
            <p>Maximum exposure with full control.</p>
            <ul className={styles.featureList}>
              <li><img src="/icons/infinity.svg" alt="Unlimited Icon" className={styles.featureIcon} /> Unlimited actions</li>
              <li><img src="/icons/chat-dots.svg" alt="Comments Icon" className={styles.featureIcon} /> Comments & DMs</li>
              <li><img src="/icons/gear.svg" alt="Custom Limits Icon" className={styles.featureIcon} /> Custom daily limits</li>
              <li><img src="/icons/chart-line-up.svg" alt="Reports Icon" className={styles.featureIcon} /> Detailed growth reports</li>
            </ul>
            <p className={styles.price}>£29.99/month</p>
            <p className={styles.callout}>Priority support. Cancel anytime.</p>
            <button className={`${styles.cta} button`} onClick={() => handleCheckout("bloomer")}>Start Growing</button>
          </div>

        </div>
      </div>
      
      {/* Support Section */}
      <section className={styles.supportSection}>
        <div className={styles.supportContainer}>
          <h2 className="heading">Need Help or Have Questions?</h2>
          <p>We’re here to support you every step of the way.</p>
          <div className={styles.faqGrid}>
            <div className={styles.faqItem}>
              <h3 className="heading">Is this safe to use?</h3>
              <p>Yes. Vellora uses human-like behaviour with safe limits to reduce risk.</p>
            </div>
            <div className={styles.faqItem}>
              <h3 className="heading">Can I cancel anytime?</h3>
              <p>Absolutely. There are no contracts. Cancel anytime via Telegram.</p>
            </div>
            <div className={styles.faqItem}>
              <h3 className="heading">How do I change my settings?</h3>
              <p>You’ll manage your preferences via our Telegram bot at any time.</p>
            </div>
          </div>
          <a href="https://t.me/yourtelegramhandle" target="_blank" rel="noopener noreferrer" className={`${styles.cta} button`}>
            Contact Us on Telegram
          </a>
        </div>
      </section>
    </>
  );
}
