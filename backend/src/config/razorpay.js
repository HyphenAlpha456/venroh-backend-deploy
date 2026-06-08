import Razorpay from 'razorpay';

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  throw new Error(
    'Razorpay keys are missing. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env'
  );
}

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret
});

export default razorpay;