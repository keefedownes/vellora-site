import Stripe from 'stripe';
import supabase from '../../utils/supabaseAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const { session_id } = req.query;

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const setupCode = session.metadata?.setupCode;

    if (!setupCode) return res.status(404).json({ error: 'No setup code found in session.' });

    const { data, error } = await supabase
      .from('activations')
      .select('*')
      .eq('code', setupCode)
      .maybeSingle();

    if (error || !data) return res.status(404).json({ error: 'Activation not found.' });

    // Mark it as unused (optional)
    await supabase.from('activations').update({ status: 'unused' }).eq('code', setupCode);

    res.status(200).json({ code: data.code, plan: data.plan });
  } catch (err) {
    console.error('Setup code fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch setup code.' });
  }
}
