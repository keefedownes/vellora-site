// /pages/api/get-setup-code.js
import Stripe from 'stripe';
import supabase from '../../supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const { session_id } = req.query;

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const setupCode = session.metadata?.setupCode;

    if (!setupCode) return res.status(404).json({ error: "Setup code not found." });

    const { data, error } = await supabase
      .from('activations')
      .select('*')
      .eq('code', setupCode)
      .maybeSingle();

    if (error || !data) return res.status(404).json({ error: "No activation found." });

    // Optionally update the status here
    await supabase.from('activations').update({ status: 'unused' }).eq('code', setupCode);

    res.status(200).json({ code: data.code, plan: data.plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching session or activation.' });
  }
}
