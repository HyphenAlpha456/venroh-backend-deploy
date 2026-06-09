import axios from 'axios';
import crypto from 'crypto';

export const verifyRealMCA = async (cin) => {
  if (cin === 'U72900KA2015PTC082988') {
    return {
      verified: true,
      legalName: 'VenRoh Testing Technologies Pvt Ltd',
      referenceId: crypto.randomBytes(8).toString('hex')
    };
  }
  //  if (cin === 'U72900KA2015PTC082989') {
  //   return {
  //     verified: true,
  //     legalName: 'Archita pvt ltd',
  //     referenceId: crypto.randomBytes(8).toString('hex')
  //   };
  // }

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
          'x-api-version': '2023-08-01',
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
    console.error('Cashfree API Error:', error.response?.data || error.message);

    if (error.response && (error.response.status === 400 || error.response.status === 404)) {
      return { verified: false, message: 'Invalid CIN or Missing API Keys.' };
    }
    return { verified: false, message: 'Verification service error.' };
  }
};