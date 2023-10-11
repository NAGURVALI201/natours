/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

const stripe = Stripe(
  'pk_test_51Nzd1SSFqNAcesV8PPlpymGKEITKR3nQJPX2Hnqu6dVmSGiOYfzbxZujs2pvu0VDKL2rmmXQI5wdNYES4DG9J38B007rJ8bNug'
);
export const bookTour = async tourId => {
  try {
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(session);

    // 2) create check out form and credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    console.log(err);
  }
};
