import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import supabase from '../../utils/supabaseAdmin';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables.');
}

const stripe = new Stripe(stripeSecretKey, { apiVersion: '2022-11-15' });

// 🔁 Ensure generated setupCode doesn't already exist
async function generateUniqueCode() {
  let code;
  let exists = true;

  while (exists) {
    code = nanoid(6).toUpperCase();

    const { data, error } = await supabase
      .from('activations')
      .select('code')
      .eq('code', code)
      .maybeSingle();

    exists = !!data; // true if code already exists
  }

  return code;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { plan } = req.body;

  const pricing = {
    grower: { name: 'Vellora Grower Plan', amount: 1299 },
    bloomer: { name: 'Vellora Bloomer Plan', amount: 2999 },
  };

  if (!pricing[plan]) {
    return res.status(400).json({ error: 'Invalid plan selected.' });
  }

  try {
    const setupCode = await generateUniqueCode();

    // Insert into Supabase
    const { error } = await supabase
      .from('activations')
      .insert([
        {
          code: setupCode,
          plan,
          status: 'pending',
          chat_id: null,
          step: 1,
        },
      ]);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to store setup code.' });
    }

    // Create Stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: { name: pricing[plan].name },
            unit_amount: pricing[plan].amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `https://withvellora.com/setup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: 'https://withvellora.com/cancel',
      metadata: {
        setupCode,
        selectedPlan: plan,
      },
    });

    res.status(200).json({ id: session.id });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
