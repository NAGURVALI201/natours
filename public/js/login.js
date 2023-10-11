/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

export const login = async function(email, password) {
  try {
    const res = await axios({
      method: 'POST',
      url: 'http://127.0.0.1:3000/api/v1/users/login',
      data: {
        email,
        password
      }
    });

    if (res.data.status === 'success') {
      showAlert('success', 'logged in successfully');
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://127.0.0.1:3000/api/v1/users/logout'
    });
    if (res.data.status === 'success') location.assign('/');
    // location.reload(true);
    // location.reload(true) will reload the page asking a new page from server and the fake cookie comes in a he won't be able to enter
    // location.reload(false) will reload the page from the cache in browser which will be same looks like same user menu and the fake cookie won't be generated
  } catch (err) {
    showAlert('error', 'Error logging out ! Please try again.');
  }
};
