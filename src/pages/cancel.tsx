export default function Cancel() {
  return (
    <main style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Payment Cancelled</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
        It looks like you didn’t complete your payment.
      </p>
      <a href="/" style={{
        display: 'inline-block',
        padding: '0.75rem 1.5rem',
        backgroundColor: '#048451',
        color: 'white',
        borderRadius: '8px',
        textDecoration: 'none',
        fontWeight: 'bold'
      }}>
        Go Back to Homepage
      </a>
    </main>
  );
}
