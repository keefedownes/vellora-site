import { useRouter } from 'next/router';

export default function Setup() {
  const router = useRouter();
  const { code } = router.query;

  if (!code) {
    return (
      <p style={{ textAlign: 'center', padding: '4rem' }}>
        No setup code found. Please contact support.
      </p>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <h1>Thank You for Joining Vellora!</h1>
      <p>You&apos;re one step away from starting your growth journey.</p>
      <p><strong>Your Setup Code:</strong></p>
      <h2 style={{ fontSize: '2rem', margin: '1rem 0', color: '#048451' }}>{code}</h2>
      <p>
        Click below to open Telegram and send us your setup code to complete your onboarding.
      </p>
      <a
        href="https://t.me/withvellora_assistancebot"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          marginTop: '1.5rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#048451',
          color: '#fff',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 'bold',
        }}
      >
        Open Telegram to Complete Setup
      </a>
    </div>
  );
}
