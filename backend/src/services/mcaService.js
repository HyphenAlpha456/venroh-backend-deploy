import axios from 'axios';
import crypto from 'crypto';

export const verifyRealMCA = async (cin) => {
  try {
    const verificationId = crypto.randomBytes(8).toString('hex');
    
    const response = await axios.post(
      'https://sandbox.cashfree.com/verification/cin',
      {
        verification_id: verificationId,
        cin: cin
      },
      {
        headers: {
          'x-client-id': process.env.CASHFREE_CLIENT_ID,
          'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      }
    );

    if (response.data && response.data.status === 'VALID') {
      return {
        verified: true,
        legalName: response.data.company_name,
        referenceId: response.data.reference_id
      };
    }

    return { verified: false, message: 'CIN not found in MCA database.' };
  } catch (error) {
    if (error.response && (error.response.status === 400 || error.response.status === 404)) {
      return { verified: false, message: 'Invalid CIN.' };
    }
    return { verified: false, message: 'Verification service error.' };
  }
};